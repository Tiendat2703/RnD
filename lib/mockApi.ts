// lib/mockApi.ts — chỗ giả lập calls phía AI.
//
// Nguyên tắc giữ nguyên như bản trước: sau này có backend/extension thật thì chỉ
// thay phần BÊN TRONG hàm, không đổi chữ ký, để UI không phải sửa.
//
// Không có hàm nào ở đây mở `fetch` hay `wss`. Khóa Blaze/Exa nằm trong
// `chrome.storage.local` của popup extension, không bao giờ đi qua web app.

import type { ResearchResult, Topic } from "./types";
import type { Citation, KnowledgeCard } from "./evidence";
import claimsFixture from "../mocks/meeting-claims.json";
import kbFixture from "../mocks/kb.json";
import { sampleTopics } from "./dashboardData";

/** Chủ đề đang bàn, lấy từ cửa sổ transcript. */
export async function getCurrentTopic(): Promise<Topic | null> {
  const first = sampleTopics[0];
  return first ? first.topic : null;
}

/** Kết quả research cho một chủ đề — độ trễ 2–4s để thấy đúng trạng thái đang chạy. */
export async function getResearchResult(topic: Topic): Promise<ResearchResult> {
  const match = sampleTopics.find((t) => t.topic.topic === topic.topic);
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
  if (match) return match.result;
  return { topic: topic.topic, summary: "", sources: [] };
}

/** Cuộc họp mẫu làm rõ yêu cầu (ví dụ ở mục III.3.2 của bản mô tả): bản ghi + các thẻ đối chiếu. */
export interface SampleMeeting {
  title: string;
  lines: { id: string; text: string; atMs: number }[];
  cards: KnowledgeCard[];
}

export async function getSampleMeeting(): Promise<SampleMeeting> {
  return claimsFixture as unknown as SampleMeeting;
}

export interface KbHit extends Citation {
  score: number;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

/**
 * Truy xuất kho tài liệu mẫu. Thật sự chỉ khớp từ khóa trên vài đoạn có sẵn — nhãn "Dữ liệu
 * mẫu" ở giao diện nói đúng điều đó. Khi có Supabase + pgvector, thay phần bên trong hàm.
 */
/** Đoạn của tài liệu người dùng tải lên trong phiên này (chỉ nằm trong bộ nhớ trang). */
const userChunks: { docId: string; doc: string; locator: string; text: string }[] = [];

export function addKbChunks(docId: string, doc: string, chunks: { locator: string; text: string }[]): void {
  removeKbChunks(docId);
  for (const c of chunks) userChunks.push({ docId, doc, ...c });
}

export function removeKbChunks(docId: string): void {
  for (let i = userChunks.length - 1; i >= 0; i--) if (userChunks[i].docId === docId) userChunks.splice(i, 1);
}

export async function searchKnowledgeBase(query: string): Promise<KbHit[]> {
  const words = fold(query).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  await new Promise((r) => setTimeout(r, 450));
  return [...kbFixture.chunks.map((c) => ({ ...c, keywords: c.keywords })), ...userChunks.map((c) => ({ ...c, keywords: [] as string[] }))]
    .map((c) => {
      const hay = fold(`${c.text} ${c.keywords.join(" ")}`);
      const hits = words.filter((w) => hay.includes(w)).length;
      return { doc: c.doc, locator: c.locator, excerpt: c.text, score: words.length ? hits / words.length : 0 };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
