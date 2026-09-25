// lib/mockApi.ts — toàn bộ hàm giả lập gọi AI/backend (CLAUDE.md Mục 6).
// Nguyên tắc: sau này có backend thật chỉ thay phần BÊN TRONG hàm,
// KHÔNG đổi chữ ký hàm, để phần UI không phải sửa.
import type { AIResult, Participant, TranscriptEntry } from "./types";

// Giả lập lấy participants ban đầu
export async function getParticipants(): Promise<Participant[]> {
  // TODO: đọc từ mocks/participants.json
  return [];
}

// Giả lập AI phân tích 1 câu hỏi từ transcript, có độ trễ 2–4s
export async function analyzeQuestion(question: string): Promise<AIResult> {
  // TODO: chọn kết quả từ mocks/ai-responses.json (theo keyword hoặc random),
  //       setTimeout 2000–4000ms để giả lập "AI đang suy nghĩ".
  void question;
  throw new Error("Not implemented — see CLAUDE.md mục 6");
}

// Giả lập stream transcript (dùng interval, không phải API call thật)
export function subscribeToTranscript(
  onEntry: (entry: TranscriptEntry) => void,
): () => void {
  // TODO: bốc từng entry từ mocks/transcript.json (cách nhau 2–3s).
  void onEntry;
  const interval = setInterval(() => {
    /* onEntry(...) */
  }, 3000);
  return () => clearInterval(interval);
}
