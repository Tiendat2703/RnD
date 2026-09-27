import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  TrackSource,
  dispose,
} from '@livekit/rtc-node';

// Uses the authenticated CLI; credentials and join tokens are never printed.
// The default smoke check makes no provider calls. --work also exercises one
// synthetic model turn and the meeting-record workspace save. --audio adds
// OpenAI TTS -> LiveKit audio -> OpenAI STT -> Sidekick -> room text.
// --noise confirms that background noise does not create Sidekick work.
function resolveLiveKitCLI() {
  const override = process.env.LIVEKIT_CLI;
  if (override) return override;
  const executable = process.platform === 'win32' ? 'lk.exe' : 'lk';
  const candidates = [executable];

  // WinGet may install successfully before the parent terminal gets its new PATH.
  if (process.platform === 'win32') {
    const roots = [
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet'),
      process.env.ProgramFiles && join(process.env.ProgramFiles, 'WinGet'),
    ].filter(Boolean);
    for (const root of roots) {
      candidates.push(join(root, 'Links', 'lk.exe'));
      const packages = join(root, 'Packages');
      try {
        for (const entry of readdirSync(packages, { withFileTypes: true })) {
          if (entry.isDirectory() && entry.name.startsWith('LiveKit.LiveKitCLI_')) {
            candidates.push(join(packages, entry.name, 'lk.exe'));
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EACCES') throw error;
      }
    }
  }
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], {
      encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    if (probe.status === 0) return candidate;
  }
  throw new Error('LiveKit CLI was not found or could not run. Install LiveKit.LiveKitCLI, or set LIVEKIT_CLI to the full path of lk.exe.');
}
const cliPath = resolveLiveKitCLI();
const project = process.env.LIVEKIT_PROJECT || 'demo';
const url = process.env.LIVEKIT_URL || 'wss://demo-m6ejx9q0.livekit.cloud';
const verifyWork = process.argv.includes('--work');
const verifyAudio = process.argv.includes('--audio');
const verifyNoise = process.argv.includes('--noise');
const roomName = 'sidekick-smoke-' + Date.now();

async function createSyntheticSpeech() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for --audio verification.');
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'marin',
      input: 'Xác nhận kiểm thử âm thanh. Kế hoạch thí điểm kéo dài hai tuần.',
      instructions: 'Speak clearly in Vietnamese at a natural pace.',
      response_format: 'pcm',
    }),
  });
  if (!response.ok) throw new Error(`Synthetic speech generation failed (HTTP ${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 4 || bytes.byteLength % 2) throw new Error('Synthetic speech returned invalid PCM16 audio.');
  const pcm = new Int16Array(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < pcm.length; index++) pcm[index] = view.getInt16(index * 2, true);
  return pcm;
}

function createSyntheticNoise() {
  const pcm = new Int16Array(24_000 * 5);
  let seed = 19;
  for (let index = 0; index < pcm.length; index++) {
    seed = (seed * 16_807) % 2_147_483_647;
    pcm[index] = Math.round(((seed / 2_147_483_647) * 2 - 1) * 1_200);
  }
  for (const second of [1, 2, 3, 4]) pcm[second * 24_000] = 12_000;
  return pcm;
}

async function publishSyntheticAudio(room, pcm) {
  const sampleRate = 24_000;
  const samplesPerFrame = 480;
  const leadingSilence = new Int16Array(Math.floor(sampleRate * 0.3));
  const trailingSilence = new Int16Array(sampleRate);
  const samples = new Int16Array(leadingSilence.length + pcm.length + trailingSilence.length);
  samples.set(pcm, leadingSilence.length);
  const source = new AudioSource(sampleRate, 1);
  const track = LocalAudioTrack.createAudioTrack('sidekick-verification-microphone', source);
  const publication = await room.localParticipant.publishTrack(track, {
    source: TrackSource.SOURCE_MICROPHONE,
  });
  try {
    for (let start = 0; start < samples.length; start += samplesPerFrame) {
      const frameData = new Int16Array(samplesPerFrame);
      frameData.set(samples.subarray(start, Math.min(start + samplesPerFrame, samples.length)));
      await source.captureFrame(new AudioFrame(frameData, sampleRate, 1, samplesPerFrame));
    }
    await source.waitForPlayout();
  } catch (error) {
    if (publication.sid) await room.localParticipant.unpublishTrack(publication.sid).catch(() => undefined);
    await track.close().catch(() => undefined);
    throw error;
  }
  return async () => {
    if (publication.sid) await room.localParticipant.unpublishTrack(publication.sid).catch(() => undefined);
    await track.close().catch(() => undefined);
  };
}
const tokenResult = spawnSync(cliPath, [
  '--project', project, 'token', 'create', '--room', roomName,
  '--identity', 'sidekick-verifier', '--join', '--agent', 'sidekick',
  '--valid-for', '5m', '--token-only',
], { encoding: 'utf8' });
if (tokenResult.error) {
  throw new Error('Could not start LiveKit CLI (' + tokenResult.error.code +
    '). Check LIVEKIT_CLI and executable permissions. This is not an authentication result.');
}
if (tokenResult.status !== 0) {
  // Do not print token stdout or raw CLI diagnostics, which could contain credentials.
  throw new Error('LiveKit CLI ran but could not create a token for project "' + project +
    '" (exit ' + tokenResult.status + '). Check the project with lk project list and authenticate with lk cloud auth. CLI: ' + cliPath);
}
const token = tokenResult.stdout.trim();
if (!token || token.split('.').length !== 3) throw new Error('CLI did not return a valid token.');

const room = new Room();
room.registerTextStreamHandler('lk.chat', reader => {
  // The work check validates structured sidekick.state output below. Drain the
  // mirrored chat response so the RTC client does not report an unhandled topic.
  void reader.readAll().catch(() => undefined);
});
let resolveState;
let rejectState;
const stateReceived = new Promise((resolve, reject) => {
  resolveState = resolve;
  rejectState = reject;
});
let agentIdentity;
let timer;
let closeAudioTrack;
room.registerTextStreamHandler('sidekick.state', (reader, participant) => {
  void reader.readAll().then(text => {
    const output = JSON.parse(text);
    if (output.type === 'state' && output.meeting?.phase === 'active') {
      agentIdentity = participant.identity;
      resolveState(output);
    }
  }).catch(rejectState);
});
try {
  timer = setTimeout(() => rejectState(new Error('Agent did not return state within 90 seconds.')), 90000);
  await room.connect(url, token, { autoSubscribe: false, dynacast: false });
  const state = await stateReceived;
  clearTimeout(timer);
  const initialVersion = state.meeting.stateVersion;
  room.unregisterTextStreamHandler('sidekick.state');
  const roundTrip = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('State command timed out.')), 15000);
    room.registerTextStreamHandler('sidekick.state', (reader, participant) => {
      void reader.readAll().then(text => {
        const output = JSON.parse(text);
        if (participant.identity === agentIdentity && output.type === 'state'
          && output.meeting.id === state.meeting.id
          && output.meeting.stateVersion === initialVersion) resolve(output);
      }).catch(reject);
    });
  });
  await room.localParticipant.sendText(JSON.stringify({ type: 'state' }), {
    topic: 'sidekick.command', destinationIdentities: [agentIdentity],
  });
  await roundTrip;
  clearTimeout(timer);
  const checks = ['dispatch', 'room join', 'state command round-trip'];
  let work;
  if (verifyNoise) {
    room.unregisterTextStreamHandler('sidekick.state');
    closeAudioTrack = await publishSyntheticAudio(room, createSyntheticNoise());
    await new Promise(resolve => setTimeout(resolve, 3000));
    const quietState = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Noise verification state timed out.')), 15000);
      room.registerTextStreamHandler('sidekick.state', (reader, participant) => {
        void reader.readAll().then(text => {
          const output = JSON.parse(text);
          if (participant.identity === agentIdentity && output.type === 'state'
            && output.meeting?.id === state.meeting.id) resolve(output);
        }).catch(reject);
      });
    });
    await room.localParticipant.sendText(JSON.stringify({ type: 'state' }), {
      topic: 'sidekick.command', destinationIdentities: [agentIdentity],
    });
    const result = await quietState;
    clearTimeout(timer);
    const transcriptEntries = result.meeting.transcript?.length || 0;
    work = {
      transcriptEntries,
      processedRevision: result.meeting.processedRevision,
      failure: transcriptEntries === 0 ? null : 'Background noise created a transcript.',
    };
    checks.push('LiveKit noise publish', 'no STT transcript', 'no Sidekick work');
    if (work.failure) process.exitCode = 1;
  } else if (verifyWork || verifyAudio) {
    room.unregisterTextStreamHandler('sidekick.state');
    const resultReceived = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Synthetic work result timed out.')), 180000);
      room.registerTextStreamHandler('sidekick.state', (reader, participant) => {
        void reader.readAll().then(text => {
          const output = JSON.parse(text);
          if (participant.identity === agentIdentity && output.type === 'result'
            && output.meeting?.id === state.meeting.id
            && output.meeting.processedRevision > 0) resolve(output);
        }).catch(reject);
      });
    });
    if (verifyAudio) {
      const pcm = await createSyntheticSpeech();
      closeAudioTrack = await publishSyntheticAudio(room, pcm);
    } else {
      await room.localParticipant.sendText(
        'Synthetic verification only: summarize that the pilot lasts two weeks. Do not research or create additional artifacts.',
        { topic: 'lk.chat', destinationIdentities: [agentIdentity] },
      );
    }
    const result = await resultReceived;
    clearTimeout(timer);
    const failedDocument = result.meeting.documents?.find(document => document.saveStatus === 'failed');
    const failure = result.meeting.error
      || failedDocument?.error
      || (result.meeting.recordSaveStatus === 'failed'
        ? result.meeting.recordDocument?.error || 'Meeting record save failed.'
        : undefined);
    work = {
      summaryProduced: Boolean(result.meeting.summary),
      recordSaveStatus: result.meeting.recordSaveStatus,
      failure: failure || null,
      ...(verifyAudio ? {
        transcript: result.meeting.transcript?.at(-1)?.text || null,
      } : {}),
    };
    if (verifyAudio) {
      const transcript = result.meeting.transcript?.at(-1)?.text || '';
      checks.push('LiveKit audio publish', 'OpenAI STT transcript', 'Sidekick model turn', 'meeting record save');
      if (!/two weeks|2 weeks|hai tuần|hai tuan/i.test(transcript)) {
        work.failure = work.failure || 'The STT transcript did not contain the expected two-week statement.';
      }
    } else {
      checks.push('synthetic model turn', 'meeting record save');
    }
    if (failure) process.exitCode = 1;
    if (work.failure) process.exitCode = 1;
  }
  console.log(JSON.stringify({
    success: process.exitCode !== 1,
    room: roomName,
    agent: agentIdentity,
    checks,
    ...(work ? { work } : {}),
  }));
} finally {
  clearTimeout(timer);
  await closeAudioTrack?.();
  await room.disconnect();
  await dispose();
  // Only delete the uniquely named verification room created by this script.
  spawnSync(cliPath, ['--project', project, 'room', 'delete', roomName], { encoding: 'utf8' });
}
