// lib/mockApi.ts — toàn bộ hàm giả lập gọi AI/backend (CLAUDE.md Mục 6).
// Nguyên tắc: sau này có backend thật chỉ thay phần BÊN TRONG hàm,
// KHÔNG đổi chữ ký hàm, để phần UI không phải sửa.
import type {
  Participant,
  Scenario,
  SignalSeed,
  TranscriptEntry,
} from "./types";
import s1Participants from "../mocks/scenario1/participants.json";
import s1Transcript from "../mocks/scenario1/transcript.json";
import s1Findings from "../mocks/scenario1/findings.json";
import s2Participants from "../mocks/scenario2/participants.json";
import s2Transcript from "../mocks/scenario2/transcript.json";
import s2Findings from "../mocks/scenario2/findings.json";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Danh sách scenarios (metadata hiển thị + mock data).
// Sau này có backend thật: thay mock data bằng API call theo `id`.
export const SCENARIOS: Scenario[] = [
  {
    id: "cashflow",
    title: "Dòng tiền biến động",
    subtitle: "Họp tài chính review dòng tiền quý",
    accentEmoji: "💸",
    participants: s1Participants as Participant[],
    transcript: s1Transcript as TranscriptEntry[],
    signals: s1Findings as SignalSeed[],
  },
  {
    id: "office-rental",
    title: "Thuê văn phòng",
    subtitle: "Hai người bàn thuê văn phòng ở địa điểm A (Q1) hoặc B (Q7)",
    accentEmoji: "🏢",
    participants: s2Participants as Participant[],
    transcript: s2Transcript as TranscriptEntry[],
    signals: s2Findings as SignalSeed[],
  },
];

export function getScenarios(): Scenario[] {
  return SCENARIOS;
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

// Giả lập lấy participants ban đầu của 1 scenario
export async function getParticipants(scenarioId: string): Promise<Participant[]> {
  const sc = getScenario(scenarioId);
  await delay(200);
  return sc?.participants ?? [];
}

// Giả lập lấy danh sách tín hiệu của 1 scenario
export async function getSignals(scenarioId: string): Promise<SignalSeed[]> {
  const sc = getScenario(scenarioId);
  await delay(200);
  return sc?.signals ?? [];
}

// Giả lập stream transcript theo scenario (dùng interval, không phải API call thật).
// Mỗi dòng xuất hiện cách nhau ~3s, bốc theo thứ tự timestamp.
export function subscribeToTranscript(
  scenarioId: string,
  onEntry: (entry: TranscriptEntry) => void,
): () => void {
  const sc = getScenario(scenarioId);
  const entries = [...(sc?.transcript ?? [])].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
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
