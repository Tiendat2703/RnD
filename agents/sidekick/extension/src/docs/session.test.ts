import { describe, expect, it } from 'vitest';
import { DOC_LIMITS } from '../../../../../lib/documents';
import { mergeDocs, storedDocsOf } from './session';

const chunk = (docId: string, n: number, text = 'Ngân sách 200 triệu.') => ({ id: `${docId}#${n}`, docId: 'x', docName: 'x', page: n, pageEnd: n, text });
const doc = (id: string, chunks = [chunk(id, 1), chunk(id, 2)]) => ({ id, name: `${id}.pdf`, pageCount: 2, chunks });

describe('storedDocsOf', () => {
  it('builds library records; citations take the document name, not what the chunk says', () => {
    const [d] = storedDocsOf([doc('dabc1')], 5);
    expect(d).toMatchObject({ id: 'dabc1', name: 'dabc1.pdf', pageCount: 2, chars: 40, addedAt: 5 });
    expect(d.chunks.every(c => c.docId === 'dabc1' && c.docName === 'dabc1.pdf')).toBe(true);
  });

  it('drops anything malformed rather than trusting the page', () => {
    expect(storedDocsOf('nope')).toEqual([]);
    expect(storedDocsOf([{ ...doc('dabc1'), id: '../x' }])).toEqual([]);
    expect(storedDocsOf([doc('dabc1', [{ ...chunk('dabc1', 1), page: -1 }])])).toEqual([]);
    // a chunk claiming another document's id is not this document's
    expect(storedDocsOf([doc('dabc1', [chunk('dother', 1), chunk('dabc1', 2)])])[0].chunks).toHaveLength(1);
    expect(storedDocsOf([doc('dabc1'), doc('dabc1')])).toHaveLength(1);
  });

  it('caps the number of documents and the total size of a session', () => {
    expect(storedDocsOf(Array.from({ length: 30 }, (_, i) => doc(`dabc${i}`)))).toHaveLength(DOC_LIMITS.maxPerSession);
    const big = 'a'.repeat(DOC_LIMITS.maxSessionChars - 10);
    const docs = storedDocsOf([doc('dbig1', [chunk('dbig1', 1, big)]), doc('dabc1')]);
    expect(docs.map(d => d.id)).toEqual(['dbig1']);
  });
});

describe('mergeDocs', () => {
  const [a, b] = storedDocsOf([doc('dabc1'), doc('dxyz2')]);
  it('thêm tài liệu mới, bỏ qua tài liệu trùng id', () => {
    expect(mergeDocs([a], [a, b])).toEqual({ docs: [a, b], added: 1 });
    expect(mergeDocs([a, b], [b])).toEqual({ docs: [a, b], added: 0 });
  });
  it('giữ giới hạn số tài liệu và tổng ký tự của phiên', () => {
    const full = storedDocsOf(Array.from({ length: DOC_LIMITS.maxPerSession }, (_, i) => doc(`dabc${i}`)));
    expect(mergeDocs(full, [b]).added).toBe(0);
    const big = storedDocsOf([doc('dbig1', [chunk('dbig1', 1, 'a'.repeat(DOC_LIMITS.maxSessionChars - 10))])]);
    expect(mergeDocs(big, [b]).added).toBe(0);
  });
});
