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

// --- Luồng: AI lắng nghe thụ động, tự "tìm" tài liệu / dashboard (pivot giao diện) ---

export type FindingType = "document" | "dashboard";

export type DashboardKind = "cashflow" | "office-compare";

// "Tín hiệu" — định nghĩa tĩnh theo scenario: từ khoá → món nội dung AI sẽ show.
// dashboardKind chỉ có nghĩa khi type = "dashboard"; payload là dữ liệu mock
// riêng cho từng loại dashboard.
export type SignalSeed = {
  keyword: string;
  type: FindingType;
  title: string;
  snippet: string;
  url: string;
  dashboardKind?: DashboardKind;
  payload?: unknown;
};

// "Finding" — một món đã được AI phát hiện & show ra trong lúc lắng nghe
export type Finding = {
  id: string;
  keyword: string;
  type: FindingType;
  title: string;
  snippet: string;
  url: string;
  dashboardKind?: DashboardKind;
  payload?: unknown;
  detectedFromText: string; // câu transcript mà AI nghe được
  detectedAt: number; // ms (thời điểm phát hiện)
};

// --- Scenarios: mỗi scenario 1 cuộc họp + bộ tín hiệu riêng ---

export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  accentEmoji: string;
  participants: Participant[];
  transcript: TranscriptEntry[];
  signals: SignalSeed[];
};

// --- Payload data cho dashboard office (scenario 2) ---
export type OfficeOption = {
  id: string;
  name: string; // "Địa điểm A — Quận 1"
  pricePerSqm: number; // USD/m2/tháng (mock)
  sizeSqm: number; // diện tích trung bình (m2)
  note: string;
};
