import { describe, expect, it } from 'vitest';
import type { ResearchResult } from './research';
import { ResearchSession } from './session';
import type { Topic, TopicDecision } from './topic';

type Pending<T> = { resolve(v: T): void; reject(e: unknown): void; signal: AbortSignal; arg: unknown };

function setup() {
  const detects: Pending<TopicDecision | null>[] = [];
  const researches: Pending<ResearchResult | null>[] = [];
  const delivered: ResearchResult[] = [];
  const errors: string[] = [];
  let t = 20_000;
  const s = new ResearchSession({
    detect: (current, _transcript, signal) => new Promise((resolve, reject) => detects.push({ resolve, reject, signal, arg: current })),
    research: (topic, signal) => new Promise((resolve, reject) => researches.push({ resolve, reject, signal, arg: topic })),
    deliver: r => delivered.push(r),
    onError: m => errors.push(m),
    transcript: () => 'transcript',
    now: () => t,
  });
  return { s, detects, researches, delivered, errors, tick: (ms: number) => { t += ms; } };
}

const flush = () => new Promise(r => setTimeout(r, 0));
const topic = (name: string, changed = true): TopicDecision => ({ topic: name, keywords: [], query: name, changed });
const result = (name: string): ResearchResult => ({ topic: name, summary: '', sources: [{ title: 't', url: 'https://x', reason: 'r' }] });
const lines = (s: ResearchSession, n: number) => { for (let i = 0; i < n; i++) s.onLine(); };

describe('ResearchSession', () => {
  it('checks the topic after enough new lines and a minimum gap', () => {
    const r = setup();
    lines(r.s, 2);
    expect(r.detects).toHaveLength(0);
    r.s.onLine();
    expect(r.detects).toHaveLength(1);
  });

  it('respects the minimum gap between checks', async () => {
    const r = setup();
    lines(r.s, 3);
    r.detects[0].resolve(null);
    await flush();
    lines(r.s, 3);
    expect(r.detects).toHaveLength(1);
    r.tick(15_000);
    r.s.onLine();
    expect(r.detects).toHaveLength(2);
  });

  it('cancels research for the old topic when the topic changes', async () => {
    const r = setup();
    lines(r.s, 3);
    r.detects[0].resolve(topic('A'));
    await flush();
    r.tick(15_000);
    lines(r.s, 3);
    r.detects[1].resolve(topic('B'));
    await flush();
    expect(r.researches[0].signal.aborted).toBe(true);
    r.researches[0].resolve(result('A'));
    r.researches[1].resolve(result('B'));
    await flush();
    expect(r.delivered.map(d => d.topic)).toEqual(['B']);
  });

  it('does not research again when the topic is unchanged or empty', async () => {
    const r = setup();
    lines(r.s, 3);
    r.detects[0].resolve(topic('A'));
    await flush();
    r.tick(15_000);
    lines(r.s, 3);
    r.detects[1].resolve(topic('A', false));
    await flush();
    r.tick(15_000);
    lines(r.s, 3);
    r.detects[2].resolve(topic('', true));
    await flush();
    expect(r.researches).toHaveLength(1);
  });

  it('reports research errors instead of posting', async () => {
    const r = setup();
    lines(r.s, 3);
    r.detects[0].resolve(topic('A'));
    await flush();
    r.researches[0].reject(new Error('Exa 429'));
    await flush();
    expect(r.errors).toEqual(['Exa 429']);
    expect(r.delivered).toEqual([]);
  });

  it('stop aborts running research and ignores later lines', async () => {
    const r = setup();
    lines(r.s, 3);
    r.detects[0].resolve(topic('A'));
    await flush();
    r.s.stop();
    expect(r.researches[0].signal.aborted).toBe(true);
    r.tick(60_000);
    lines(r.s, 5);
    expect(r.detects).toHaveLength(1);
    expect((r.researches[0].arg as Topic).topic).toBe('A');
  });
});
