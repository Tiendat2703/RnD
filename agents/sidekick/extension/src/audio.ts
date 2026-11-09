/**
 * Captures the Meet tab (other people) and the microphone (the user), mixes them to mono and
 * hands 100 ms PCM16 frames to onFrame. Tab audio is played back, because capturing a tab
 * mutes it for the user otherwise.
 */
export async function startCapture(opts: {
  /** null captures the microphone only (used by automated tests, where tabCapture needs a real click). */
  streamId: string | null;
  workletUrl: string;
  onFrame: (frame: Int16Array) => void;
  onNotice: (message: string) => void;
  onEnded: () => void;
}): Promise<() => void> {
  const streams: MediaStream[] = [];
  const contexts: AudioContext[] = [];
  const stop = () => {
    for (const stream of streams) for (const track of stream.getTracks()) track.stop();
    for (const ctx of contexts) void ctx.close().catch(() => undefined);
  };

  try {
    let tab: MediaStream | null = null;
    if (opts.streamId) {
      tab = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: opts.streamId } },
      } as unknown as MediaStreamConstraints);
      streams.push(tab);
      // Playback at the device rate keeps the meeting sounding normal for the user.
      const playback = new AudioContext();
      contexts.push(playback);
      playback.createMediaStreamSource(tab).connect(playback.destination);
      tab.getAudioTracks()[0]?.addEventListener('ended', opts.onEnded);
    }

    let mic: MediaStream | null = null;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streams.push(mic);
    } catch {
      if (!tab) throw new Error('Không dùng được micro');
      opts.onNotice('Không dùng được micro — chỉ nghe được giọng người khác');
    }

    // Default rate: the worklet downsamples itself, which works on every device rate.
    const ctx = new AudioContext();
    contexts.push(ctx);
    await ctx.audioWorklet.addModule(opts.workletUrl);
    const node = new AudioWorkletNode(ctx, 'meetmate-pcm', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit',
    });
    node.port.onmessage = ({ data }) => opts.onFrame(new Int16Array(data as ArrayBuffer));
    for (const stream of [tab, mic]) if (stream) ctx.createMediaStreamSource(stream).connect(node);
    // A worklet is only pulled while it reaches the destination; the zero gain keeps it silent.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute).connect(ctx.destination);
    await ctx.resume();
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
