// lib/mockApi.ts — toàn bộ hàm giả lập gọi AI/backend (CLAUDE.md Mục 6).
// Nguyên tắc: sau này có backend thật chỉ thay phần BÊN TRONG hàm,
// KHÔNG đổi chữ ký hàm, để phần UI không phải sửa.
import type { Participant, SignalSeed, TranscriptEntry } from "./types";
import participantsMock from "../mocks/participants.json";
import transcriptMock from "../mocks/transcript.json";
import signalsMock from "../mocks/findings.json";

// (type AIResult cũ vẫn định nghĩa trong lib/types.ts để giữ tương thích về sau,
//  nhưng luồng mới không còn dùng analyzeQuestion.)

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Giả lập lấy participants ban đầu
export async function getParticipants(): Promise<Participant[]> {
  await delay(200);
  return participantsMock as Participant[];
}

// Giả lập lấy danh sách tín hiệu — AI nghe thấy keyword thì show món tương ứng
export async function getSignals(): Promise<SignalSeed[]> {
  await delay(200);
  return signalsMock as SignalSeed[];
}

// Giả lập stream transcript (dùng interval, không phải API call thật).
// Mỗi dòng xuất hiện cách nhau ~3s, bốc theo thứ tự timestamp.
export function subscribeToTranscript(
  onEntry: (entry: TranscriptEntry) => void,
): () => void {
  const entries = [...transcriptMock].sort((a, b) => a.timestamp - b.timestamp);
  let index = 0;

  const emitNext = () => {
    if (index >= entries.length) return;
    onEntry(entries[index]);
    index += 1;
    timer = setTimeout(emitNext, 3000);
  };

  let timer = setTimeout(emitNext, 1000);
  return () => clearTimeout(timer);
}
