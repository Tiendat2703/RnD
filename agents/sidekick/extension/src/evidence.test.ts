import { describe, expect, it } from 'vitest';
import { memoryOf, reportMarkdown, stampOf, statusCounts, type KnowledgeCard } from '../../../../lib/evidence';
import { applyEvent, newSession } from './sessionStore';

const card = (over: Partial<KnowledgeCard>): KnowledgeCard => ({
  id: 'c',
  kind: 'claim',
  atMs: 0,
  quote: 'q',
  summary: 's',
  status: 'supported',
  citations: [],
  ...over,
});

const cards = [
  card({ id: 'a', status: 'supported', summary: 'Khớp tài liệu.' }),
  card({ id: 'b', status: 'contradicted', summary: 'Trái tài liệu.' }),
  card({ id: 'c', status: 'insufficient', summary: 'Không có căn cứ.' }),
];

describe('Knowledge Card (kiểu dữ liệu và hàm thuần)', () => {
  it('đếm theo trạng thái bằng chứng', () => {
    expect(statusCounts(cards)).toEqual({ supported: 1, partial: 0, contradicted: 1, insufficient: 1 });
  });

  it('báo cáo đặt mâu thuẫn trước được ủng hộ', () => {
    const md = reportMarkdown('Họp thử', cards);
    expect(md.indexOf('Mâu thuẫn')).toBeLessThan(md.indexOf('Được ủng hộ'));
  });

  it('nhận định chưa được ủng hộ là việc còn mở', () => {
    expect(memoryOf(cards).open.map((c) => c.status)).toEqual(['contradicted', 'insufficient']);
  });

  it('stampOf: mm:ss từ ms', () => {
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
