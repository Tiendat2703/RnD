import { describe, expect, it, vi } from 'vitest';
import type { Source } from '../../shared/types';
import { formatChatMessages, parseResearch, research } from './research';

const allowed: Source[] = [
  { title: 'Trang A', url: 'https://a.example/x', text: 'aaa' },
  { title: 'Trang B', url: 'https://b.example/y', text: 'bbb' },
];
const signal = new AbortController().signal;

describe('parseResearch', () => {
  it('drops invented urls and takes the title from the search result', () => {
    const raw = JSON.stringify({
      summary: 'Tóm tắt',
      sources: [
        { url: 'https://a.example/x', reason: 'Chính thức' },
        { url: 'https://bia.example/z', reason: 'Bịa' },
      ],
    });
    const r = parseResearch(raw, allowed, 'Giá');
    expect(r?.sources).toEqual([
      { title: 'Trang A', url: 'https://a.example/x', reason: 'Chính thức' },
    ]);
  });

  it('returns null when no source survives', () => {
    const raw = '{"summary":"s","sources":[{"url":"https://nope","reason":"r"}]}';
    expect(parseResearch(raw, allowed, 'Giá')).toBeNull();
  });

  it('reads fenced JSON', () => {
    const raw =
      '```json\n{"summary":"s","sources":[{"url":"https://b.example/y","reason":"r"}]}\n```';
    expect(parseResearch(raw, allowed, 'Giá')?.sources[0].title).toBe('Trang B');
  });
});

describe('research', () => {
  const topic = { topic: 'Giá', keywords: [], query: 'giá saas' };

  it('searches with the topic query and passes the same signal to chat', async () => {
    const search = vi.fn(async () => allowed);
    const chat = vi.fn(
      async () => '{"summary":"s","sources":[{"url":"https://a.example/x","reason":"r"}]}',
    );
    const r = await research(topic, { search, chat }, signal);
    expect(search).toHaveBeenCalledWith('giá saas', signal);
    expect((chat.mock.calls[0] as unknown[])[1]).toBe(signal);
    expect(r?.sources).toHaveLength(1);
  });

  it('returns null without calling chat when search is empty', async () => {
    const chat = vi.fn(async () => '');
    const r = await research(topic, { search: async () => [], chat }, signal);
    expect(r).toBeNull();
    expect(chat).not.toHaveBeenCalled();
  });
});

describe('formatChatMessages', () => {
  const result = {
    topic: 'Giá SME',
    summary: 'Tóm tắt ngắn',
    sources: [
      { title: 'Trang A', url: 'https://a.example/x', reason: 'Chính thức' },
      { title: 'Trang B', url: 'https://b.example/y', reason: 'Độc lập' },
    ],
  };

  it('formats header and per-source messages', () => {
    expect(formatChatMessages(result)).toEqual([
      'MeetMate: Chủ đề: Giá SME\nTóm tắt ngắn',
      'MeetMate: [1/2] Trang A\nhttps://a.example/x\nVì sao chọn: Chính thức',
      'MeetMate: [2/2] Trang B\nhttps://b.example/y\nVì sao chọn: Độc lập',
    ]);
  });

  it('keeps every message within maxChars and never cuts the url', () => {
    const long = {
      topic: 'Chủ đề rất dài '.repeat(10),
      summary: 'Tóm tắt dài '.repeat(30),
      sources: [
        { title: 'Tiêu đề dài '.repeat(10), url: 'https://a.example/x', reason: 'Lý do '.repeat(40) },
      ],
    };
    const out = formatChatMessages(long, 120);
    for (const m of out) expect(m.length).toBeLessThanOrEqual(120);
    expect(out[1]).toContain('https://a.example/x');
    expect(out[0].endsWith('…')).toBe(true);
    expect(out[1].endsWith('…')).toBe(true);
  });
});
