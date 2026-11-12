// Tạo báo cáo từ transcript: một lượt LLM, rồi kiểm tra kết quả.
//
// Transcript trộn âm thanh tab và micro (`source: "mixed"`), nên không biết câu nào
// của ai. Vì vậy:
// - mỗi việc được giao phải kèm câu căn cứ nguyên văn; câu không có thật trong
//   transcript thì cả mục bị loại;
// - tên người nhận chỉ giữ khi tên đó nằm ngay trong câu căn cứ, không thì để null.
import { z } from 'zod';
import type { MeetingReport, ReportSource } from '../../../lib/report';
import type { Chat, ChatMessage } from './llm';
import type { IncomingSession } from './schema';

/** ~1 giờ họp tiếng Việt vào khoảng 60k ký tự; vượt mức này thì cắt và ghi rõ. */
export const MAX_TRANSCRIPT_CHARS = 150_000;

const MAX_ITEMS = 30;

function stamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function transcriptText(session: IncomingSession): { text: string; truncated: boolean } {
  const rows: string[] = [];
  let size = 0;
  for (const l of session.lines) {
    const t = l.text.trim();
    if (!t) continue;
    const row = `[${stamp(l.atMs)}] ${t}`;
    if (size + row.length + 1 > MAX_TRANSCRIPT_CHARS) return { text: rows.join('\n'), truncated: true };
    rows.push(row);
    size += row.length + 1;
  }
  return { text: rows.join('\n'), truncated: false };
}

const SYSTEM = `Bạn viết biên bản cuộc họp từ bản ghi lời nói (transcript) tiếng Việt, có thể lẫn tiếng Anh.

Bản ghi KHÔNG có nhãn người nói: âm thanh của mọi người bị trộn chung. Đừng đoán ai nói câu nào.

Chỉ dùng thông tin có trong bản ghi. Không bịa tên, số liệu, hạn chót hay quyết định.

Trả về DUY NHẤT một object JSON, không kèm chữ nào khác:
{
  "summary": "2-4 câu tóm tắt cuộc họp",
  "happenings": ["diễn biến hoặc chủ đề chính, theo thứ tự thời gian"],
  "assignments": [{"task": "việc cần làm", "owner": "tên người nhận hoặc null", "evidence": "câu nguyên văn"}],
  "nextSteps": [{"item": "bước tiếp theo", "due": "hạn chót đúng như được nói, hoặc null"}],
  "openQuestions": ["câu hỏi hoặc vấn đề chưa được giải quyết"]
}

Quy tắc cho "assignments":
- Chỉ ghi khi bản ghi có lời giao việc hoặc nhận việc rõ ràng. Ý kiến, đề xuất chưa ai nhận thì đưa vào "nextSteps".
- "evidence" phải chép NGUYÊN VĂN một đoạn liên tục trong bản ghi, bỏ phần [mm:ss]. Không sửa chữ, không tóm tắt.
- "owner" chỉ điền khi tên người nhận xuất hiện ngay trong "evidence". Không có tên thì để null.

Mảng nào không có nội dung thì để []. Viết bằng tiếng Việt.`;

export function buildMessages(session: IncomingSession, transcript: string): ChatMessage[] {
  const topics = session.topics.map((t) => t.topic.topic).filter(Boolean);
  const head = [`Tên cuộc họp: ${session.title}`];
  if (topics.length) head.push(`Chủ đề MeetMate đã tách trong lúc họp: ${topics.join('; ')}`);
  const user = `${head.join('\n')}\n\nBản ghi:\n${transcript}`;
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ];
}

const str = (max: number) => z.string().trim().max(max * 4).transform((s) => s.slice(0, max));
const strOrNull = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((s) => {
      const t = (s ?? '').trim().slice(0, max);
      return t && t.toLowerCase() !== 'null' ? t : null;
    });

const llmSchema = z.object({
  summary: str(1500).default(''),
  happenings: z.array(str(500)).default([]),
  assignments: z
    .array(z.object({ task: str(500), owner: strOrNull(100), evidence: str(1000) }))
    .default([]),
  nextSteps: z.array(z.object({ item: str(500), due: strOrNull(100) })).default([]),
  openQuestions: z.array(str(500)).default([]),
});

/** Lấy object JSON từ câu trả lời, kể cả khi model bọc trong ```json … ```. */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('LLM không trả về JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

/** Bỏ dấu câu, gộp khoảng trắng, chữ thường: PDF/STT và bản chép của model hay lệch ở đây. */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const MIN_EVIDENCE = 6;

export interface GenerateDeps {
  chat: Chat;
  model: string;
  now?: () => number;
  signal?: AbortSignal;
}

export async function generateReport(session: IncomingSession, deps: GenerateDeps): Promise<MeetingReport> {
  const { text, truncated } = transcriptText(session);
  if (!text) throw new Error('Phiên không có câu nào trong bản ghi để tạo báo cáo.');

  const raw = await deps.chat(buildMessages(session, text), deps.signal ?? new AbortController().signal);
  const parsed = llmSchema.parse(extractJson(raw));

  // so trên cùng phần transcript đã đưa cho LLM
  const haystack = ` ${normalize(text.replace(/^\[[\d:]+\] /gm, ''))} `;
  let dropped = 0;
  const assignments = parsed.assignments.flatMap((a) => {
    const ev = normalize(a.evidence);
    if (!a.task || ev.length < MIN_EVIDENCE || !haystack.includes(` ${ev} `)) {
      dropped++;
      return [];
    }
    const owner = a.owner && ` ${ev} `.includes(` ${normalize(a.owner)} `) ? a.owner : null;
    return [{ task: a.task, owner, evidence: a.evidence }];
  });

  const sources: ReportSource[] = session.topics.flatMap((t) =>
    (t.result?.sources ?? []).map((s) => ({ topic: t.topic.topic, title: s.title, url: s.url })),
  );

  return {
    sessionId: session.id,
    title: session.title,
    generatedAt: (deps.now ?? Date.now)(),
    model: deps.model,
    summary: parsed.summary,
    happenings: parsed.happenings.filter(Boolean).slice(0, MAX_ITEMS),
    assignments: assignments.slice(0, MAX_ITEMS),
    nextSteps: parsed.nextSteps.filter((s) => s.item).slice(0, MAX_ITEMS),
    openQuestions: parsed.openQuestions.filter(Boolean).slice(0, MAX_ITEMS),
    sources,
    droppedUnverified: dropped,
    transcriptTruncated: truncated,
  };
}
