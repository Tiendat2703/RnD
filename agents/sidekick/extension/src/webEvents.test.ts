import { describe, expect, it } from 'vitest';
import type { Card } from './messages';
import { citationOf, knowledgeCardOf, webEventsOf } from './webEvents';

const ctx = { startedAt: 1_000, maxSources: 4 };
const card = (over: Partial<Card>): Card => ({ id: 'c', at: 3_000, kind: 'answer', text: 't', chat: 'off', ...over });

describe('webEvents', () => {
  it('tách nguồn "tệp, trang" thành tài liệu và vị trí; nguồn đến từ đoạn tài liệu, không từ model', () => {
    expect(citationOf(card({ source: 'hop-dong, v2.pdf, tr. 3', quote: 'x' }))).toEqual([{ doc: 'hop-dong, v2.pdf', locator: 'tr. 3', excerpt: 'x' }]);
    expect(citationOf(card({}))).toEqual([]);
  });

  it('chỉ gán trạng thái mà bước đối chiếu thật sự quyết định được', () => {
    expect(knowledgeCardOf(card({ kind: 'contradiction' }), ctx)).toMatchObject({ kind: 'claim', status: 'contradicted', atMs: 2_000 });
    expect(knowledgeCardOf(card({ kind: 'not_in_doc', mode: 'auto' }), ctx)).toMatchObject({ kind: 'claim', status: 'insufficient' });
    // hỏi MeetMate mà tài liệu không có: là câu hỏi, không phải nhận định
    expect(knowledgeCardOf(card({ kind: 'not_in_doc', mode: 'ask' }), ctx)).toMatchObject({ kind: 'question', status: null });
    expect(knowledgeCardOf(card({ kind: 'answer' }), ctx)).toMatchObject({ kind: 'question', status: null });
    expect(knowledgeCardOf(card({ kind: 'research' }), ctx)).toBeNull();
  });

  it('câu nói một phần thì không có gì để lưu; thông báo lỗi thành sự kiện lỗi', () => {
    expect(webEventsOf({ kind: 'partial', text: 'đang nói' }, ctx, () => 'l')).toEqual([]);
    expect(webEventsOf({ kind: 'notice', level: 'info', message: 'i' }, ctx, () => 'l')).toEqual([]);
    expect(webEventsOf({ kind: 'notice', level: 'error', message: 'e' }, ctx, () => 'l')).toEqual([{ type: 'error', message: 'e' }]);
  });
});
