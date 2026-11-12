import { describe, expect, it } from 'vitest';
import { overflow, summaryOf } from './drafts';

describe('drafts', () => {
  it('drops the oldest web sessions beyond the limit', () => {
    const records = [3, 1, 4, 2].map(n => ({ id: `w${n}`, preparedAt: n }));
    expect(overflow(records, 2)).toEqual(['w2', 'w1']);
    expect(overflow(records, 10)).toEqual([]);
  });

  it('summarises a session without document content', () => {
    const s = summaryOf({
      id: 'w1', preparedAt: 5,
      draft: { id: 'w1', title: 'Họp', kind: 'khac', sources: 4, autoPost: true },
      docs: [{ id: 'dabc1', name: 'a.pdf', size: 0, pageCount: 1, chars: 3, chunks: [], addedAt: 5 }],
    });
    expect(s).toEqual({ id: 'w1', title: 'Họp', kind: 'khac', docCount: 1, docNames: ['a.pdf'], preparedAt: 5 });
  });
});
