import { describe, expect, it } from 'vitest';
import type { Source } from '../../shared/types';
import { formatChatMessages, parseResearch, research, type ResearchResult } from './research';

const allowed: Source[] = [
  { title: 'Blaze STT docs', url: 'https://blaze.vn/docs/stt', text: 'Tài liệu STT' },
  { title: 'Benchmark', url: 'https://example.org/bench', text: 'Kết quả đo' },
];
const topic = { topic: 'STT tiếng Việt', keywords: ['STT'], query: 'Vietnamese STT' };
const reply = JSON.stringify({
  summary: 'Tóm tắt',
  sources: [
    { url: 'https://blaze.vn/docs/stt', reason: 'Tài liệu chính thức', title: 'Tiêu đề LLM bịa' },
    { url: 'https://invented.example/fake', reason: 'Bịa' },
  ],
});

describe('parseResearch', () => {
  it('drops URLs Exa did not return and takes titles from Exa', () => {
    expect(parseResearch(reply, allowed, 'STT tiếng Việt')).toEqual({
      topic: 'STT tiếng Việt',
      summary: 'Tóm tắt',
      sources: [{ title: 'Blaze STT docs', url: 'https://blaze.vn/docs/stt', reason: 'Tài liệu chính thức' }],
    });
  });

  it('reads fenced JSON', () => {
    expect(parseResearch('```json\n' + reply + '\n```', allowed, 't')?.sources).toHaveLength(1);
  });

  it('returns null when no allowed source remains', () => {
    const onlyFake = JSON.stringify({ summary: 'x', sources: [{ url: 'https://invented.example', reason: 'y' }] });
    expect(parseResearch(onlyFake, allowed, 't')).toBeNull();
  });
});

describe('research', () => {
  it('searches the topic query and passes the same signal to search and chat', async () => {
    const signal = new AbortController().signal;
    const seen: { query?: string; searchSignal?: AbortSignal; chatSignal?: AbortSignal } = {};
    const result = await research(topic, {
      search: async (query, s) => { seen.query = query; seen.searchSignal = s; return allowed; },
      chat: async (_messages, s) => { seen.chatSignal = s; return reply; },
    }, signal);
    expect(seen.query).toBe('Vietnamese STT');
    expect(seen.searchSignal).toBe(signal);
    expect(seen.chatSignal).toBe(signal);
    expect(result?.sources).toHaveLength(1);
  });

  it('skips the LLM when search finds nothing', async () => {
    let chatCalled = false;
    const result = await research(topic, {
      search: async () => [],
      chat: async () => { chatCalled = true; return reply; },
    }, new AbortController().signal);
    expect(result).toBeNull();
    expect(chatCalled).toBe(false);
  });
});

describe('formatChatMessages', () => {
  const result: ResearchResult = {
    topic: 'STT tiếng Việt',
    summary: 'Tóm tắt ngắn',
    sources: [
      { title: 'Blaze STT docs', url: 'https://blaze.vn/docs/stt', reason: 'Tài liệu chính thức' },
      { title: 'Benchmark', url: 'https://example.org/bench', reason: 'Đo độc lập' },
    ],
  };

  it('formats a topic message then one message per source', () => {
    expect(formatChatMessages(result)).toEqual([
      'MeetMate: Chủ đề: STT tiếng Việt\nTóm tắt ngắn',
      'MeetMate: [1/2] Blaze STT docs\nhttps://blaze.vn/docs/stt\nVì sao chọn: Tài liệu chính thức',
      'MeetMate: [2/2] Benchmark\nhttps://example.org/bench\nVì sao chọn: Đo độc lập',
    ]);
  });

  it('falls back to the bare URL, or drops the source, when fixed text exceeds maxChars', () => {
    const fits = `https://example.org/${'a'.repeat(90)}`;
    const tooLong = `https://example.org/${'b'.repeat(130)}`;
    const messages = formatChatMessages({
      topic: 't', summary: 's',
      sources: [{ title: 'x', url: fits, reason: 'r' }, { title: 'y', url: tooLong, reason: 'r' }],
    }, 120);
    expect(messages).toEqual(['MeetMate: Chủ đề: t\ns', `MeetMate: ${fits}`]);
  });

  it('keeps every message within maxChars without cutting URLs', () => {
    const long = 'rất dài '.repeat(50);
    const url = 'https://example.org/a-fairly-long-path/that-must-stay-whole';
    const messages = formatChatMessages({
      topic: long, summary: long, sources: [{ title: long, url, reason: long }],
    }, 120);
    for (const message of messages) expect(message.length).toBeLessThanOrEqual(120);
    expect(messages[1]).toContain(url);
    expect(messages[0].endsWith('…')).toBe(true);
    expect(messages[1].endsWith('…')).toBe(true);
  });
});
