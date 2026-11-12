/** Capture only this learner's microphone. No playback, recording file or speech synthesis. */
export async function startTeacherMicrophone(onFrame: (audio: ArrayBuffer) => void, onEnded: () => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  let context: AudioContext | null = null;
  let node: AudioWorkletNode | null = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (node) node.port.onmessage = null;
    for (const track of stream.getTracks()) track.stop();
    if (context) void context.close().catch(() => undefined);
  };
  try {
    context = new AudioContext();
    if (context.sampleRate < 16_000) throw new Error('Tần số micro chưa được hỗ trợ. Hãy chọn thiết bị khác.');
    await context.audioWorklet.addModule('/teacher-pcm.js');
    node = new AudioWorkletNode(context, 'teacher-pcm', { channelCount: 1, channelCountMode: 'explicit' });
    node.port.onmessage = ({ data }) => { if (!stopped) onFrame(data as ArrayBuffer); };
    const mute = context.createGain(); mute.gain.value = 0;
    context.createMediaStreamSource(stream).connect(node);
    node.connect(mute).connect(context.destination);
    stream.getAudioTracks()[0]?.addEventListener('ended', () => { if (!stopped) onEnded(); });
    await context.resume();
    return stop;
  } catch (error) { stop(); throw error; }
}
