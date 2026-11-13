import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parsePresentation,
  presentationStats,
  presentationMarkdown,
  type PresentationSnapshot,
} from '../../../../lib/presentation';
import { generateChecklist } from '../../meetmate-server/presentation';
import { createPresentationPipeline } from './presentation-pipeline';
import { applyEvent, newSession } from './sessionStore';
import type { PanelEvent } from './messages';
import type { Chat } from './llm';
const fixture = (): PresentationSnapshot => ({
  version: 1,
  revision: 'revision-1',
  sequence: 0,
  confirmed: true,
  paused: false,
  autoRemind: true,
  hint: '',
  error: null,
  documents: [
    {
      id: 'd1234',
      name: 'San pham.txt',
      pageCount: 1,
      chunks: [
        {
          id: 'd1234#1',
          docId: 'd1234',
          docName: 'San pham.txt',
          page: 1,
          pageEnd: 1,
          text: 'Tốc độ phản hồi trung bình 1,8 giây. Phí dịch vụ 100 nghìn đồng.',
        },
      ],
    },
  ],
  items: [
    {
      id: 'speed',
      text: 'Tốc độ phản hồi trung bình 1,8 giây.',
      required: true,
      coverage: 'pending',
      correctness: 'unchecked',
      manual: false,
      citation: {
        id: 'd1234#1',
        docId: 'd1234',
        docName: 'San pham.txt',
        page: 1,
        pageEnd: 1,
        text: 'Tốc độ phản hồi trung bình 1,8 giây.',
      },
    },
    {
      id: 'price',
      text: 'Phí dịch vụ 100 nghìn đồng.',
      required: true,
      coverage: 'pending',
      correctness: 'unchecked',
      manual: false,
      citation: null,
    },
  ],
});
function setup(chat: Chat) {
  const events: PanelEvent[] = [];
  let time = 100_000;
  const pipeline = createPresentationPipeline({
    id: 's1',
    snapshot: fixture(),
    chat,
    emit: (e) => events.push(e),
    now: () => time,
  });
  return {
    pipeline,
    events,
    advance: (ms: number) => (time += ms),
    last: () => {
      const e = events.filter((e) => e.kind === 'presentation').at(-1);
      if (e?.kind !== 'presentation') throw Error('No snapshot');
      return e.snapshot;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe('presentation contracts', () => {
  it('rejects invalid citations, status keys and versions', () => {
    const p = fixture();
    expect(parsePresentation(p)).toEqual(p);
    expect(() => parsePresentation({ ...p, version: 2 })).toThrow();
    expect(() =>
      parsePresentation({ ...p, items: [{ ...p.items[0], coverage: 'toString' }] }),
    ).toThrow();
    expect(() =>
      parsePresentation({
        ...p,
        items: [{ ...p.items[0], citation: { ...p.items[0].citation, text: 'invented' } }],
      }),
    ).toThrow();
  });
  it('validates generated sources and does not auto-confirm', async () => {
    const p = fixture();
    const result = await generateChecklist(
      p.documents,
      async () => '{"items":[{"text":"Tốc độ","chunkId":"d1234#1","quote":"1,8 giây."}]}',
      new AbortController().signal,
    );
    expect(result.confirmed).toBe(false);
    expect(result.items).toHaveLength(1);
    await expect(
      generateChecklist(
        p.documents,
        async () => '{"items":[{"text":"Fake","chunkId":"d1234#1","quote":"outside"}]}',
        new AbortController().signal,
      ),
    ).rejects.toThrow('trích dẫn');
    await expect(
      generateChecklist(p.documents, null, new AbortController().signal),
    ).rejects.toThrow('Blaze');
  });
  it('keeps coverage and correctness separate; handles zero required', () => {
    const p = fixture();
    p.items[0] = { ...p.items[0], coverage: 'covered', correctness: 'contradicted' };
    p.items[1].coverage = 'skipped';
    expect(presentationStats(p)).toMatchObject({ total: 2, covered: 1, skipped: 1 });
    expect(presentationMarkdown('Demo', p)).toContain('Lệch tài liệu');
    p.items.forEach((i) => (i.required = false));
    expect(presentationStats(p).total).toBe(0);
  });
  it('persists snapshots and ignores duplicates or wrong session', () => {
    const p = fixture();
    const s = newSession('s1', 'Demo', 'khac', 0);
    const next = applyEvent(s, { type: 'presentation', id: 's1', snapshot: p }, 0);
    expect(next.mode).toBe('presentation');
    expect(
      applyEvent(next, { type: 'presentation', id: 'other', snapshot: { ...p, sequence: 9 } }, 0),
    ).toEqual(next);
    expect(applyEvent(next, { type: 'presentation', id: 's1', snapshot: p }, 0)).toEqual(next);
  });
});
describe('microphone presentation pipeline', () => {
  it('works without keyword and rejects fabricated evidence', async () => {
    vi.useFakeTimers();
    const s = setup(async (m) => {
      const line = JSON.parse(m[1].content).lines[0];
      return JSON.stringify({
        items: [
          {
            id: 'speed',
            lineId: line.id,
            coverage: 'covered',
            correctness: 'supported',
            quote: '1,8 giây',
            note: 'Khớp',
          },
          {
            id: 'price',
            lineId: line.id,
            coverage: 'covered',
            correctness: 'supported',
            quote: 'not spoken',
          },
        ],
      });
    });
    s.pipeline.onFinal('Phản hồi chỉ mất trung bình 1,8 giây.');
    await vi.advanceTimersByTimeAsync(1300);
    expect(s.last().items[0]).toMatchObject({
      coverage: 'covered',
      correctness: 'supported',
      evidence: { source: 'mic' },
    });
    expect(s.last().items[1].coverage).toBe('pending');
    expect(s.events.find((e) => e.kind === 'final')).toMatchObject({
      source: 'mic',
      lineId: s.last().items[0].evidence!.lineId,
    });
    s.pipeline.stop();
  });
  it('manual edits beat delayed AI; can re-enable automatic tracking', async () => {
    vi.useFakeTimers();
    let resolve!: (s: string) => void;
    let lineId = '';
    const s = setup(async (m) => {
      lineId = JSON.parse(m[1].content).lines[0].id;
      return new Promise((r) => (resolve = r));
    });
    s.pipeline.onFinal('Mất 1,8 giây.');
    await vi.advanceTimersByTimeAsync(1300);
    s.pipeline.action({ kind: 'item', itemId: 'speed', coverage: 'skipped' });
    resolve(
      JSON.stringify({
        items: [
          { id: 'speed', lineId, coverage: 'covered', correctness: 'supported', quote: '1,8 giây' },
        ],
      }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(s.last().items[0]).toMatchObject({ coverage: 'skipped', manual: true });
    s.pipeline.action({ kind: 'item', itemId: 'speed', coverage: 'auto' });
    expect(s.last().items[0]).toMatchObject({ coverage: 'pending', manual: false });
    s.pipeline.stop();
  });
  it('deduplicates, pauses queued work, and blocks updates after stop', async () => {
    vi.useFakeTimers();
    const chat = vi.fn(async () => '{"items":[]}');
    const s = setup(chat);
    s.pipeline.onFinal('Một câu nói.');
    s.pipeline.onFinal('Một câu nói.');
    expect(s.events.filter((e) => e.kind === 'final')).toHaveLength(1);
    s.pipeline.action({ kind: 'pause', paused: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(chat).not.toHaveBeenCalled();
    s.pipeline.stop();
    const n = s.events.length;
    s.pipeline.action({ kind: 'missing' });
    s.pipeline.onFinal('Sau dừng');
    expect(s.events).toHaveLength(n);
  });
  it('keeps checklist on model errors, produces missing hints without API calls', async () => {
    vi.useFakeTimers();
    const s = setup(async () => {
      throw Error('offline');
    });
    s.pipeline.onFinal('Trình bày nội dung.');
    await vi.advanceTimersByTimeAsync(1300);
    expect(s.last().error).toBe('offline');
    expect(s.last().items).toHaveLength(2);
    s.pipeline.action({ kind: 'missing' });
    expect(s.last().hint).toContain('Tốc độ');
    s.pipeline.stop();
  });
  it('supports ending hints and disabling reminders', async () => {
    vi.useFakeTimers();
    const s = setup(async () => '{"items":[],"ending":true}');
    s.pipeline.onFinal('Cảm ơn mọi người.');
    await vi.advanceTimersByTimeAsync(1300);
    expect(s.last().hint).toContain('bổ sung');
    const hint = s.last().hint;
    s.pipeline.action({ kind: 'remind', enabled: false });
    s.advance(70_000);
    s.pipeline.onFinal('Xin kết thúc.');
    await vi.advanceTimersByTimeAsync(1300);
    expect(s.last().hint).toBe(hint);
    s.pipeline.stop();
  });
});
it('checks source claims outside checklist and records verified self-corrections', async () => {
  vi.useFakeTimers();
  let call = 0;
  const s = setup(async (messages) => {
    const payload = JSON.parse(messages[1].content);
    const line = payload.lines[0];
    if (++call === 1)
      return JSON.stringify({
        items: [],
        deviations: [
          {
            lineId: line.id,
            chunkId: 'd1234#1',
            sourceQuote: 'Phí dịch vụ 100 nghìn đồng.',
            note: 'Phí không phải 300 nghìn.',
          },
        ],
      });
    return JSON.stringify({
      items: [],
      resolved: [{ id: payload.previousDeviations[0].id, lineId: line.id, quote: '100 nghìn' }],
    });
  });
  s.pipeline.onFinal('Phí dịch vụ là 300 nghìn.');
  await vi.advanceTimersByTimeAsync(1300);
  expect(s.last().items[1].coverage).toBe('pending');
  expect(s.last().deviations).toHaveLength(1);
  expect(parsePresentation(s.last()).deviations?.[0].citation.text).toBe(
    'Phí dịch vụ 100 nghìn đồng.',
  );
  s.pipeline.onFinal('Tôi xin sửa lại, phí là 100 nghìn.');
  await vi.advanceTimersByTimeAsync(1300);
  expect(s.last().deviations?.[0].resolvedBy?.text).toContain('xin sửa lại');
  s.pipeline.stop();
});
it('rejects invented deviation sources and ignores a late result after stop', async () => {
  vi.useFakeTimers();
  let resolve!: (s: string) => void;
  let lineId = '';
  const s = setup(async (messages) => {
    lineId = JSON.parse(messages[1].content).lines[0].id;
    return new Promise((r) => (resolve = r));
  });
  s.pipeline.onFinal('Một lời nói');
  await vi.advanceTimersByTimeAsync(1300);
  s.pipeline.stop();
  const count = s.events.length;
  resolve(
    JSON.stringify({
      items: [],
      deviations: [{ lineId, chunkId: 'd1234#1', sourceQuote: 'Nguồn bịa', note: 'Sai' }],
    }),
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(s.events).toHaveLength(count);
});
