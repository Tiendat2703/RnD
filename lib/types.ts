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
};

// --- Luồng mới: AI lắng nghe thụ động, tự "tìm" tài liệu / dashboard (pivot giao diện) ---

export type FindingType = "document" | "dashboard";

// "Tín hiệu" — định nghĩa tĩnh trong mocks/findings.json: từ khoá → món nội dung AI sẽ show
export type SignalSeed = {
  keyword: string; // từ/cụm từ khi nghe thấy sẽ kích hoạt
  type: FindingType;
  title: string;
  snippet: string;
  url: string; // mock link
};

// "Finding" — một món đã được AI phát hiện & show ra trong lúc lắng nghe
export type Finding = {
  id: string;
  keyword: string;
  type: FindingType;
  title: string;
  snippet: string;
  url: string;
  detectedFromText: string; // câu transcript mà AI nghe được
  detectedAt: number; // ms (thời điểm phát hiện)
};

// --- Giữ các type cũ để tương thích với component AI popup/result của giai đoạn trước ---
export type AIAnalysisStatus = "idle" | "analyzing" | "done" | "error";
export type AIAnalysisStep = { id: string; label: string };
export type AIArtifact = {
  type: "document" | "slide" | "spreadsheet";
  title: string;
  url: string;
};
export type AIResult = {
  id: string;
  triggeredBy: string;
  question: string;
  answer: string;
  artifacts?: AIArtifact[];
};
