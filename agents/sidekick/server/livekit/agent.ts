import { AutoSubscribe, ServerOptions, VADEventType, cli, defineAgent, inference } from '@livekit/agents';
import {
  AudioStream,
  ParticipantKind,
  RemoteAudioTrack,
  RoomEvent,
  type RemoteParticipant,
  type TextStreamReader,
} from '@livekit/rtc-node';
import { fileURLToPath } from 'node:url';
import { RealtimeTranscriber } from '../providers/transcription';
import {
  TranscriptForwarder,
  transcriptEventId,
  transcriptForwarderConfigFromEnv,
  type FinalTranscriptEvent,
} from './backend-transcript';
import { evaluateSpeech } from './speech-gate';

export const INPUT_TOPICS = ['lk.chat', 'sidekick.transcript', 'sidekick.command'] as const;

export default defineAgent({
  entry: async (ctx) => {
    let connected = false;
    let stopping = false;
    let readers = 0;
    let sequence = 0;
    let roomName = '';
    const vad = new inference.VAD({
      minSpeechDuration: 350,
      minSilenceDuration: 800,
      prefixPaddingDuration: 300,
      maxBufferedSpeech: 30_000,
      activationThreshold: 0.7,
      deactivationThreshold: 0.5,
    });
    const audioJobs = new Map<string, { stop: () => void; task: Promise<void> }>();
    const forwarder = new TranscriptForwarder({
      ...transcriptForwarderConfigFromEnv(),
      onPermanentFailure: async (event, error) => {
        console.warn(JSON.stringify({
          event: 'sidekick.transcript.delivery_failed',
          eventId: event.eventId,
          roomName: event.roomName,
          status: error.message,
        }));
        if (connected) await ctx.room.localParticipant?.sendText(
          'Sidekick could not deliver a transcript to the meeting backend.',
          { topic: 'sidekick.error', destinationIdentities: [event.participant.identity] },
        ).catch(() => undefined);
      },
    });

    async function sendState(destinationIdentities?: string[]) {
      if (!connected) return;
      await ctx.room.localParticipant?.sendText(JSON.stringify({
        schemaVersion: 1,
        type: 'ingest.state',
        roomName: roomName,
        ready: true,
        sttModel: 'gpt-live-transcribe',
        backend: {
          configured: forwarder.configured,
          pending: forwarder.pending,
        },
      }), { topic: 'sidekick.state', destinationIdentities });
    }

    function forwardFinalTranscript(input: {
      participantIdentity: string;
      source: 'audio' | 'text';
      sourceId: string;
      text: string;
      trackSid?: string;
      startedAtMs?: number;
      endedAtMs?: number;
    }): FinalTranscriptEvent {
      const event: FinalTranscriptEvent = {
        schemaVersion: 1,
        type: 'transcript.final',
        eventId: transcriptEventId({
          roomName: roomName,
          participantIdentity: input.participantIdentity,
          sourceId: input.sourceId,
        }),
        meetingId: roomName,
        roomName: roomName,
        sequence: ++sequence,
        participant: {
          identity: input.participantIdentity,
          ...(input.trackSid ? { trackSid: input.trackSid } : {}),
        },
        source: input.source,
        sourceId: input.sourceId,
        text: input.text,
        ...(
          input.startedAtMs !== undefined || input.endedAtMs !== undefined
            ? { timing: { startedAtMs: input.startedAtMs, endedAtMs: input.endedAtMs } }
            : {}
        ),
        createdAt: new Date().toISOString(),
      };
      forwarder.enqueue(event);
      return event;
    }

    async function receive(reader: TextStreamReader, identity: string, topic: string) {
      const participant = ctx.room.remoteParticipants.get(identity);
      if (stopping || !participant || participant.kind === ParticipantKind.AGENT || readers >= 16) {
        await reader.close();
        return;
      }
      readers++;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; void reader.close(); }, 15_000);
      try {
        let text = '';
        for await (const chunk of reader) {
          text += chunk;
          if (text.length > 16_000) throw new Error('Input is too long.');
        }
        clearTimeout(timer);
        if (stopping) return;
        if (timedOut) throw new Error('Input stream timed out.');
        if (topic === 'sidekick.command') {
          const command: unknown = JSON.parse(text);
          const type = command && typeof command === 'object' && 'type' in command ? command.type : undefined;
          if (type === 'state') await sendState([identity]);
          else if (type === 'close') {
            await forwarder.drain();
            await sendState([identity]);
          } else throw new Error('Unknown command.');
        } else {
          forwardFinalTranscript({
            participantIdentity: identity,
            source: 'text',
            sourceId: `text:${topic}:${reader.info.streamId}`,
            text,
          });
        }
      } catch {
        // Provider details, credentials, and transcript payloads are never logged.
        if (connected) await ctx.room.localParticipant?.sendText(
          'Sidekick could not ingest this message. Check sidekick.state for ingest status.',
          { topic: 'sidekick.error', destinationIdentities: [identity] },
        ).catch(() => undefined);
      } finally {
        clearTimeout(timer);
        readers--;
        await reader.close();
      }
    }

    async function publishTranscript(
      participantIdentity: string,
      trackSid: string,
      itemId: string,
      text: string,
      final: boolean,
    ) {
      if (!connected || !trackSid || !text) return;
      await ctx.room.localParticipant?.publishTranscription({
        participantIdentity,
        trackSid,
        segments: [{
          id: itemId,
          text,
          startTime: 0n,
          endTime: 0n,
          language: '',
          final,
        }],
      });
    }

    function startAudio(track: RemoteAudioTrack, participant: RemoteParticipant) {
      if (stopping || participant.kind === ParticipantKind.AGENT) return;
      const trackSid = track.sid;
      if (!trackSid || audioJobs.has(trackSid)) return;

      const partials = new Map<string, string>();
      const audio = new AudioStream(track, { sampleRate: 24_000, numChannels: 1, frameSizeMs: 20 });
      const vadStream = vad.stream();
      const transcriber = new RealtimeTranscriber({
        apiKey: process.env.OPENAI_API_KEY ?? '',
        languages: ['vi', 'en'],
        onDelta: async ({ itemId, delta }) => {
          const text = (partials.get(itemId) ?? '') + delta;
          partials.set(itemId, text);
          await publishTranscript(participant.identity, trackSid, itemId, text, false);
        },
        onTranscript: async ({ itemId, transcript, metadata }) => {
          partials.delete(itemId);
          await publishTranscript(participant.identity, trackSid, itemId, transcript, true)
            .catch(() => undefined);
          const event = forwardFinalTranscript({
            participantIdentity: participant.identity,
            source: 'audio',
            sourceId: `stt:${trackSid}:${itemId}`,
            trackSid,
            text: transcript,
            startedAtMs: metadata?.startedAtMs,
            endedAtMs: metadata?.endedAtMs,
          });
          await ctx.room.localParticipant?.sendText(JSON.stringify(event), {
            topic: 'sidekick.transcript.final',
          }).catch(() => undefined);
        },
        onError: async error => {
          console.warn(error.message);
          if (connected) await ctx.room.localParticipant?.sendText(
            'Sidekick could not transcribe this audio. Check OPENAI_API_KEY and agent logs.',
            { topic: 'sidekick.error', destinationIdentities: [participant.identity] },
          ).catch(() => undefined);
        },
      });

      const task = (async () => {
        await transcriber.connect();
        const consumeEvents = (async () => {
          for await (const event of vadStream) {
            if (stopping) break;
            if (event.type === VADEventType.END_OF_SPEECH && event.frames.length) {
              const quality = evaluateSpeech(event.frames, event.speechDuration);
              if (quality.accepted) {
                transcriber.transcribe(event.frames.map(frame => frame.data), {
                  trackSid,
                  startedAtMs: Math.max(0, event.timestamp - event.speechDuration),
                  endedAtMs: event.timestamp,
                });
              } else {
                console.info(
                  `Ignored non-speech audio (${quality.reason}; `
                  + `speech=${Math.round(event.speechDuration)}ms, `
                  + `active=${Math.round(quality.activeDurationMs)}ms, `
                  + `snr=${quality.snrDb.toFixed(1)}dB).`,
                );
              }
            }
          }
        })();
        const audioReader = audio.getReader();
        try {
          while (true) {
            const { done, value } = await audioReader.read();
            if (done) break;
            vadStream.pushFrame(value);
          }
        } finally {
          audioReader.releaseLock();
          vadStream.endInput();
        }
        await consumeEvents;
      })().catch(async () => {
        if (connected) await ctx.room.localParticipant?.sendText(
          'Sidekick audio input stopped. Check the deployed agent logs.',
          { topic: 'sidekick.error', destinationIdentities: [participant.identity] },
        ).catch(() => undefined);
      }).finally(() => {
        transcriber.close();
        vadStream.close();
        const current = audioJobs.get(trackSid);
        if (current?.task === task) audioJobs.delete(trackSid);
      });

      audioJobs.set(trackSid, {
        task,
        stop: () => {
          vadStream.endInput();
          void audio.cancel().catch(() => undefined);
          transcriber.close();
        },
      });
    }

    for (const topic of INPUT_TOPICS) {
      ctx.room.registerTextStreamHandler(topic, (reader, participant) => {
        void receive(reader, participant.identity, topic).catch(() => {
          console.warn('Sidekick stream handler failed.');
        });
      });
    }
    ctx.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track instanceof RemoteAudioTrack) startAudio(track, participant);
    });
    ctx.room.on(RoomEvent.TrackUnsubscribed, track => {
      if (!track.sid) return;
      audioJobs.get(track.sid)?.stop();
    });
    ctx.room.on(RoomEvent.Disconnected, () => { connected = false; });
    ctx.addShutdownCallback(async () => {
      stopping = true;
      for (const topic of INPUT_TOPICS) ctx.room.unregisterTextStreamHandler(topic);
      for (const job of audioJobs.values()) job.stop();
      await Promise.allSettled([...audioJobs.values()].map(job => job.task));
      await vad.close();
      const drained = await forwarder.drain();
      if (!drained) console.warn('Sidekick stopped before all backend transcript requests completed.');
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    roomName = ctx.room.name ?? '';
    if (!roomName) throw new Error('LiveKit room name is required after connecting.');
    connected = true;
    await ctx.room.localParticipant?.setAttributes({
      'sidekick.meeting_id': roomName,
      'sidekick.mode': 'transcript-ingest',
      'sidekick.input': 'audio,text',
      'sidekick.stt': 'gpt-live-transcribe',
      'sidekick.backend': forwarder.configured ? 'configured' : 'disabled',
    });
    await sendState();
    console.info('Sidekick ingest joined a room and is ready for audio or text input.');
  },
});

cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: process.env.LIVEKIT_AGENT_NAME || 'sidekick',
  shutdownProcessTimeout: 60_000,
  drainTimeout: 60_000,
}));
