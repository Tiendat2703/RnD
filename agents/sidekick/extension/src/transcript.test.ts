import { describe, expect, it } from 'vitest';
import { TranscriptWindow } from './transcript';

describe('TranscriptWindow', () => {
  it('drops a normalized duplicate within 5 seconds only', () => {
    const window = new TranscriptWindow();
    expect(window.add('Lãi suất', 0)).toBe(true);
    expect(window.add('lãi  suất', 3_000)).toBe(false);
    expect(window.add('Lãi suất', 9_000)).toBe(true);
  });

  it('ignores punctuation when matching duplicates', () => {
    const window = new TranscriptWindow();
    window.add('Lãi suất', 0);
    expect(window.add('Lãi suất.', 1_000)).toBe(false);
  });

  it('keeps only sentences inside the window', () => {
    const window = new TranscriptWindow();
    window.add('Câu cũ', 0);
    window.add('Câu mới', 150_000);
    expect(window.text(200_000)).toBe('Câu mới');
  });
});
