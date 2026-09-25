// lib/types.ts — type/interface dùng chung (CLAUDE.md Mục 5)

export type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted: boolean;
};

export type TranscriptEntry = {
  id: string;
  speakerId: string;
  text: string;
  timestamp: number; // ms từ lúc bắt đầu mock
  topic?: string;
  intent?: "question" | "decision" | "action" | "summary";
};

export type AIAnalysisStatus = "idle" | "analyzing" | "done" | "error";

export type AIAnalysisStep = {
  id: string;
  label: string; // vd: "Đang đọc câu hỏi…"
};

export type AIArtifact = {
  type: "document" | "slide" | "spreadsheet";
  title: string;
  url: string; // mock link, không cần trỏ đến file thật
};

export type AIResult = {
  id: string;
  triggeredBy: string; // transcript entry id hoặc "manual"
  question: string;
  answer: string;
  artifacts?: AIArtifact[];
};
