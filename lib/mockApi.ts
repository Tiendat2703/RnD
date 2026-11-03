// lib/mockApi.ts — chỗ giả lập calls phía AI.
//
// Nguyên tắc giữ nguyên như bản trước: sau này có backend/extension thật thì chỉ
// thay phần BÊN TRONG hàm, không đổi chữ ký, để UI không phải sửa.
//
// Không có hàm nào ở đây mở `fetch` hay `wss`. Khóa Blaze/Exa nằm trong
// `chrome.storage.local` của popup extension, không bao giờ đi qua web app.

import type { ResearchResult, Topic } from "./types";
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
