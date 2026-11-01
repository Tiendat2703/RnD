import { DUPLICATE_MS, WINDOW_MS } from './config';

const normalize = (text: string) => text.toLowerCase().replace(/\p{P}/gu, '').replace(/\s+/g, ' ').trim();

export class TranscriptWindow {
  private lines: { text: string; key: string; at: number }[] = [];

  constructor(private readonly windowMs = WINDOW_MS, private readonly duplicateMs = DUPLICATE_MS) {}

  /** Returns false for a repeat heard twice (e.g. tab audio echoed through a loudspeaker into the mic). */
  add(text: string, atMs: number): boolean {
    const key = normalize(text);
    if (this.lines.some(line => line.key === key && atMs - line.at < this.duplicateMs)) return false;
    this.lines.push({ text, key, at: atMs });
    this.lines = this.lines.filter(line => atMs - line.at <= this.windowMs);
    return true;
  }

  text(nowMs: number): string {
    return this.lines.filter(line => nowMs - line.at <= this.windowMs).map(line => line.text).join('\n');
  }
}
