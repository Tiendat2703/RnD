import type { Chunk } from './chunk';
import { terms } from './normalize';

export type Hit = { chunk: Chunk; score: number };

/** Okapi BM25 over syllables and syllable pairs; runs locally, so gating costs no credits. */
export class Bm25Index {
  private readonly docs: { chunk: Chunk; tf: Map<string, number>; length: number }[];
  private readonly df = new Map<string, number>();
  private readonly avgLength: number;

  constructor(chunks: Chunk[], private readonly k1 = 1.4, private readonly b = 0.75) {
    this.docs = chunks.map(chunk => {
      const tf = new Map<string, number>();
      const list = terms(chunk.text);
      for (const t of list) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      return { chunk, tf, length: list.length };
    });
    this.avgLength = this.docs.reduce((sum, d) => sum + d.length, 0) / Math.max(1, this.docs.length);
  }

  get size(): number {
    return this.docs.length;
  }

  search(query: string, k: number): Hit[] {
    const queryTerms = [...new Set(terms(query))];
    const n = this.docs.length;
    const hits: Hit[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const t of queryTerms) {
        const f = doc.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * doc.length) / this.avgLength));
      }
      if (score > 0) hits.push({ chunk: doc.chunk, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
