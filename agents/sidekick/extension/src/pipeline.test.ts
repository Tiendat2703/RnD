import { describe, expect, it } from 'vitest';
import { buildLibrary } from './doccheck';
import type { Chunk } from './docs/chunk';
import type { ChatMessage } from './llm';
import { DEFAULT_SETTINGS, type PanelEvent, type Settings } from './messages';
import { createPipeline } from './pipeline';
import { EMPTY_VIEW, reduce } from './view';

const chunk: Chunk = { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 3, text: 'phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng' };
const lib = buildLibrary([chunk]);
const flush = () => new Promise(r => setTimeout(r, 0));

function setup(settings: Settings = DEFAULT_SETTINGS, reply = '{"items":[]}') {
  const events: PanelEvent[] = [];
  const posts: { cardId: string; messages: string[] }[] = [];
  const prompts: ChatMessage[][] = [];
  let id = 0;
  const p = createPipeline({
    chat: async messages => { prompts.push(messages); return reply; },
    library: () => lib,
    search: null,
    settings: () => settings,
    emit: e => events.push(e),
    post: (cardId, messages) => posts.push({ cardId, messages }),
    now: () => 1_000,
    newId: () => `c${++id}`,
  });
  return { p, events, posts, prompts };
}

const contradiction = JSON.stringify({ items: [{
  kind: 'contradiction', utterance: 'phí bảo trì 15 triệu', chunkId: 'hd#4',
  quote: 'phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng', text: 'Tài liệu ghi 12 triệu mỗi tháng.',
}] });

describe('createPipeline', () => {
  it('turns a contradicting line into a card and one chat message', async () => {
    const s = setup(DEFAULT_SETTINGS, contradiction);
    s.p.onFinal('Theo hợp đồng phí bảo trì là 15.000.000 một tháng.');
    await flush();
    const card = s.events.find(e => e.kind === 'card');
    expect(card).toMatchObject({ card: { id: 'c1', kind: 'contradiction', source: 'hop-dong.pdf, tr. 3', chat: 'pending' } });
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0].messages[0]).toMatch(/^MeetMate: ⚠️/);
  });

  it('shows cards without posting when chat posting is off', async () => {
    const s = setup({ postToChat: false, webResearch: false }, contradiction);
    s.p.onFinal('Theo hợp đồng phí bảo trì là 15.000.000 một tháng.');
    await flush();
    expect(s.events.find(e => e.kind === 'card')).toMatchObject({ card: { chat: 'off' } });
    expect(s.posts).toEqual([]);
  });

  it('drops a sentence heard twice and forwards partials untouched', async () => {
    const s = setup();
    s.p.onPartial('Theo hợp');
    s.p.onFinal('Đội mình có 6 người thôi.');
    s.p.onFinal('đội mình có 6 người thôi');
    await flush();
    expect(s.events.filter(e => e.kind === 'final')).toHaveLength(1);
    expect(s.events[0]).toEqual({ kind: 'partial', text: 'Theo hợp' });
    expect(s.prompts).toHaveLength(1);
  });

  it('reports model failures as notices, never as chat messages', async () => {
    const events: PanelEvent[] = [];
    const posts: unknown[] = [];
    const p = createPipeline({
      chat: async () => { throw new Error('Blaze LLM lỗi HTTP 402'); },
      library: () => lib, search: null, settings: () => DEFAULT_SETTINGS,
      emit: e => events.push(e), post: (...a) => posts.push(a),
    });
    p.onFinal('Đội mình có 6 người thôi.');
    await flush();
    expect(events.at(-1)).toMatchObject({ kind: 'notice', level: 'error', message: 'Đối chiếu tài liệu: Blaze LLM lỗi HTTP 402' });
    expect(posts).toEqual([]);
  });
});

describe('repeats', () => {
  it('show a repeated contradiction in the panel without posting it again', async () => {
    const s = setup(DEFAULT_SETTINGS, contradiction);
    s.p.onFinal('Theo hợp đồng phí bảo trì là 15.000.000 một tháng.');
    await flush();
    s.p.onFinal('Mình nhắc lại, phí bảo trì 15.000.000 một tháng nhé.');
    await flush();
    const cards = s.events.filter(e => e.kind === 'card').map(e => (e as Extract<PanelEvent, { kind: 'card' }>).card);
    expect(cards.map(c => [c.repeat ?? false, c.chat])).toEqual([[false, 'pending'], [true, 'off']]);
    expect(s.posts).toHaveLength(1);
  });
});

describe('reduce', () => {
  it('keeps transcript, newest cards first and chat outcomes', () => {
    const card = { id: 'a', at: 1, kind: 'answer' as const, text: 'x', chat: 'pending' as const };
    let v = reduce(EMPTY_VIEW, { kind: 'final', text: 'xin chào', at: 1 });
    v = reduce(v, { kind: 'card', card });
    v = reduce(v, { kind: 'card', card: { ...card, id: 'b' } });
    v = reduce(v, { kind: 'chat', cardId: 'a', status: 'failed', detail: 'Không thấy khung chat' });
    v = reduce(v, { kind: 'partial', text: 'ignored' });
    expect(v.transcript).toEqual([{ text: 'xin chào', at: 1 }]);
    expect(v.cards.map(c => `${c.id}:${c.chat}`)).toEqual(['b:pending', 'a:failed']);
    expect(v.cards[1].chatError).toBe('Không thấy khung chat');
  });
});
