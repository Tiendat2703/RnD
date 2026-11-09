"use client";

// components/dashboard/ReportPreview.tsx — bản xem trước "Báo cáo cuộc họp".
//
// Dựng hoàn toàn từ các thẻ đối chiếu (lib/evidence.ts `reportMarkdown` cho bản tải về, cùng
// dữ liệu cho bản xem trước), không có câu nào do mẫu tự viết. Theo bản mô tả (bản 2), đầu ra MVP là báo cáo PDF và biểu đồ PNG; slide, bảng tính là sau
// MVP. Đây là bản xem trước giao diện, chưa có pipeline tạo file PDF/PNG thật.
import {
  EVIDENCE_LABEL,
  EVIDENCE_ORDER,
  memoryOf,
  statusCounts,
  stampOf,
  type KnowledgeCard,
} from "../../lib/evidence";
import { EvidenceChip } from "./EvidenceCard";
import { IconDownload } from "./icons";

export function ReportPreview({
  title,
  cards,
  onDownload,
}: {
  title: string;
  cards: KnowledgeCard[];
  onDownload: () => void;
}) {
  const claims = cards.filter((c) => c.kind === "claim" && c.status);
  const counts = statusCounts(cards);
  const mem = memoryOf(cards);
  const questions = cards.filter((c) => c.kind === "question");

  return (
    <section className="rp" aria-label="Bản xem trước báo cáo cuộc họp">
      <header className="rp__head">
        <div>
          <span className="rp__eyebrow">Bản xem trước: Báo cáo cuộc họp</span>
          <h3 className="rp__title">{title}</h3>
          <p className="rp__sub">
            {claims.length} nhận định đã đối chiếu:{" "}
            {EVIDENCE_ORDER.filter((s) => counts[s] > 0)
              .map((s) => `${counts[s]} ${EVIDENCE_LABEL[s].toLowerCase()}`)
              .join(" · ")}
          </p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onDownload}>
          <IconDownload />
          Tải .md
        </button>
      </header>

      {EVIDENCE_ORDER.map((status) => {
        const rows = claims.filter((c) => c.status === status);
        if (rows.length === 0) return null;
        return (
          <div className="rp__group" key={status}>
            <EvidenceChip status={status} />
            <ul className="rp__list">
              {rows.map((c) => (
                <li key={c.id}>
                  <strong>“{c.quote}”</strong> <span className="rp__time">{stampOf(c.atMs)}</span>
                  <br />
                  {c.summary}
                  {c.citations.map((ci) => (
                    <span className="rp__cite" key={ci.locator}>
                      {ci.doc} · {ci.locator}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {questions.length > 0 ? (
        <div className="rp__group">
          <span className="rp__label">Câu hỏi và trả lời</span>
          <ul className="rp__list">
            {questions.map((c) => (
              <li key={c.id}>
                <strong>“{c.quote}”</strong> <span className="rp__time">{stampOf(c.atMs)}</span>
                <br />
                {c.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {[
        ["Quyết định", mem.decisions],
        ["Phụ thuộc đang cản trở", mem.dependencies],
        ["Giả định cần kiểm chứng tiếp", mem.assumptions],
      ].map(([label, rows]) =>
        (rows as KnowledgeCard[]).length > 0 ? (
          <div className="rp__group" key={label as string}>
            <span className="rp__label">{label as string}</span>
            <ul className="rp__list">
              {(rows as KnowledgeCard[]).map((c) => (
                <li key={c.id}>
                  {c.summary} <span className="rp__time">{stampOf(c.atMs)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </section>
  );
}
