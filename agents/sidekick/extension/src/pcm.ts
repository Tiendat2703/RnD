export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    out[i] = Math.round(clamped * 32767);
  }
  return out;
}

export class FrameBatcher {
  private buffer = new Int16Array(0);

  constructor(
    private frameSamples: number,
    private onFrame: (frame: Int16Array) => void,
  ) {}

  push(samples: Int16Array): void {
    const merged = new Int16Array(this.buffer.length + samples.length);
    merged.set(this.buffer);
    merged.set(samples, this.buffer.length);
    let offset = 0;
    while (merged.length - offset >= this.frameSamples) {
      this.onFrame(merged.slice(offset, offset + this.frameSamples));
      offset += this.frameSamples;
    }
    this.buffer = merged.slice(offset);
  }
}
