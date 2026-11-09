import { FRAME_SAMPLES } from './config';
import { FrameBatcher, floatToPcm16 } from './pcm';

// Lib DOM không có hai tên này trong ngữ cảnh worklet.
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(
  name: string,
  ctor: new () => AudioWorkletProcessor,
): void;

class MeetMatePcm extends AudioWorkletProcessor {
  private batcher = new FrameBatcher(FRAME_SAMPLES, (frame) =>
    this.port.postMessage(frame.buffer, [frame.buffer]),
  );

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel) this.batcher.push(floatToPcm16(channel));
    return true;
  }
}

registerProcessor('meetmate-pcm', MeetMatePcm);
