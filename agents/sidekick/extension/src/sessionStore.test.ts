import { describe, expect, it } from 'vitest';
import type { ResearchResult } from '../../../../lib/types';
import { applyEvent, finish, markSyncedPure, newSession, prune } from './sessionStore';

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

describe('sessionStore.markSyncedPure', () => {
  it('marks an ended session once and keeps the first timestamp', () => {
    const ended = finish(fresh(), 2000);
    const synced = markSyncedPure(ended, 3000);
    expect(synced.syncedAt).toBe(3000);
    expect(markSyncedPure(synced, 4000)).toBe(synced);
  });

  it('refuses a running session or a bad timestamp', () => {
    const running = fresh();
    expect(markSyncedPure(running, 3000)).toBe(running);
    const ended = finish(fresh(), 2000);
    expect(markSyncedPure(ended, Number.NaN)).toBe(ended);
  });
});

describe('sessionStore.prune', () => {
  const make = (i: number, state: 'running' | 'unsynced' | 'synced') => {
    const s = newSession(`s${i}`, 't', 'khac', i);
    if (state === 'running') return s;
    const ended = { ...s, endedAt: i + 1 };
    return state === 'synced' ? { ...ended, syncedAt: i + 2 } : ended;
  };
  const store = (list: ReturnType<typeof make>[]) => Object.fromEntries(list.map((s) => [s.id, s]));

  it('drops the oldest synced sessions down to 50', () => {
    const out = prune(store(Array.from({ length: 60 }, (_, i) => make(i, i === 0 ? 'running' : 'synced'))));
    expect(Object.keys(out)).toHaveLength(50);
    expect(out.s0).toBeDefined();
    expect(out.s1).toBeUndefined();
    expect(out.s10).toBeUndefined();
    expect(out.s11).toBeDefined();
  });

  it('never drops an unsynced or running session, even over the limit', () => {
    const list = Array.from({ length: 60 }, (_, i) => make(i, i === 0 ? 'running' : i < 55 ? 'unsynced' : 'synced'));
    const out = prune(store(list));
    // 5 phiên đã lưu đều bị dọn, 55 phiên còn lại giữ nguyên dù vượt 50
    expect(Object.keys(out)).toHaveLength(55);
    for (let i = 0; i < 55; i++) expect(out[`s${i}`]).toBeDefined();
  });

  it('treats sessions saved before syncedAt existed as unsynced', () => {
    const legacy = Array.from({ length: 60 }, (_, i) => {
      const { syncedAt: _drop, ...rest } = make(i, 'unsynced');
      return rest;
    });
    expect(Object.keys(prune(store(legacy)))).toHaveLength(60);
  });
});
