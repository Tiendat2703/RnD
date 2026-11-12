import { describe, expect, it, vi } from 'vitest';
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

describe('question source routing', () => {
  function routingSetup(options: { docs?: boolean; web?: boolean; key?: boolean; route?: 'web' | 'docs' | 'clarify' } = {}) {
    const events: PanelEvent[] = [];
    const posts: string[][] = [];
    const search = vi.fn(async (_query: string, _signal: AbortSignal) => [{ title: 'Official source', url: 'https://example.org/source', text: 'Verified information' }]);
    const chat = vi.fn(async (messages: ChatMessage[]) => {
      if (messages[0].content.includes('Phân loại NGUỒN')) {
        return JSON.stringify({ source: options.route ?? 'web', query: 'latest question query' });
      }
      if (messages[0].content.includes('"items"')) {
        return JSON.stringify({ items: [{ kind: 'answer', utterance: 'Phí bảo trì bao nhiêu?',
          chunkId: chunk.id, quote: chunk.text, text: '12 triệu đồng mỗi tháng.' }] });
      }
      return JSON.stringify({ summary: 'Web answer', sources: [{ url: 'https://example.org/source', reason: 'Official source' }] });
    });
    const p = createPipeline({
      chat, library: () => options.docs ? lib : null,
      search: options.key === false ? null : search,
      settings: () => ({ postToChat: true, webResearch: options.web !== false }),
      emit: e => events.push(e), post: (_id, messages) => posts.push(messages),
    });
    return { p, events, posts, search, chat };
  }

  it.each([
    'MeetMate ơi, hãy cho tôi biết Ngũ Hành Sơn nằm ở đâu?',
    'Cho tôi biết Đại học Duy Tân nằm ở đâu.',
    'MeetMate ơi, cách truy cập vào cloud như thế nào?',
  ])('researches a public question immediately without documents: %s', async question => {
    const s = routingSetup();
    s.p.onFinal(question);
    await flush();
    expect(s.search).toHaveBeenCalledWith('latest question query', expect.any(AbortSignal));
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'research', text: 'Web answer' } }]);
    expect(s.posts).toHaveLength(1);
    expect(s.chat).toHaveBeenCalledTimes(2); // routing and research, never document check
    s.p.stop();
  });

  it('still uses the web for a public question when an unrelated document is loaded', async () => {
    const s = routingSetup({ docs: true });
    s.p.onFinal('MeetMate ơi, Đại học Duy Tân ở đâu?');
    await flush();
    expect(s.search).toHaveBeenCalledTimes(1);
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'research' } }]);
    s.p.stop();
  });

  it.each(['MeetMate ơi, phí bảo trì trong hợp đồng bao nhiêu?', 'Phí bảo trì bao nhiêu?'])(
    'answers document questions with a citation and never searches private facts: %s', async question => {
      const s = routingSetup({ docs: true, route: 'docs' });
      s.p.onFinal(question);
      await flush();
      expect(s.search).not.toHaveBeenCalled();
      expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: {
        kind: 'answer', text: '12 triệu đồng mỗi tháng.', source: 'hop-dong.pdf, tr. 3',
      } }]);
      s.p.stop();
    },
  );

  it('reports missing files only for a question routed to documents', async () => {
    const s = routingSetup({ route: 'docs' });
    s.p.onFinal('MeetMate ơi, tài liệu tôi tải lên ghi phí bảo trì bao nhiêu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: {
      kind: 'not_in_doc', text: 'Chưa có tài liệu nào được tải lên MeetMate.',
    } }]);
    s.p.stop();
  });

  it.each([{ web: false }, { key: false }])('explains unavailable web research without falling back to documents: %j', async options => {
    const s = routingSetup({ docs: true, ...options });
    s.p.onFinal('MeetMate ơi, Ngũ Hành Sơn nằm ở đâu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toEqual([]);
    expect(s.events.at(-1)).toMatchObject({ kind: 'notice', message: expect.stringContaining('cần tìm trên web') });
    s.p.stop();
  });

  it('asks for context instead of inventing a document miss', async () => {
    const s = routingSetup({ route: 'clarify' });
    s.p.onFinal('MeetMate ơi, cái này ở đâu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toEqual([]);
    expect(s.events.at(-1)).toMatchObject({ kind: 'notice', message: expect.stringContaining('nói rõ') });
    s.p.stop();
  });

  it('handles a question following a standalone wake word through the same router', async () => {
    const s = routingSetup();
    s.p.onFinal('MeetMate ơi.');
    s.p.onFinal('Ngũ Hành Sơn nằm ở đâu?');
    await flush();
    expect(s.search).toHaveBeenCalledTimes(1);
    s.p.stop();
  });

  it('aborts web research when the pipeline stops and discards a late result', async () => {
    const s = routingSetup();
    let complete!: (sources: { title: string; url: string; text: string }[]) => void;
    s.search.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    s.p.onFinal('MeetMate ơi, Ngũ Hành Sơn ở đâu?');
    await flush();
    const signal = s.search.mock.calls[0]?.[1] as AbortSignal | undefined;
    s.p.stop();
    expect(signal?.aborted).toBe(true);
    complete([{ title: 'Source', url: 'https://example.org/source', text: 'Late result' }]);
    await flush();
    expect(s.posts).toEqual([]);
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
