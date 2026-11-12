import { describe, expect, it } from 'vitest';
import { Downsampler, FrameBatcher, floatToPcm16 } from './pcm';

describe('floatToPcm16', () => {
  it('clamps and scales floats to PCM16', () => {
    expect([...floatToPcm16(new Float32Array([0, 1, -1, 2, -2, 0.5]))])
      .toEqual([0, 32767, -32767, 32767, -32767, 16384]);
  });
});

describe('FrameBatcher', () => {
  it('emits fixed-size frames and keeps the remainder', () => {
    const frames: Int16Array[] = [];
    const b = new FrameBatcher(4, f => frames.push(f));
    b.push(new Int16Array([1, 2, 3]));
    b.push(new Int16Array([4, 5, 6, 7, 8, 9]));
    expect(frames.map(f => [...f])).toEqual([[1, 2, 3, 4], [5, 6, 7, 8]]);
  });

  it('never hands out a buffer it later overwrites', () => {
    const frames: Int16Array[] = [];
    const b = new FrameBatcher(2, f => frames.push(f));
    b.push(new Int16Array([1, 2, 3, 4]));
    expect(frames.map(f => [...f])).toEqual([[1, 2], [3, 4]]);
  });
});

describe('Downsampler', () => {
  it('averages each output period for an integer ratio', () => {
    const d = new Downsampler(48_000, 16_000);
    expect([...d.process(new Float32Array([0.3, 0.3, 0.3, 0.6, 0.6, 0.6]))].map(v => +v.toFixed(3))).toEqual([0.3, 0.6]);
  });

  it('keeps phase across blocks', () => {
    const whole = new Downsampler(48_000, 16_000).process(new Float32Array(9).fill(0.5));
    const split = new Downsampler(48_000, 16_000);
    const parts = [...split.process(new Float32Array(4).fill(0.5)), ...split.process(new Float32Array(5).fill(0.5))];
    expect(parts.length).toBe(whole.length);
  });

  it('produces the right count for a fractional ratio over one second', () => {
    const d = new Downsampler(44_100, 16_000);
    let total = 0;
    for (let i = 0; i < 100; i++) total += d.process(new Float32Array(441)).length;
    expect(Math.abs(total - 16_000)).toBeLessThanOrEqual(1);
  });

  it('passes audio through unchanged at equal rates', () => {
    expect([...new Downsampler(16_000, 16_000).process(new Float32Array([0.25, -0.5]))]).toEqual([0.25, -0.5]);
  });

  it('attenuates a tone above the new Nyquist', () => {
    const d = new Downsampler(48_000, 16_000);
    const tone = Float32Array.from({ length: 4_800 }, (_, i) => Math.sin((2 * Math.PI * 16_000 * i) / 48_000));
    const peak = Math.max(...[...d.process(tone)].map(Math.abs));
    expect(peak).toBeLessThan(0.05);
  });
});
