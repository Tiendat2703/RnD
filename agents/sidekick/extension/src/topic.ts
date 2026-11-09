import type { Chat } from './llm';

export type Topic = { topic: string; keywords: string[]; query: string };
export type TopicDecision = Topic & { changed: boolean };

const SYSTEM =
  'Bạn đọc transcript cuộc họp tiếng Việt và xác định chủ đề chính ở phần gần nhất. ' +
  'Chỉ trả về một object JSON: {"topic": string, "keywords": string[], "query": string, "changed": boolean}. ' +
  'topic là cụm ngắn tiếng Việt; để rỗng nếu đang nói chuyện phiếm hoặc chưa rõ chủ đề. ' +
  'keywords tối đa 8 từ khóa. ' +
  'query là truy vấn tìm kiếm web ngắn, chọn tiếng Việt hoặc tiếng Anh tùy ngôn ngữ cho kết quả tốt hơn. ' +
  'changed là true nếu chủ đề khác chủ đề hiện tại.';

export function extractJson(raw: string): unknown | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseTopic(raw: string): TopicDecision | null {
  const obj = extractJson(raw) as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object') return null;
  const topic = typeof obj.topic === 'string' ? obj.topic.trim() : null;
  if (topic === null) return null;
  const keywords = Array.isArray(obj.keywords)
    ? obj.keywords.filter((k): k is string => typeof k === 'string').slice(0, 8)
    : [];
  const changed = obj.changed === true;
  if (topic === '') return { topic: '', keywords, query: '', changed };
  const query = typeof obj.query === 'string' ? obj.query.trim() : '';
  if (!query) return null;
  return { topic, keywords, query, changed };
}

export async function detectTopic(
  chat: Chat,
  current: Topic | null,
  transcript: string,
  signal: AbortSignal,
): Promise<TopicDecision | null> {
  const raw = await chat(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Chủ đề hiện tại: ${current?.topic ?? 'chưa có'}\n\nTranscript:\n${transcript}`,
      },
    ],
    signal,
  );
  return parseTopic(raw);
}
