"use client";

// components/ai-sidekick/AISidekickPanel.tsx — dòng thời gian chủ đề.
//
// Đây là câu trả lời cho câu hỏi duy nhất mà một người đang họp hỏi khi MeetMate
// im lặng: "nó đã thấy gì chưa?". Panel vì vậy liệt kê theo thứ tự thời gian thật
// của phiên, mỗi chủ đề một thẻ, và nói rõ tổng cộng bao nhiêu tin đã vào chat.
//
// Số chủ đề KHÔNG phải số tin: một chủ đề sinh 1–5 tin. Gộp hai con số làm một
// sẽ khiến người đọc không biết MeetMate nghe được bao nhiêu chuyện.
import type { SessionCard } from "../../hooks/useMeetMateSession";
import AIResultCard from "./AIResultCard";
import { IconRobot } from "../dashboard/icons";

export default function AISidekickPanel({
  cards,
  postCount,
}: {
  cards: SessionCard[];
  postCount: number;
}) {
  if (cards.length === 0) {
    return (
      <div className="mmk-panel__empty">
        <IconRobot />
        <p>
          Chưa có chủ đề nào. MeetMate chỉ tìm nguồn khi đoạn hội thoại ra một câu
          hỏi hoặc một nhận định cần kiểm chứng — chuyện phiếm bị bỏ qua.
        </p>
      </div>
    );
  }

  return (
    <div className="mmk-panel">
      {cards.map((card) => (
        <AIResultCard key={card.key} card={card} />
      ))}
      <p className="mmk-panel__foot">
        {cards.length} chủ đề · {postCount} tin đã vào chat Meet
      </p>
    </div>
  );
}
