import { describe, expect, it } from 'vitest';
import { evaluateSpeech, type SpeechFrame } from './speech-gate';

const sampleRate = 24_000;
const samplesPerFrame = 480;

function frame(generator: (sample: number) => number): SpeechFrame {
  const data = new Int16Array(samplesPerFrame);
  for (let index = 0; index < data.length; index++) data[index] = generator(index);
  return { data, sampleRate, channels: 1 };
}

function silence(count: number) {
  return Array.from({ length: count }, () => frame(() => 0));
}

describe('LiveKit speech quality gate', () => {
  it('rejects silence and very quiet input', () => {
    expect(evaluateSpeech(silence(60), 900)).toMatchObject({ accepted: false, reason: 'too-quiet' });
  });

  it('rejects a short click even when its peak is loud', () => {
    const frames = [...silence(15), frame(index => index === 0 ? 20_000 : 0), ...silence(30)];
    expect(evaluateSpeech(frames, 500).accepted).toBe(false);
  });

  it('rejects a steady low-level noise floor', () => {
    let seed = 7;
    const noise = Array.from({ length: 60 }, () => frame(() => {
      seed = (seed * 16_807) % 2_147_483_647;
      return Math.round(((seed / 2_147_483_647) * 2 - 1) * 150);
    }));
    expect(evaluateSpeech(noise, 900).accepted).toBe(false);
  });

  it('accepts sustained speech-like signal above a quiet prefix', () => {
    let phase = 0;
    const speech = Array.from({ length: 35 }, () => frame(() => {
      phase += (2 * Math.PI * 220) / sampleRate;
      return Math.round(Math.sin(phase) * 5_000);
    }));
    const result = evaluateSpeech([...silence(15), ...speech, ...silence(35)], 700);
    expect(result.accepted).toBe(true);
    expect(result.activeDurationMs).toBeGreaterThanOrEqual(600);
    expect(result.snrDb).toBeGreaterThan(20);
  });
});
