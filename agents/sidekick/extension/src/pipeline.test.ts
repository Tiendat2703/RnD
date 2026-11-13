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
/** the last event other than request progress (which always ends a request) */
const lastOf = (events: PanelEvent[]) => events.filter(e => e.kind !== 'progress').at(-1);

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

describe('createPipeline', () => {
  it('records ordinary speech without document checks or routing calls', async () => {
    const s = setup();
    s.p.onFinal('Theo hợp đồng phí bảo trì là 15.000.000 một tháng.');
    s.p.onFinal('Phí bảo trì bao nhiêu?');
    await flush();
    expect(s.events.filter(e => e.kind === 'final')).toHaveLength(2);
    expect(s.events.filter(e => e.kind === 'card')).toEqual([]);
    expect(s.prompts).toEqual([]);
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
    expect(s.prompts).toHaveLength(0);
  });

  it('reports model failures as notices, never as chat messages', async () => {
    const events: PanelEvent[] = [];
    const posts: unknown[] = [];
    const p = createPipeline({
      chat: async () => { throw new Error('Blaze LLM lỗi HTTP 402'); },
      library: () => lib, search: null, settings: () => DEFAULT_SETTINGS,
      emit: e => events.push(e), post: (...a) => posts.push(a),
    });
    p.onFinal('Trợ lý ơi, đội mình có mấy người?');
    await flush();
    expect(lastOf(events)).toMatchObject({ kind: 'notice', level: 'error', message: 'Đối chiếu tài liệu: Blaze LLM lỗi HTTP 402' });
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

  it('never routes or searches uninvoked speech, even with documents, Exa and web enabled', async () => {
    const s = routingSetup({ docs: true });
    for (const text of [
      'Ngũ Hành Sơn ở đâu?', 'Phí bảo trì trong hợp đồng bao nhiêu?',
      'Ngân sách dự án là 500 triệu.', 'Hãy tìm giúp tôi địa chỉ Đại học Duy Tân.',
      'MeetMate ơi, tìm trên mạng.', 'Mít mết ơi, xem trong tài liệu.',
    ]) s.p.onFinal(text);
    await flush();
    expect(s.events.filter(e => e.kind === 'final')).toHaveLength(6);
    expect(s.chat).not.toHaveBeenCalled();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.posts).toEqual([]);
    s.p.stop();
  });

  it.each([
    'Trợ lý ơi, hãy cho tôi biết Ngũ Hành Sơn nằm ở đâu?',
    'Trợ lý, cho tôi biết Đại học Duy Tân nằm ở đâu.',
    'Trợ lý ơi, cách truy cập vào cloud như thế nào?',
  ])('researches a public question immediately without documents: %s', async question => {
    const s = routingSetup();
    s.p.onFinal(question);
    await flush();
    expect(s.search).toHaveBeenCalledWith('latest question query', expect.any(AbortSignal));
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'research', text: 'Web answer' } }]);
    expect(s.posts).toHaveLength(1);
    expect(s.chat).toHaveBeenCalledTimes(2); // routing and research, never document check
    s.p.onFinal('Còn Đại học Duy Tân thì sao?');
    await flush();
    expect(s.chat).toHaveBeenCalledTimes(2); // one keyword authorizes one request
    s.p.stop();
  });

  it('still uses the web for a public question when an unrelated document is loaded', async () => {
    const s = routingSetup({ docs: true });
    s.p.onFinal('Trợ lý ơi, Đại học Duy Tân ở đâu?');
    await flush();
    expect(s.search).toHaveBeenCalledTimes(1);
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'research' } }]);
    s.p.stop();
  });

  it.each(['Trợ lý ơi, phí bảo trì trong hợp đồng bao nhiêu?', 'Trợ lý, phí bảo trì bao nhiêu?'])(
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
    s.p.onFinal('Trợ lý ơi, tài liệu tôi tải lên ghi phí bảo trì bao nhiêu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toMatchObject([{ card: {
      kind: 'not_in_doc', text: 'Chưa có tài liệu nào được tải lên MeetMate.',
    } }]);
    s.p.stop();
  });

  it.each([{ web: false }, { key: false }])('explains unavailable web research without falling back to documents: %j', async options => {
    const s = routingSetup({ docs: true, ...options });
    s.p.onFinal('Trợ lý ơi, Ngũ Hành Sơn nằm ở đâu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toEqual([]);
    expect(lastOf(s.events)).toMatchObject({ kind: 'notice', message: expect.stringContaining('cần tìm trên web') });
    s.p.stop();
  });

  it('asks for context instead of inventing a document miss', async () => {
    const s = routingSetup({ route: 'clarify' });
    s.p.onFinal('Trợ lý ơi, cái này ở đâu?');
    await flush();
    expect(s.search).not.toHaveBeenCalled();
    expect(s.events.filter(e => e.kind === 'card')).toEqual([]);
    expect(lastOf(s.events)).toMatchObject({ kind: 'notice', message: expect.stringContaining('nói rõ') });
    s.p.stop();
  });

  it('handles a question following a standalone wake word through the same router', async () => {
    const s = routingSetup();
    s.p.onFinal('Trợ lý ơi.');
    s.p.onFinal('Ngũ Hành Sơn nằm ở đâu?');
    await flush();
    expect(s.search).toHaveBeenCalledTimes(1);
    s.p.stop();
  });

  it('aborts web research when the pipeline stops and discards a late result', async () => {
    const s = routingSetup();
    let complete!: (sources: { title: string; url: string; text: string }[]) => void;
    s.search.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    s.p.onFinal('Trợ lý ơi, Ngũ Hành Sơn ở đâu?');
    await flush();
    const signal = s.search.mock.calls[0]?.[1] as AbortSignal | undefined;
    s.p.stop();
    expect(signal?.aborted).toBe(true);
    complete([{ title: 'Source', url: 'https://example.org/source', text: 'Late result' }]);
    await flush();
    expect(s.posts).toEqual([]);
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

describe('keyword requests feel fast', () => {
  const progressOf = (events: PanelEvent[]) => events.flatMap(e => (e.kind === 'progress' ? [e.step] : []));

  it('checks documents while routing, so a document answer needs no second round trip', async () => {
    const order: string[] = [];
    let routed!: (raw: string) => void;
    const chat = vi.fn((messages: ChatMessage[]) => {
      if (messages[0].content.includes('Phân loại NGUỒN')) {
        order.push('route');
        return new Promise<string>(resolve => { routed = resolve; });
      }
      order.push('docs');
      return Promise.resolve(JSON.stringify({ items: [{ kind: 'answer', utterance: 'phí', chunkId: chunk.id, quote: chunk.text, text: '12 triệu.' }] }));
    });
    const events: PanelEvent[] = [];
    const p = createPipeline({
      chat, library: () => lib, search: null, settings: () => DEFAULT_SETTINGS,
      emit: e => events.push(e), post: () => undefined,
    });
    p.onFinal('Trợ lý ơi, phí bảo trì bao nhiêu?');
    await flush();
    expect([...order].sort()).toEqual(['docs', 'route']); // both started before routing answered
    routed('{"source":"docs","query":""}');
    await flush();
    expect(chat).toHaveBeenCalledTimes(2);
    expect(events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'answer', text: '12 triệu.' } }]);
    expect(progressOf(events)).toEqual(['route', 'docs', null]);
  });

  it('cancels the early document check when the question goes to the web, and shows each step', async () => {
    const signals: AbortSignal[] = [];
    const chat = vi.fn((messages: ChatMessage[], signal: AbortSignal) => {
      if (messages[0].content.includes('Phân loại NGUỒN')) return Promise.resolve('{"source":"web","query":"Ngũ Hành Sơn"}');
      if (messages[0].content.includes('"items"')) {
        signals.push(signal);
        return new Promise<string>(() => undefined); // never answers: must not hold the request up
      }
      return Promise.resolve('{"summary":"Ở Đà Nẵng.","sources":[{"url":"https://a.vn","reason":"Chính thức"}]}');
    });
    const search = vi.fn(async () => [1, 2, 3, 4, 5].map(i => ({ title: `T${i}`, url: i === 1 ? 'https://a.vn' : `https://x${i}.vn`, text: 'x'.repeat(4000) })));
    const events: PanelEvent[] = [];
    const p = createPipeline({
      chat, library: () => lib, search, settings: () => DEFAULT_SETTINGS,
      emit: e => events.push(e), post: () => undefined,
    });
    p.onFinal('Trợ lý ơi, Ngũ Hành Sơn ở đâu?');
    await flush();
    await flush();
    expect(signals[0].aborted).toBe(true);
    expect(events.filter(e => e.kind === 'card')).toMatchObject([{ card: { kind: 'research', text: 'Ở Đà Nẵng.' } }]);
    expect(progressOf(events)).toEqual(['route', 'web', 'writing', null]);
    // the summary reads at most 3 sources of 1 500 characters
    const prompt = chat.mock.calls.at(-1)![0][1].content;
    expect(prompt).not.toContain('https://x4.vn');
    expect(prompt.match(/x{1500}/g)).toHaveLength(3);
    expect(prompt).not.toMatch(/x{1501}/);
  });

  it('keeps the request clock across steps and clears it when done', () => {
    let v = reduce(EMPTY_VIEW, { kind: 'progress', step: 'route', question: 'q' }, 10);
    v = reduce(v, { kind: 'progress', step: 'docs', question: 'q' }, 20);
    expect(v.progress).toEqual({ step: 'docs', question: 'q', at: 10 });
    v = reduce(v, { kind: 'progress', step: null, question: 'q' }, 30);
    expect(v.progress).toBeNull();
  });
});
