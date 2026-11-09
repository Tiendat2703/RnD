import { describe, expect, it } from 'vitest';
import type { ResearchResult } from '../../../../lib/types';
import { applyEvent, finish, newSession, prune } from './sessionStore';

const result: ResearchResult = {
  topic: 'Giá',
  summary: 's',
  sources: [{ title: 'A', url: 'https://a.example/x', reason: 'r' }],
};
const fresh = () => newSession('s1', 'Họp', 'san-pham', 1000);

describe('sessionStore.applyEvent', () => {
  it('appends lines and keeps them in order', () => {
    let s = fresh();
    s = applyEvent(s, { type: 'line', line: { id: 'l1', text: 'a', atMs: 1, source: 'mixed' } }, 2);
    s = applyEvent(s, { type: 'line', line: { id: 'l2', text: 'b', atMs: 2, source: 'mixed' } }, 3);
    expect(s.lines.map((l) => l.text)).toEqual(['a', 'b']);
  });

  it('attaches research to the latest topic and counts posts by url', () => {
    let s = fresh();
    s = applyEvent(s, { type: 'topic', topic: { topic: 'Giá', keywords: [], query: 'q' } }, 2);
    s = applyEvent(s, { type: 'research', result }, 3);
    s = applyEvent(s, { type: 'posted', text: 'MeetMate: Chủ đề: Giá\nTóm tắt' }, 4);
    s = applyEvent(s, { type: 'posted', text: 'MeetMate: [1/1] A\nhttps://a.example/x\nVì sao chọn: r' }, 5);
    expect(s.topics[0].result).toEqual(result);
    expect(s.topics[0].posted).toBe(2);
  });

  it('ignores research with no topic', () => {
    expect(applyEvent(fresh(), { type: 'research', result }, 2).topics).toEqual([]);
  });

  it('sets endedAt once', () => {
    const ended = applyEvent(fresh(), { type: 'ended', reason: 'left' }, 5000);
    expect(ended.endedAt).toBe(5000);
    expect(applyEvent(ended, { type: 'ended', reason: 'stopped' }, 9000).endedAt).toBe(5000);
    expect(finish(ended, 9999).endedAt).toBe(5000);
  });

  it('ignores events that are not stored', () => {
    const s = fresh();
    expect(applyEvent(s, { type: 'stage', stage: 'topic' }, 2)).toBe(s);
  });
});

describe('sessionStore.prune', () => {
  it('keeps at most 50 sessions and never drops a running one', () => {
    const all = Object.fromEntries(
      Array.from({ length: 60 }, (_, i) => {
        const s = newSession(`s${i}`, 't', 'khac', i);
        return [s.id, i === 0 ? s : { ...s, endedAt: i + 1 }];
      }),
    );
    const out = prune(all);
    expect(Object.keys(out)).toHaveLength(50);
    expect(out.s0).toBeDefined();
  });
});
