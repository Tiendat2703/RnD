"use client";

// components/ai-sidekick/AIAnalyzingPopup.tsx — MeetMate đang làm gì, ngay bây giờ.
//
// Overlay cũ chỉ hiện khi người dùng BẤM hỏi. MeetMate không có nút hỏi: nó tự
// tách chủ đề từ luồng hội thoại, nên thứ cần hiện là bước hiện tại của pipeline
// — và nó phải hiện ngay cả khi người dùng không nhìn, vì đó là lúc giải thích
// vì sao chat Meet bỗng im lặng.
//
// Sáu bước lấy từ PIPELINE_LABEL (lib/types.ts) theo đúng thứ tự của plan
// extension. Không tự viết lại nhãn ở đây: hai bản sao nhãn sẽ lệch nhau ngay
// lần sửa đầu tiên.
import { PIPELINE_LABEL, type PipelineStage } from "../../lib/types";
import type { SessionCard } from "../../hooks/useMeetMateSession";

const ORDER: PipelineStage[] = [
  "listening",
  "transcribing",
  "topic",
  "searching",
  "writing",
  "posting",
];

export default function AIAnalyzingPopup({
  stage,
  card,
}: {
  stage: PipelineStage | null;
  card?: SessionCard;
}) {
  if (!stage || !card) return null;
  const activeIdx = ORDER.indexOf(stage);

  return (
    <div className="mmk-analyzing" role="status" aria-live="polite">
      <div className="mmk-analyzing__head">
        <span className="mmk-bars" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <strong>{PIPELINE_LABEL[stage]}</strong>
        <span className="mmk-analyzing__topic">{card.topic.topic}</span>
      </div>
      <ol className="mmk-stages">
        {ORDER.map((s, i) => (
          <li
            key={s}
            className="mmk-stage"
            data-state={i < activeIdx ? "done" : i === activeIdx ? "active" : "pending"}
          >
            <span className="mmk-stage__dot" aria-hidden />
            <span className="mmk-stage__label">{PIPELINE_LABEL[s]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
