import { FRAME_SAMPLES, SAMPLE_RATE } from './config';
import { Downsampler, FrameBatcher, floatToPcm16 } from './pcm';

// The DOM lib has no AudioWorkletGlobalScope; these are the only names this file needs.
declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

/** Runs on the audio thread: mono input at the context rate → PCM16 16 kHz frames of 100 ms. */
class PcmProcessor extends AudioWorkletProcessor {
  private readonly down = new Downsampler(sampleRate, SAMPLE_RATE);
  // The batcher allocates a fresh buffer after each frame, so transferring this one is safe.
  private readonly batcher = new FrameBatcher(FRAME_SAMPLES, frame => this.port.postMessage(frame.buffer, [frame.buffer]));

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel) this.batcher.push(floatToPcm16(this.down.process(channel)));
    return true;
  }
}

registerProcessor('meetmate-pcm', PcmProcessor);
