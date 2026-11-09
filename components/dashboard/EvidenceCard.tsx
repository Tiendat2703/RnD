"use client";

// components/dashboard/EvidenceCard.tsx — Knowledge Card: một nhận định kèm trạng thái bằng chứng.
//
// Bốn trạng thái phân biệt bằng BIỂU TƯỢNG, độ đặc của nền và kiểu viền — không bằng màu mới.
// Hợp đồng thiết kế cấm petrol làm huy hiệu "thành công" và dành vàng/đỏ cho phiên chạy kém
// hoặc bị chặn, nên "được ủng hộ" không thể xanh và "mâu thuẫn" không thể đỏ. Xám đậm / trắng
// viền / nét đứt chiếu lên tường vẫn tách được, kể cả khi người xem mù màu.
//
//   được ủng hộ     ✓  nền nhạt          — tin tốt, không cần chú ý
//   ủng hộ một phần ◐  nền trắng, viền đậm
//   mâu thuẫn       ✕  nền đặc (ink)     — thứ duy nhất đặc: cần người họp chú ý nhất
//   chưa đủ căn cứ  ?  viền nét đứt      — "không biết", không phải "sai"
import { useState } from "react";
import { cn } from "../../lib/utils";
import {
  EVIDENCE_LABEL,
  EVIDENCE_RULE,
  ERROR_LABEL,
  KIND_LABEL,
  stampOf,
  type EvidenceStatus,
  type KnowledgeCard,
} from "../../lib/evidence";
import { useDashboard } from "./DashboardContext";

const GLYPH: Record<EvidenceStatus, React.ReactNode> = {
  supported: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  partial: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
    </>
  ),
  contradicted: <path d="M7 7l10 10M17 7 7 17" />,
  insufficient: (
    <>
      <path d="M9.2 9.5a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.1-1.5 2.2" />
      <path d="M12 17.6v.1" />
    </>
  ),
};

export function EvidenceChip({ status }: { status: EvidenceStatus }) {
  return (
    <span className={cn("ev-chip", `ev-chip--${status}`)} title={EVIDENCE_RULE[status]}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {GLYPH[status]}
      </svg>
      {EVIDENCE_LABEL[status]}
    </span>
  );
}

export function ErrorChip() {
  return (
    <span className="ev-chip ev-chip--error" title="Bước xử lý bị lỗi, đang chờ thử lại. Không phải kết luận về tài liệu.">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 6.5v7M12 17.5v.1" />
      </svg>
      {ERROR_LABEL}
    </span>
  );
}

export function EvidenceCard({ card }: { card: KnowledgeCard }) {
  const { pushToast } = useDashboard();
  const [vote, setVote] = useState<"useful" | "not-useful" | null>(null);

  const rate = (v: "useful" | "not-useful") => {
    setVote(v);
    // bản mẫu: chưa có chỗ lưu. Nói đúng điều đó thay vì giả vờ đã ghi nhận.
    pushToast("Đã chọn. Bản mẫu chưa lưu đánh giá này.");
  };

  return (
    <article className="ev-card" data-kind={card.kind}>
      <header className="ev-card__head">
        <span className="ev-card__eyebrow">MeetMate: {KIND_LABEL[card.kind]}</span>
        {card.error ? <ErrorChip /> : card.status ? <EvidenceChip status={card.status} /> : null}
        <time className="ev-card__time">{stampOf(card.atMs)}</time>
      </header>

      <p className="ev-card__quote">“{card.quote}”</p>
      <p className="ev-card__summary">{card.summary}</p>

      {card.citations.map((c) => (
        <div className="ev-cite" key={`${c.doc}-${c.locator}`}>
          <span className="ev-cite__doc">{c.doc}</span>
          <span className="ev-cite__loc">{c.locator}</span>
          <span className="ev-cite__excerpt">{c.excerpt}</span>
        </div>
      ))}

      {card.status ? (
        <footer className="ev-card__foot">
          <span>Thẻ này hữu ích không?</span>
          <button
            type="button"
            className="ev-fb"
            aria-pressed={vote === "useful"}
            onClick={() => rate("useful")}
          >
            Hữu ích
          </button>
          <button
            type="button"
            className="ev-fb"
            aria-pressed={vote === "not-useful"}
            onClick={() => rate("not-useful")}
          >
            Không hữu ích
          </button>
        </footer>
      ) : null}
    </article>
  );
}
