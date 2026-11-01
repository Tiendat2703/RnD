import { describe, expect, it } from 'vitest';
import type { ChatMessage } from './llm';
import { detectTopic, parseTopic } from './topic';

const decision = { topic: 'Chọn model STT', keywords: ['STT', 'tiếng Việt'], query: 'Vietnamese speech to text API', changed: true };

describe('parseTopic', () => {
  it('reads plain and fenced JSON', () => {
    expect(parseTopic(JSON.stringify(decision))).toEqual(decision);
    expect(parseTopic('```json\n' + JSON.stringify(decision) + '\n```')).toEqual(decision);
  });

  it('returns null for non-JSON', () => {
    expect(parseTopic('xin lỗi')).toBeNull();
  });

  it('keeps an empty topic as small talk', () => {
    expect(parseTopic('{"topic":"","keywords":[],"query":"","changed":false}'))
      .toEqual({ topic: '', keywords: [], query: '', changed: false });
  });

  it('rejects a non-string topic', () => {
    expect(parseTopic('{"topic":42,"keywords":[],"query":"q","changed":true}')).toBeNull();
  });

  it('rejects a topic without a query', () => {
    expect(parseTopic('{"topic":"AI","keywords":[],"query":"","changed":true}')).toBeNull();
  });

  it('keeps at most 8 string keywords', () => {
    const raw = JSON.stringify({ ...decision, keywords: [1, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] });
    expect(parseTopic(raw)?.keywords).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });
});

describe('detectTopic', () => {
  it('sends a system and a user message with the current topic', async () => {
    let sent: ChatMessage[] = [];
    const result = await detectTopic(async messages => {
      sent = messages;
      return JSON.stringify(decision);
    }, null, 'Mình nên dùng STT nào?', new AbortController().signal);
    expect(result).toEqual(decision);
    expect(sent).toHaveLength(2);
    expect(sent[0].role).toBe('system');
    expect(sent[1].content).toContain('Chủ đề hiện tại: chưa có');
    expect(sent[1].content).toContain('Mình nên dùng STT nào?');
  });
});
