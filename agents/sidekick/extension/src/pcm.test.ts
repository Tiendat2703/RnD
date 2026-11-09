import { describe, expect, it } from 'vitest';
import { FrameBatcher, floatToPcm16 } from './pcm';

describe('pcm', () => {
  it('clamps and scales floats to PCM16', () => {
    expect([...floatToPcm16(new Float32Array([0, 1, -1, 2, -2, 0.5]))]).toEqual([
      0, 32767, -32767, 32767, -32767, 16384,
    ]);
  });

  it('emits fixed-size frames and keeps the remainder', () => {
    const frames: Int16Array[] = [];
    const b = new FrameBatcher(4, (f) => frames.push(f));
    b.push(new Int16Array([1, 2, 3]));
    b.push(new Int16Array([4, 5, 6, 7, 8, 9]));
    expect(frames.map((f) => [...f])).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
  });
});
