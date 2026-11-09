export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    out[i] = Math.round(clamped * 32767);
  }
  return out;
}

/** Collects samples into fixed-size frames; the remainder waits for the next push. */
export class FrameBatcher {
  private buffer: Int16Array;
  private filled = 0;

  constructor(private readonly frameSamples: number, private readonly onFrame: (frame: Int16Array) => void) {
    this.buffer = new Int16Array(frameSamples);
  }

  push(samples: Int16Array): void {
    let offset = 0;
    while (offset < samples.length) {
      const take = Math.min(this.frameSamples - this.filled, samples.length - offset);
      this.buffer.set(samples.subarray(offset, offset + take), this.filled);
      this.filled += take;
      offset += take;
      if (this.filled === this.frameSamples) {
        this.onFrame(this.buffer);
        this.buffer = new Int16Array(this.frameSamples);
        this.filled = 0;
      }
    }
  }
}

/**
 * Averages every output period of input samples (a box filter), so content above the new
 * Nyquist is attenuated instead of aliasing into speech. Handles fractional ratios such as
 * 44.1 kHz → 16 kHz and keeps its phase across blocks.
 */
export class Downsampler {
  private readonly ratio: number;
  private sum = 0;
  private count = 0;
  private consumed = 0;
  private boundary: number;

  constructor(inRate: number, outRate: number) {
    if (outRate > inRate) throw new Error('Downsampler cannot upsample');
    this.ratio = inRate / outRate;
    this.boundary = this.ratio;
  }

  process(input: Float32Array): Float32Array {
    if (this.ratio === 1) return input.slice();
    const out: number[] = [];
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i];
      this.count++;
      this.consumed++;
      if (this.consumed >= this.boundary) {
        out.push(this.sum / this.count);
        this.sum = 0;
        this.count = 0;
        this.boundary += this.ratio;
      }
    }
    return Float32Array.from(out);
  }
}
