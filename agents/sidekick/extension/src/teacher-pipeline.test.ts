import { describe, expect, it, vi } from 'vitest';
import { buildLibrary } from './doccheck';
import type { Chat } from './llm';
import type { PanelEvent } from './messages';
import { DEFAULT_SETTINGS } from './messages';
import { createTeacherPipeline, formatTeacherChat } from './teacher-pipeline';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const chunk = { id: 'slide#1', docId: 'slide', docName: 'OOP.pptx', page: 1, pageEnd: 1, text: 'Đóng gói che giấu dữ liệu và cung cấp phương thức truy cập.' };
describe('Teacher in extension', () => {
  it('waits for the keyword and teaches from session documents without running Assistant checks', async () => {
    const events: PanelEvent[] = []; const post = vi.fn();
    const chat = vi.fn(async () => JSON.stringify({ text: 'Đóng gói giúp kiểm soát dữ liệu. Ví dụ: dùng getter.', citations: [
      { chunkId: chunk.id, quote: 'Đóng gói che giấu dữ liệu' }, { chunkId: chunk.id, quote: 'Một câu không có trong slide' },
    ] }));
    const pipeline = createTeacherPipeline({ chat, library: () => buildLibrary([chunk]), search: null,
      settings: () => DEFAULT_SETTINGS, emit: event => events.push(event), post });
    pipeline.onFinal('Đóng gói là công khai toàn bộ dữ liệu.');
    pipeline.onFinal('Giảng giúp mình bài này.');
    await flush(); expect(chat).not.toHaveBeenCalled();
    pipeline.onFinal('Trợ lý, giảng slide này.'); await flush();
    expect(chat).toHaveBeenCalledTimes(1);
    const messages = chat.mock.calls[0] as unknown as [ { content: string }[] ];
    // The model contract is a teaching request, rather than the Assistant's document check.
    expect(JSON.parse(messages[0][1].content)).toMatchObject({ action: 'teach', documents: [{ document: 'OOP.pptx', location: 'Slide 1' }] });
    expect(events.find(event => event.kind === 'card')).toMatchObject({ card: { kind: 'lesson', source: 'OOP.pptx, Slide 1', quote: 'Đóng gói che giấu dữ liệu' } });
    expect(post).toHaveBeenCalledOnce(); pipeline.stop();
  });
  it.each([['ra bài tập về đóng gói', 'exercises'], ['giải bài tập số hai', 'solve'], ['giải thích tính kế thừa', 'ask']])('routes %s to %s', async (question, action) => {
    let payload: { action?: string } = {};
    const pipeline = createTeacherPipeline({ chat: async messages => { payload = JSON.parse(messages[1].content); return '{"text":"Bài học"}'; },
      library: () => null, search: null, settings: () => ({ ...DEFAULT_SETTINGS, postToChat: false }), emit: () => undefined, post: () => { throw new Error('Posting disabled'); } });
    pipeline.onFinal(`Trợ lý, ${question}`); await flush(); expect(payload.action).toBe(action); pipeline.stop();
  });
  it('searches only for a research request and keeps only returned URLs', async () => {
    const search = vi.fn(async () => [{ title: 'Giáo trình', url: 'https://example.edu/oop', text: 'OOP' }]);
    const events: PanelEvent[] = [];
    const pipeline = createTeacherPipeline({ chat: async () => '{"text":"Nguồn học OOP","webUrls":["https://example.edu/oop","https://fake.example"]}',
      library: () => null, search, settings: () => DEFAULT_SETTINGS, emit: e => events.push(e), post: () => undefined });
    pipeline.onFinal('Trợ lý, tìm tài liệu về OOP'); await flush(); expect(search).toHaveBeenCalledOnce();
    expect(events.find(e => e.kind === 'card')).toMatchObject({ card: { links: [{ url: 'https://example.edu/oop' }] } }); pipeline.stop();
  });
  it('preserves a long lesson across Meet-sized posts', () => {
    const text = 'Giải thích từng bước bằng ví dụ dễ hiểu. '.repeat(90).trim();
    const messages = formatTeacherChat(text);
    expect(messages.length).toBeGreaterThan(1); expect(messages.every(message => message.length <= 450)).toBe(true);
    expect(messages.map(message => message.slice(message.indexOf('\n') + 1)).join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });

  it('automatically regenerates invalid JSON containing unescaped math before publishing', async () => {
    const events: PanelEvent[] = []; const post = vi.fn();
    const mathChunk = { ...chunk, docName: 'Đạo hàm.pdf', text: 'Đạo hàm của x² là 2x.' };
    const chat = vi.fn<Chat>()
      .mockResolvedValueOnce(String.raw`{"text":"Biến \(x\), đạo hàm \frac{dy}{dx}.","citations":[]}`)
      .mockResolvedValueOnce(JSON.stringify({ text: "Đạo hàm của x² là 2x; ví dụ tại x = 3 thì y' = 6.", citations: [
        { chunkId: mathChunk.id, quote: mathChunk.text },
      ] }));
    const pipeline = createTeacherPipeline({ chat, library: () => buildLibrary([mathChunk]), search: null,
      settings: () => DEFAULT_SETTINGS, emit: e => events.push(e), post });
    pipeline.onFinal('Trợ lý, giảng bài đạo hàm'); await flush();
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls.every(call => call[2]?.json === true)).toBe(true);
    expect(chat.mock.calls[1][0][1]).toEqual(chat.mock.calls[0][0][1]);
    expect(events.filter(e => e.kind === 'card')).toHaveLength(1);
    expect(events.some(e => e.kind === 'notice' && e.level === 'error')).toBe(false);
    expect(post).toHaveBeenCalledOnce();
    expect(post.mock.calls[0][1].join(' ')).toContain("y' = 6");
    pipeline.stop();
  });

  it.each(['', '{"text":', '{"text":"  "}', '{"text":42}', '{"answer":"Bài học"}', JSON.stringify({ text: 'a'.repeat(10_001) })])('stops after one retry for invalid or incomplete answers (%#)', async raw => {
    const events: PanelEvent[] = []; const post = vi.fn();
    const chat = vi.fn<Chat>().mockResolvedValue(raw);
    const pipeline = createTeacherPipeline({ chat, library: () => buildLibrary([chunk]), search: null,
      settings: () => DEFAULT_SETTINGS, emit: e => events.push(e), post });
    pipeline.onFinal('Trợ lý, giảng bài này'); await flush();
    expect(chat).toHaveBeenCalledTimes(2);
    expect(events.some(e => e.kind === 'notice' && e.level === 'error' && e.message.includes('lỗi định dạng'))).toBe(true);
    expect(events.some(e => e.kind === 'card')).toBe(false);
    expect(post).not.toHaveBeenCalled();
    pipeline.stop();
  });

  it('does not publish a regenerated answer after listening stops', async () => {
    const events: PanelEvent[] = []; const post = vi.fn();
    let release!: (text: string) => void;
    const chat = vi.fn<Chat>().mockResolvedValueOnce('{"text":').mockImplementationOnce(async () => new Promise(resolve => { release = resolve; }));
    const pipeline = createTeacherPipeline({ chat, library: () => null, search: null,
      settings: () => DEFAULT_SETTINGS, emit: e => events.push(e), post });
    pipeline.onFinal('Trợ lý, giảng bài đạo hàm'); await flush();
    expect(chat).toHaveBeenCalledTimes(2);
    pipeline.stop();
    expect(chat.mock.calls[1][1].aborted).toBe(true);
    release('{"text":"Bài giảng"}'); await flush();
    expect(events.some(e => e.kind === 'card')).toBe(false); expect(post).not.toHaveBeenCalled();
  });
});
