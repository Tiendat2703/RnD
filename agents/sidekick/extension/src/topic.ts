import { extractJson, type Chat } from './llm';
import type { DocLibrary } from './doccheck';

export type Topic = { topic: string; keywords: string[]; query: string };
export type TopicDecision = Topic & { changed: boolean };

const SYSTEM = 'Bạn đọc transcript cuộc họp tiếng Việt và xác định chủ đề chính ở phần gần nhất. '
  + 'Chỉ trả về một object JSON: {"topic": string, "keywords": string[], "query": string, "changed": boolean}. '
  + 'topic là cụm ngắn tiếng Việt; để rỗng nếu đang nói chuyện phiếm hoặc chưa rõ chủ đề. '
  + 'keywords tối đa 8 từ khóa. '
  + 'query là truy vấn tìm kiếm web ngắn, chọn tiếng Việt hoặc tiếng Anh tùy ngôn ngữ cho kết quả tốt hơn. '
  + 'changed là true nếu chủ đề khác chủ đề hiện tại. '
  + 'Chỉ đề xuất web cho kiến thức công khai và nhu cầu nghiên cứu bên ngoài. Không tìm câu hỏi về file đã tải lên, điều khoản hợp đồng, ngân sách, nhân sự hay dữ kiện riêng của nhóm trên web; để topic và query rỗng nếu phần gần nhất chỉ bàn nội dung nội bộ. Không đưa dữ kiện riêng của tài liệu vào query. '
  + 'Câu hỏi trực tiếp gọi MeetMate đã được xử lý riêng, không nghiên cứu lại chúng hoặc lặp lại chủ đề cũ khi lời thoại mới không cần web.';

export function parseTopic(raw: string): TopicDecision | null {
  const value = extractJson(raw) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object') return null;
  if (typeof value.topic !== 'string') return null;
  const topic = value.topic.trim();
  const query = typeof value.query === 'string' ? value.query.trim() : '';
  if (topic && !query) return null;
  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter((k): k is string => typeof k === 'string').slice(0, 8)
    : [];
  return { topic, keywords, query, changed: value.changed === true };
}

export async function detectTopic(
  chat: Chat,
  current: Topic | null,
  transcript: string,
  signal: AbortSignal,
  library?: DocLibrary | null,
): Promise<TopicDecision | null> {
  const reply = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Chủ đề hiện tại: ${current?.topic ?? 'chưa có'}\n\nTài liệu của nhóm: ${JSON.stringify([...new Set(library?.chunks.map(c => c.docName) ?? [])])}\n\nTranscript:\n${transcript}` },
  ], signal);
  return parseTopic(reply);
}
