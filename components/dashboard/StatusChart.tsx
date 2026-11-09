"use client";

// components/dashboard/StatusChart.tsx — biểu đồ PNG "số nhận định theo trạng thái bằng chứng".
//
// Dựng từ các thẻ đối chiếu, không có số nào do mẫu tự thêm. Bốn trạng thái phân biệt bằng
// nhãn chữ và kiểu nền (đặc / viền / nét đứt), không bằng màu mới. Bản tải về vẽ bằng canvas
// ngay trên máy: không gửi dữ liệu đi đâu.
import { EVIDENCE_LABEL, EVIDENCE_ORDER, statusCounts, type KnowledgeCard } from "../../lib/evidence";
import { IconDownload } from "./icons";

function drawPng(title: string, cards: KnowledgeCard[]): string {
  const counts = statusCounts(cards);
  const max = Math.max(1, ...EVIDENCE_ORDER.map((s) => counts[s]));
  const W = 900;
  const H = 120 + EVIDENCE_ORDER.length * 70 + 50;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#0b0f14";
  g.font = "600 26px sans-serif";
  g.fillText("Nhận định theo trạng thái bằng chứng", 40, 52);
  g.fillStyle = "#5b6470";
  g.font = "16px sans-serif";
  g.fillText(title, 40, 82);
  EVIDENCE_ORDER.forEach((s, i) => {
    const y = 120 + i * 70;
    const w = Math.round((counts[s] / max) * 460);
    g.fillStyle = "#0b0f14";
    g.font = "600 17px sans-serif";
    g.fillText(EVIDENCE_LABEL[s], 40, y + 30);
    if (s === "contradicted") {
      g.fillStyle = "#0b0f14";
      g.fillRect(260, y + 8, Math.max(w, 2), 32);
    } else if (s === "supported") {
      g.fillStyle = "#e6e9ed";
      g.fillRect(260, y + 8, Math.max(w, 2), 32);
    } else {
      g.strokeStyle = "#0b0f14";
      g.lineWidth = 2;
      if (s === "insufficient") g.setLineDash([6, 4]);
      g.strokeRect(261, y + 9, Math.max(w - 2, 2), 30);
      g.setLineDash([]);
    }
    g.fillStyle = "#0b0f14";
    g.font = "600 20px sans-serif";
    g.fillText(String(counts[s]), 260 + w + 14, y + 31);
  });
  g.fillStyle = "#5b6470";
  g.font = "14px sans-serif";
  g.fillText("MeetMate · dữ liệu mẫu · dựng từ các thẻ đối chiếu của phiên", 40, H - 20);
  return c.toDataURL("image/png");
}

export function StatusChart({ title, cards, onDone }: { title: string; cards: KnowledgeCard[]; onDone: (m: string) => void }) {
  const counts = statusCounts(cards);
  const max = Math.max(1, ...EVIDENCE_ORDER.map((s) => counts[s]));
  const download = () => {
    const a = document.createElement("a");
    a.href = drawPng(title, cards);
    a.download = "bieu-do-trang-thai-bang-chung.png";
    a.click();
    onDone("Đã tải bieu-do-trang-thai-bang-chung.png.");
  };
  return (
    <section className="rp" aria-label="Biểu đồ trạng thái bằng chứng">
      <header className="rp__head">
        <h3 className="dp__h">Biểu đồ trạng thái bằng chứng</h3>
        <button className="btn btn--outline btn--sm" onClick={download}>
          <IconDownload />
          Tải PNG
        </button>
      </header>
      <ul className="stchart">
        {EVIDENCE_ORDER.map((s) => (
          <li key={s} className={`stchart__row stchart__row--${s}`}>
            <span>{EVIDENCE_LABEL[s]}</span>
            <i style={{ width: `${(counts[s] / max) * 100}%` }} />
            <strong>{counts[s]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
