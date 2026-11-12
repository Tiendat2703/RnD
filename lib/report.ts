// lib/report.ts — báo cáo cuộc họp do backend tạo sau khi người dùng bấm "Lưu phiên".
//
// Web và backend (`agents/sidekick/meetmate-server/`) import cùng file này, giống
// `bridgeProtocol.ts` giữa web và extension. Chỉ có kiểu và hàm thuần.

/** Việc được giao. `owner` chỉ có khi transcript nói rõ tên người nhận. */
export interface ReportAssignment {
  task: string;
  owner: string | null;
  /** câu nguyên văn trong transcript làm căn cứ (backend đã kiểm tra có thật) */
  evidence: string;
}

export interface ReportNextStep {
  item: string;
  /** hạn chót đúng như được nhắc trong cuộc họp, không tự suy ra */
  due: string | null;
}

export interface ReportSource {
  topic: string;
  title: string;
  url: string;
}

export interface MeetingReport {
  sessionId: string;
  title: string;
  /** epoch ms */
  generatedAt: number;
  model: string;
  /** Những gì đã diễn ra */
  summary: string;
  happenings: string[];
  /** Ai làm gì */
  assignments: ReportAssignment[];
  /** Kế hoạch tiếp theo */
  nextSteps: ReportNextStep[];
  openQuestions: string[];
  /** nguồn research của phiên, lấy thẳng từ extension, không qua LLM */
  sources: ReportSource[];
  /** số mục LLM đưa ra nhưng bị loại vì câu căn cứ không có trong transcript */
  droppedUnverified: number;
  /** transcript quá dài nên chỉ phần đầu được đưa vào LLM */
  transcriptTruncated: boolean;
}

export type ReportStatus = "ok" | "error";

/** Trả về của `POST /api/sessions`, `GET /api/sessions/:id`, `POST .../report/retry`. */
export interface SavedSessionResponse {
  id: string;
  /** epoch ms lúc backend ghi phiên */
  savedAt: number;
  reportStatus: ReportStatus;
  report: MeetingReport | null;
  /** thông báo lỗi tiếng Việt khi `reportStatus = "error"` */
  error: string | null;
}

export function reportToMarkdown(r: MeetingReport): string {
  const out: string[] = [`# ${r.title}`, "", `Báo cáo tạo lúc ${new Date(r.generatedAt).toLocaleString("vi-VN")}.`, ""];
  if (r.transcriptTruncated) out.push("> Bản ghi quá dài: báo cáo chỉ dựa trên phần đầu cuộc họp.", "");
  out.push("## Những gì đã diễn ra", "", r.summary || "_Không có nội dung._", "");
  for (const h of r.happenings) out.push(`- ${h}`);
  out.push("", "## Ai làm gì", "");
  if (r.assignments.length === 0) out.push("_Không có việc nào được giao rõ trong transcript._");
  for (const a of r.assignments) out.push(`- **${a.owner ?? "Chưa rõ người nhận"}**: ${a.task}  \n  > ${a.evidence}`);
  out.push("", "## Kế hoạch tiếp theo", "");
  if (r.nextSteps.length === 0) out.push("_Không có bước tiếp theo được nhắc._");
  for (const s of r.nextSteps) out.push(`- ${s.item}${s.due ? ` (hạn: ${s.due})` : ""}`);
  if (r.openQuestions.length > 0) {
    out.push("", "### Câu hỏi còn bỏ ngỏ", "");
    for (const q of r.openQuestions) out.push(`- ${q}`);
  }
  if (r.sources.length > 0) {
    out.push("", "## Nguồn research trong cuộc họp", "");
    for (const s of r.sources) out.push(`- ${s.topic}: [${s.title}](${s.url})`);
  }
  out.push("");
  return out.join("\n");
}
