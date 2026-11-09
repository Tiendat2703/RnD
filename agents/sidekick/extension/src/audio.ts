import { SAMPLE_RATE } from './config';

/**
 * Ghi âm tab Meet và micro, trả về hàm dừng. Âm thanh tab phải được phát lại,
 * nếu không người dùng mất tiếng cuộc họp khi tab bị capture.
 */
export async function startCapture(
  streamId: string,
  onFrame: (frame: Int16Array) => void,
  onStatus: (s: string) => void,
  onEnded?: () => void,
): Promise<() => void> {
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId },
    },
  } as unknown as MediaStreamConstraints);

  // Phát lại ở context riêng, sample rate mặc định, để chất lượng nghe không giảm.
  const playback = new AudioContext();
  playback.createMediaStreamSource(tabStream).connect(playback.destination);

  let micStream: MediaStream | null = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    onStatus('Không dùng được micro — chỉ nghe âm thanh từ người khác');
  }

  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));
  const node = new AudioWorkletNode(ctx, 'meetmate-pcm', {
    channelCount: 1,
    channelCountMode: 'explicit',
  });
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) =>
    onFrame(new Int16Array(e.data));
  ctx.createMediaStreamSource(tabStream).connect(node);
  if (micStream) ctx.createMediaStreamSource(micStream).connect(node);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const s of [tabStream, micStream]) s?.getTracks().forEach((t) => t.stop());
    void ctx.close();
    void playback.close();
  };
  tabStream.getAudioTracks()[0]?.addEventListener('ended', () => {
    stop();
    onEnded?.();
  });
  return stop;
}
