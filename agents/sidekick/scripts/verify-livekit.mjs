import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Room, dispose } from '@livekit/rtc-node';

// Uses the authenticated CLI; credentials and join tokens are never printed.
// This only checks registration, dispatch and data round-trips. No model calls.
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
const roomName = 'sidekick-smoke-' + Date.now();
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
let resolveState;
let rejectState;
const stateReceived = new Promise((resolve, reject) => {
  resolveState = resolve;
  rejectState = reject;
});
let agentIdentity;
let timer;
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
  console.log(JSON.stringify({ success: true, room: roomName, agent: agentIdentity, checks: ['dispatch', 'room join', 'state command round-trip'] }));
} finally {
  clearTimeout(timer);
  await room.disconnect();
  await dispose();
  // Only delete the uniquely named verification room created by this script.
  spawnSync(cliPath, ['--project', project, 'room', 'delete', roomName], { encoding: 'utf8' });
}
