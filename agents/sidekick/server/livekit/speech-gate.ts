export type SpeechFrame = {
  data: Int16Array;
  sampleRate: number;
  channels: number;
};

export type SpeechGateResult = {
  accepted: boolean;
  reason: 'accepted' | 'too-short' | 'too-quiet' | 'insufficient-activity';
  activeDurationMs: number;
  noiseRms: number;
  peak: number;
  signalRms: number;
  snrDb: number;
};

const MIN_SPEECH_DURATION_MS = 350;
const MIN_ACTIVE_DURATION_MS = 120;
const MIN_SIGNAL_RMS = 0.006;
const MIN_PEAK = 0.02;
const NOISE_PREFIX_MS = 250;

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

function frameMetrics(frame: SpeechFrame) {
  if (!frame.data.length || frame.sampleRate <= 0 || frame.channels <= 0) {
    return { durationMs: 0, peak: 0, rms: 0 };
  }
  let squareSum = 0;
  let peak = 0;
  for (const sample of frame.data) {
    const normalized = Math.abs(sample) / 32_768;
    squareSum += normalized * normalized;
    peak = Math.max(peak, normalized);
  }
  return {
    durationMs: (frame.data.length / frame.channels / frame.sampleRate) * 1000,
    peak,
    rms: Math.sqrt(squareSum / frame.data.length),
  };
}

/**
 * Rejects VAD false positives before audio is committed to transcription.
 * The gate requires sustained, clearly separated signal rather than one click
 * or a steady background-noise floor. Values are normalized to PCM16 full scale.
 */
export function evaluateSpeech(frames: readonly SpeechFrame[], speechDurationMs: number): SpeechGateResult {
  const metrics = frames.map(frameMetrics).filter(metric => metric.durationMs > 0);
  const peak = metrics.reduce((maximum, metric) => Math.max(maximum, metric.peak), 0);
  const signalRms = percentile(metrics.map(metric => metric.rms), 0.8);

  const prefix: number[] = [];
  let prefixDuration = 0;
  for (const metric of metrics) {
    if (prefixDuration >= NOISE_PREFIX_MS) break;
    prefix.push(metric.rms);
    prefixDuration += metric.durationMs;
  }
  const noiseRms = percentile(prefix, 0.5);
  const snrDb = 20 * Math.log10((signalRms + 1e-6) / (noiseRms + 1e-6));
  // VAD already classifies speech. Use an absolute activity floor here so a
  // loud first syllable in the prefix cannot raise the threshold above the
  // rest of an otherwise valid utterance.
  const activeThreshold = MIN_SIGNAL_RMS;
  const activeDurationMs = metrics
    .filter(metric => metric.rms >= activeThreshold)
    .reduce((duration, metric) => duration + metric.durationMs, 0);

  const base = { activeDurationMs, noiseRms, peak, signalRms, snrDb };
  if (speechDurationMs < MIN_SPEECH_DURATION_MS) {
    return { ...base, accepted: false, reason: 'too-short' };
  }
  if (signalRms < MIN_SIGNAL_RMS || peak < MIN_PEAK) {
    return { ...base, accepted: false, reason: 'too-quiet' };
  }
  if (activeDurationMs < MIN_ACTIVE_DURATION_MS) {
    return { ...base, accepted: false, reason: 'insufficient-activity' };
  }
  return { ...base, accepted: true, reason: 'accepted' };
}
