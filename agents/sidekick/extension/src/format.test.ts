import { describe, expect, it } from 'vitest';
import type { Finding } from './doccheck';
import type { Chunk } from './docs/chunk';
import { formatFinding, shouldPost } from './format';

const chunk: Chunk = { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 4, text: '' };
const base: Finding = {
  kind: 'contradiction', mode: 'auto', utterance: 'phí bảo trì là 15 triệu', chunk,
  text: 'Tài liệu ghi phí bảo trì là 12 triệu mỗi tháng.', quote: 'phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng',
};

describe('formatFinding', () => {
  it('formats a contradiction with what was said, the correction and the citation', () => {
    expect(formatFinding(base)).toBe(
      'MeetMate: ⚠️ Có thể chưa khớp tài liệu: “phí bảo trì là 15 triệu”\n'
      + 'Tài liệu ghi phí bảo trì là 12 triệu mỗi tháng.\n'
      + '📄 hop-dong.pdf, tr. 3–4: “phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng”',
    );
  });

  it('formats answers with a citation and not_in_doc without one', () => {
    expect(formatFinding({ ...base, kind: 'answer', text: '12 triệu mỗi tháng.' })).toMatch(/^MeetMate: 12 triệu mỗi tháng\.\n📄 hop-dong\.pdf/);
    expect(formatFinding({ ...base, kind: 'not_in_doc', mode: 'ask', chunk: null, quote: '', text: 'Tài liệu không đề cập.' }))
      .toBe('MeetMate: Tài liệu không đề cập.');
  });

  it('fits the chat limit, shortening the quote before the correction', () => {
    const long: Finding = { ...base, quote: 'q'.repeat(400), utterance: 'u'.repeat(200) };
    const out = formatFinding(long, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out).toContain(base.text);
    expect(out).toContain('…');
  });

  it('still fits when even the text is too long', () => {
    expect(formatFinding({ ...base, text: 't'.repeat(600) }, 200).length).toBeLessThanOrEqual(200);
  });
});

describe('shouldPost', () => {
  it('keeps unprompted not_in_doc notes out of the chat', () => {
    expect(shouldPost(base)).toBe(true);
    expect(shouldPost({ ...base, kind: 'answer' })).toBe(true);
    expect(shouldPost({ ...base, kind: 'not_in_doc', mode: 'auto' })).toBe(false);
    expect(shouldPost({ ...base, kind: 'not_in_doc', mode: 'ask' })).toBe(true);
  });
});
