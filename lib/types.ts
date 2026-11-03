// lib/types.ts — hợp đồng dữ liệu dùng chung giữa web console và extension.
//
// Mọi giới hạn ở đây khớp `2026-11-01-meetmate-extension.md` (Task 5–6) và
// `agents/sidekick/shared/types.ts`. Web và extension phải import cùng một bộ
// hằng số này: hai bản sao của cùng một con số thể là hai con số khác nhau sau
// một lần sửa, và giới hạn 450 ký tự của chat Meet là thứ không được phép lệch.

/** Các trần kỹ thuật đã chốt. Sửa ở đây, không sửa ở nơi dùng. */
export const LIMITS = {
  windowMs: 120_000,
  duplicateMs: 5_000,
  topicCheckEvery: 3,
  topicMinGapMs: 15_000,
  sampleRate: 16_000,
  frameSamples: 1_600,
  maxSources: 4,
  summaryMaxChars: 300,
  reasonMaxChars: 200,
  chatMaxChars: 450,
  chatGapMs: 600,
  prefix: "MeetMate: ",
} as const;

/**
 * Nguồn âm, không phải người nói. Extension chỉ có hai kênh: âm thanh của tab
 * Meet (giọng người khác) và micro (giọng người dùng). Không có roster, nên
 * không có tên — caption nào cũng chỉ ghi kênh, không ghi ai.
 */
export type AudioSource = "tab" | "mic";

/** Loại cuộc họp theo đúng đối tượng trong bản mô tả: nhóm sản phẩm, nghiên cứu, đào tạo, bán lẻ. */
export type MeetingKind = "san-pham" | "nghien-cuu" | "dao-tao" | "ban-le" | "khac";

export type MeetingStatus = "live" | "ready" | "ended";

export interface MeetingLine {
  id: string;
  text: string;
  /** ms kể từ lúc bắt đầu họp */
  atMs: number;
  source: AudioSource;
}

/** Kết quả tách chủ đề (Task 5). `keywords` tối đa 8. */
export interface Topic {
  topic: string;
  keywords: string[];
  query: string;
}

/** Một nguồn do Exa trả về (Task 6). `reason` tối đa 200 ký tự. */
export interface ResearchSource {
  title: string;
  url: string;
  reason: string;
}

/** `summary` tối đa 300 ký tự; `sources` tối đa `LIMITS.maxSources`. */
export interface ResearchResult {
  topic: string;
  summary: string;
  sources: ResearchSource[];
}

/** Một tin đã gõ vào chat Meet. `chars` luôn ≤ `LIMITS.chatMaxChars`. */
export interface PostedMessage {
  text: string;
  chars: number;
}

/** Một phiên họp đã kết thúc hoặc đang chạy, nhìn từ web console. */
export interface MeetingRecord {
  id: string;
  title: string;
  kind: MeetingKind;
  /** ISO date string */
  startedAt: string;
  durationSec: number;
  topicCount: number;
  sourceCount: number;
  status: MeetingStatus;
}

/** Sáu bước của pipeline, hiển thị theo đúng thứ tự này. */
export type PipelineStage =
  | "listening"
  | "transcribing"
  | "topic"
  | "searching"
  | "writing"
  | "posting";

/** Bốn trạng thái suy giảm — chuỗi hiển thị lấy nguyên văn từ plan extension. */
export type Degraded = "no-keys" | "no-mic" | "blaze-credits" | "chat-unreachable";

export const DEGRADED_TEXT: Record<Degraded, string> = {
  "no-keys": "Thiếu khóa Blaze hoặc Exa",
  "no-mic": "Không dùng được micro — chỉ nghe âm thanh từ người khác",
  "blaze-credits": "Blaze STT: Insufficient credits",
  "chat-unreachable": "Không gửi được vào chat Meet",
};

export const PIPELINE_LABEL: Record<PipelineStage, string> = {
  listening: "Đang lắng nghe",
  transcribing: "Đang phiên âm",
  topic: "Đang tách chủ đề",
  searching: "Đang tìm nguồn",
  writing: "Đang viết lý do",
  posting: "Đang gửi vào chat",
};

export const MEETING_KIND_LABEL: Record<MeetingKind, string> = {
  "san-pham": "Sản phẩm",
  "nghien-cuu": "Nghiên cứu",
  "dao-tao": "Đào tạo",
  "ban-le": "Bán lẻ",
  khac: "Khác",
};
