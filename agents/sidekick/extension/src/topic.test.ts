import { describe, expect, it, vi } from 'vitest';
import { detectTopic, parseTopic } from './topic';

const signal = new AbortController().signal;

describe('parseTopic', () => {
  it('reads plain and fenced JSON', () => {
    const json = '{"topic":"Giá","keywords":["a"],"query":"giá saas","changed":true}';
    expect(parseTopic(json)).toEqual({
      topic: 'Giá',
      keywords: ['a'],
      query: 'giá saas',
      changed: true,
    });
    expect(parseTopic('```json\n' + json + '\n```')?.topic).toBe('Giá');
  });

  it('returns null for non-JSON', () => {
    expect(parseTopic('xin lỗi')).toBeNull();
  });

  it('keeps an empty topic empty', () => {
    expect(parseTopic('{"topic":"","keywords":[],"query":"","changed":false}')?.topic).toBe('');
  });

  it('rejects a non-empty topic with no query', () => {
    expect(parseTopic('{"topic":"Giá","keywords":[],"changed":true}')).toBeNull();
  });

  it('caps keywords at 8 and drops non-strings', () => {
    const kw = JSON.stringify([1, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    const r = parseTopic(`{"topic":"T","keywords":${kw},"query":"q","changed":true}`);
    expect(r?.keywords).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });
});

describe('detectTopic', () => {
  it('sends system + user messages with the current topic placeholder', async () => {
    const chat = vi.fn(async () => '{"topic":"","keywords":[],"query":"","changed":false}');
    await detectTopic(chat, null, 'câu 1', signal);
    const messages = (chat.mock.calls[0] as unknown as [{ role: string; content: string }[]])[0];
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('Chủ đề hiện tại: chưa có');
    expect(messages[1].content).toContain('câu 1');
  });
});
