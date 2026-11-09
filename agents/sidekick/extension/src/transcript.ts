import { DUPLICATE_MS, WINDOW_MS } from './config';

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export class TranscriptWindow {
  private entries: { text: string; norm: string; atMs: number }[] = [];

  constructor(
    private windowMs = WINDOW_MS,
    private duplicateMs = DUPLICATE_MS,
  ) {}

  /** false nếu là câu trùng (cùng nội dung sau chuẩn hóa, trong `duplicateMs`). */
  add(text: string, atMs: number): boolean {
    const norm = normalize(text);
    if (!norm) return false;
    const dup = this.entries.some(
      (e) => e.norm === norm && atMs - e.atMs < this.duplicateMs,
    );
    if (dup) return false;
    this.entries.push({ text: text.trim(), norm, atMs });
    return true;
  }

  text(nowMs: number): string {
    this.entries = this.entries.filter((e) => nowMs - e.atMs <= this.windowMs);
    return this.entries.map((e) => e.text).join('\n');
  }
}
