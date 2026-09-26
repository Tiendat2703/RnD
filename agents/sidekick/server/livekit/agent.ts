import { AutoSubscribe, ServerOptions, cli, defineAgent } from '@livekit/agents';
import { ParticipantKind, RoomEvent, type TextStreamReader } from '@livekit/rtc-node';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeetingStore } from '../store';
import { MeetingWorker } from '../worker';
import { SidekickSession } from './session';

export const INPUT_TOPICS = ['lk.chat', 'sidekick.transcript', 'sidekick.command'] as const;

export default defineAgent({
  entry: async (ctx) => {
    // Per-job storage: never share cached MeetingStore instances across processes.
    // Cloud disk is temporary; native artifacts remain in Ambiguous.
    const store = new MeetingStore(mkdtempSync(join(tmpdir(), 'sidekick-')));
    let connected = false;
    let stopping = false;
    let readers = 0;
    const session = new SidekickSession(store, new MeetingWorker(store), async output => {
      if (!connected) return;
      const local = ctx.room.localParticipant;
      if (!local) return;
      await local.sendText(JSON.stringify(output), { topic: 'sidekick.state' });
      if (output.text) await local.sendText(output.text, { topic: 'lk.chat' });
    });

    async function receive(reader: TextStreamReader, identity: string, topic: string) {
      const participant = ctx.room.remoteParticipants.get(identity);
      if (stopping || !participant || participant.kind === ParticipantKind.AGENT || readers >= 16) {
        await reader.close();
        return;
      }
      readers++;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; void reader.close(); }, 15000);
      try {
        let text = '';
        for await (const chunk of reader) {
          text += chunk;
          if (text.length > 16000) throw new Error('Input is too long.');
        }
        clearTimeout(timer);
        if (stopping) return;
        if (timedOut) throw new Error('Input stream timed out.');
        if (topic === 'sidekick.command') {
          const command: unknown = JSON.parse(text);
          const type = command && typeof command === 'object' && 'type' in command ? command.type : undefined;
          if (type === 'state') await session.sendState();
          else if (type === 'close') await session.close();
          else throw new Error('Unknown command.');
        } else {
          await session.submit(identity, reader.info.streamId, text);
        }
      } catch {
        // Provider details and payloads are not logged. Existing worker errors are in public state.
        if (connected) await ctx.room.localParticipant?.sendText(
          'Sidekick could not process this message. Check sidekick.state for meeting status.',
          { topic: 'sidekick.error', destinationIdentities: [identity] },
        ).catch(() => undefined);
      } finally {
        clearTimeout(timer);
        readers--;
        await reader.close();
      }
    }

    for (const topic of INPUT_TOPICS) {
      ctx.room.registerTextStreamHandler(topic, (reader, participant) => {
        void receive(reader, participant.identity, topic).catch(() => {
          console.warn('Sidekick stream handler failed.');
        });
      });
    }
    ctx.room.on(RoomEvent.Disconnected, () => { connected = false; });
    ctx.addShutdownCallback(async () => {
      stopping = true;
      for (const topic of INPUT_TOPICS) ctx.room.unregisterTextStreamHandler(topic);
      await session.close().catch(() => { console.warn('Sidekick finalization did not complete.'); });
    });

    await ctx.connect(undefined, AutoSubscribe.SUBSCRIBE_NONE);
    connected = true;
    await ctx.room.localParticipant?.setAttributes({
      'sidekick.meeting_id': session.meetingId,
      'sidekick.input': 'text',
    });
    await session.sendState();
    console.info('Sidekick joined a room and is ready for text input.');
  },
});

cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: process.env.LIVEKIT_AGENT_NAME || 'sidekick',
  shutdownProcessTimeout: 300000,
  drainTimeout: 300000,
}));
