import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_LABEL,
  memoryOf,
  reportMarkdown,
  stampOf,
  statusCounts,
  type KnowledgeCard,
} from '../../../../lib/evidence';
import scenario from '../../../../mocks/meeting-claims.json';
import kb from '../../../../mocks/kb.json';
import { applyEvent, newSession } from './sessionStore';

const cards = scenario.cards as unknown as KnowledgeCard[];

describe('dữ liệu mẫu của Knowledge Card', () => {
  it('mỗi thẻ gắn với đúng một câu trong bản ghi', () => {
    const at = new Set(scenario.lines.map((l) => l.atMs));
    for (const c of cards) expect(at.has(c.atMs), c.id).toBe(true);
  });

  it('chỉ nhận định mới có trạng thái bằng chứng; phủ đủ bốn trạng thái', () => {
    for (const c of cards) expect(c.status !== null || c.error === true, c.id).toBe(c.kind === 'claim');
    const counts = statusCounts(cards);
    expect(counts).toEqual({ supported: 1, partial: 1, contradicted: 1, insufficient: 1 });
  });

  it('trích dẫn trỏ tới tài liệu có trong kho mẫu', () => {
    const titles = new Set(kb.docs.map((d) => d.title));
    for (const c of cards) for (const ci of c.citations) expect(titles.has(ci.doc), ci.doc).toBe(true);
  });

  it('"chưa đủ căn cứ" không kèm trích dẫn — hệ thống không suy đoán', () => {
    for (const c of cards.filter((x) => x.status === 'insufficient')) expect(c.citations).toHaveLength(0);
  });
});

describe('Session Context Memory', () => {
  it('tách quyết định, phụ thuộc, giả định; nhận định chưa được ủng hộ trọn vẹn là việc còn mở', () => {
    const m = memoryOf(cards);
    expect(m.decisions).toHaveLength(1);
    expect(m.dependencies).toHaveLength(1);
    expect(m.assumptions).toHaveLength(1);
    // mâu thuẫn đứng trước một phần, rồi chưa đủ căn cứ; "được ủng hộ" không phải việc còn mở
    expect(m.open.map((c) => c.status)).toEqual(['contradicted', 'partial', 'insufficient', null]);
    expect(m.open[3].error).toBe(true); // "Lỗi xử lý" là việc còn mở, không phải "chưa đủ căn cứ"
  });
});

describe('reportMarkdown', () => {
  const md = reportMarkdown('Họp thử', cards);

  it('dựng hoàn toàn từ các thẻ: có đủ nhãn trạng thái, quyết định và giả định', () => {
    for (const label of Object.values(EVIDENCE_LABEL)) expect(md).toContain(label);
    expect(md).toContain('## Quyết định');
    expect(md).toContain('## Giả định cần kiểm chứng tiếp');
    expect(md).toContain('Mỗi trang trả về 50 bản ghi.');
  });

  it('mâu thuẫn đứng trước được ủng hộ', () => {
    expect(md.indexOf('Mâu thuẫn')).toBeLessThan(md.indexOf('Được ủng hộ'));
  });
});

describe('stampOf', () => {
  it('mm:ss từ ms', () => {
    expect(stampOf(312000)).toBe('05:12');
  });
});

describe('sessionStore: thẻ trong phiên', () => {
  it('thêm thẻ một lần, không trùng id', () => {
    let s = newSession('s', 't', 'san-pham', 0);
    s = applyEvent(s, { type: 'card', card: cards[0] }, 1);
    s = applyEvent(s, { type: 'card', card: cards[0] }, 2);
    expect(s.cards).toHaveLength(1);
  });
});
