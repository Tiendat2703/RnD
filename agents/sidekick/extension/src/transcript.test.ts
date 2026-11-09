import { describe, expect, it } from 'vitest';
import { TranscriptWindow } from './transcript';

describe('TranscriptWindow', () => {
  it('drops normalized duplicates within the duplicate window only', () => {
    const w = new TranscriptWindow();
    expect(w.add('Lãi suất', 0)).toBe(true);
    expect(w.add('lãi  suất', 3000)).toBe(false);
    expect(w.add('lãi  suất', 9000)).toBe(true);
  });

  it('expires entries outside the window', () => {
    const w = new TranscriptWindow();
    w.add('Câu cũ', 0);
    w.add('Câu mới', 190_000);
    expect(w.text(200_000)).toBe('Câu mới');
  });

  it('joins entries with newlines', () => {
    const w = new TranscriptWindow();
    w.add('a', 0);
    w.add('b', 1000);
    expect(w.text(2000)).toBe('a\nb');
  });
});
