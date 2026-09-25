// hooks/useTranscriptStream.ts — giả lập transcript chạy theo thời gian (CLAUDE.md Mục 7)
import { useState } from "react";
import type { TranscriptEntry } from "../lib/types";

export function useTranscriptStream() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);

  // TODO: dùng subscribeToTranscript() để thêm entry dần dần,
  //       tự trigger AI khi gặp câu hỏi (dấu "?" hoặc câu hỏi mẫu).
  return { entries, setEntries };
}
