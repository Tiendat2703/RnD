import { afterEach, expect, it, vi } from 'vitest';
import { startCapture } from './audio';
afterEach(() => vi.unstubAllGlobals());
function setup(denied = false) {
  const stop = vi.fn();
  const ended = vi.fn();
  const stream = {
    getTracks: () => [{ stop }],
    getAudioTracks: () => [{ addEventListener: ended }],
  };
  const capture = vi.fn(async () => {
    if (denied) throw Error('denied');
    return stream;
  });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: capture } });
  class Context {
    audioWorklet = { addModule: async () => {} };
    destination = {};
    createMediaStreamSource() {
      return { connect: vi.fn() };
    }
    createGain() {
      return {
        gain: { value: 1 },
        connect() {
          return { connect() {} };
        },
      };
    }
    async resume() {}
    async close() {}
  }
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = { onmessage: null };
      connect() {
        return { connect() {} };
      }
    },
  );
  return { capture, stop, ended };
}
it('presentation requests only microphone even when a Meet stream id exists', async () => {
  const t = setup();
  const stop = await startCapture({
    streamId: 'tab-stream',
    microphoneOnly: true,
    workletUrl: 'x',
    onFrame: () => {},
    onNotice: () => {},
    onEnded: () => {},
  });
  expect(t.capture).toHaveBeenCalledTimes(1);
  expect(t.capture.mock.calls[0]).toEqual([
    { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
  ]);
  expect(t.ended).toHaveBeenCalled();
  stop();
  expect(t.stop).toHaveBeenCalled();
});
it('presentation never falls back to audience audio when microphone is denied', async () => {
  const t = setup(true);
  await expect(
    startCapture({
      streamId: 'tab-stream',
      microphoneOnly: true,
      workletUrl: 'x',
      onFrame: () => {},
      onNotice: () => {},
      onEnded: () => {},
    }),
  ).rejects.toThrow('micro');
  expect(t.capture).toHaveBeenCalledTimes(1);
});
