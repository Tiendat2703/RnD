// lib/evidence.ts — hợp đồng dữ liệu của Knowledge Card (trạng thái bằng chứng).
//
// Web console và extension import CÙNG file này, như `bridgeProtocol.ts`. Định nghĩa
// bốn trạng thái theo mục V.3.2 của bản mô tả RTS2026: số liệu lệch dưới 20% và cùng
// chiều là "ủng hộ một phần"; lệch trên 50% hoặc ngược chiều là "mâu thuẫn"; tài liệu
// không nhắc tới là "chưa đủ căn cứ" — hệ thống không được suy đoán.
//
// Hiện chưa có pipeline nào sinh ra các thẻ này: chúng đến từ `mocks/meeting-claims.json`
// qua `lib/mockApi.ts`. Khi có backend, thay phần bên trong mockApi, kiểu ở đây giữ nguyên.

export type EvidenceStatus = "supported" | "partial" | "contradicted" | "insufficient";

/** Câu hỏi và nhận định được đối chiếu; giả định, quyết định, phụ thuộc chỉ được ghi nhận (mục III.3.2). */
export type UtteranceKind = "question" | "claim" | "assumption" | "decision" | "dependency";

export interface Citation {
  /** tên tài liệu đã tải lên */
  doc: string;
  /** vị trí trong tài liệu: mục, trang hoặc ô */
  locator: string;
  excerpt: string;
}

export interface KnowledgeCard {
  id: string;
  kind: UtteranceKind;
  /** câu gốc trong cuộc họp */
  quote: string;
  /** ms kể từ lúc bắt đầu họp */
  atMs: number;
  /** chỉ nhận định mới có trạng thái; các loại khác là null */
  status: EvidenceStatus | null;
  summary: string;
  citations: Citation[];
  /** bước xử lý bị lỗi (STT, backend, LLM): hiện "Lỗi xử lý", không dùng "Chưa đủ căn cứ" để che lỗi kỹ thuật */
  error?: boolean;
}

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  supported: "Được ủng hộ",
  partial: "Ủng hộ một phần",
  contradicted: "Mâu thuẫn",
  insufficient: "Chưa đủ căn cứ",
};

/** Điều kiện của từng trạng thái, nguyên văn ý của bản mô tả (mục V.3.2). */
export const EVIDENCE_RULE: Record<EvidenceStatus, string> = {
  supported: "Tài liệu nói trực tiếp điều này, không có chỗ nào mâu thuẫn.",
  partial: "Đúng hướng nhưng sai mức, hoặc khác phạm vi (khác năm, khu vực, phân khúc).",
  contradicted: "Tài liệu nói ngược lại, hoặc số liệu lệch đáng kể.",
  insufficient: "Tài liệu đã tải lên không đề cập — hệ thống không suy đoán.",
};

export const ERROR_LABEL = "Lỗi xử lý";

export const KIND_LABEL: Record<UtteranceKind, string> = {
  question: "Câu hỏi",
  claim: "Nhận định",
  assumption: "Giả định",
  decision: "Quyết định",
  dependency: "Phụ thuộc",
};

/** Thứ tự hiển thị: cái cần người họp chú ý nhất đứng trước. */
export const EVIDENCE_ORDER: EvidenceStatus[] = ["contradicted", "partial", "insufficient", "supported"];

export function stampOf(atMs: number): string {
  const s = Math.max(0, Math.floor(atMs / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function statusCounts(cards: KnowledgeCard[]): Record<EvidenceStatus, number> {
  const out: Record<EvidenceStatus, number> = { supported: 0, partial: 0, contradicted: 0, insufficient: 0 };
  for (const c of cards) if (c.status) out[c.status] += 1;
  return out;
}

/**
 * Session Context Memory: thứ MeetMate ghi lại về cuộc họp ngoài bản ghi. Quyết định và
 * phụ thuộc vào "trạng thái phiên"; giả định được đánh dấu riêng, không coi là sự thật đã
 * kiểm chứng; nhận định chưa được ủng hộ trọn vẹn là việc còn mở.
 */
export interface SessionMemory {
  decisions: KnowledgeCard[];
  dependencies: KnowledgeCard[];
  assumptions: KnowledgeCard[];
  open: KnowledgeCard[];
}

const rank = (c: KnowledgeCard) => (c.status ? EVIDENCE_ORDER.indexOf(c.status) : EVIDENCE_ORDER.length);

export function memoryOf(cards: KnowledgeCard[]): SessionMemory {
  return {
    decisions: cards.filter((c) => c.kind === "decision"),
    dependencies: cards.filter((c) => c.kind === "dependency"),
    assumptions: cards.filter((c) => c.kind === "assumption"),
    open: cards
      .filter((c) => c.kind === "claim" && (c.error || (c.status !== null && c.status !== "supported")))
      .sort((a, b) => rank(a) - rank(b)),
  };
}

function citeLine(c: Citation): string {
  return `  - Nguồn: ${c.doc} · ${c.locator} — “${c.excerpt}”`;
}

function bullet(c: KnowledgeCard): string {
  const head = `- **“${c.quote}”** (${stampOf(c.atMs)}) — ${c.summary}`;
  return [head, ...c.citations.map(citeLine)].join("\n");
}

/** Báo cáo cuộc họp dạng Markdown, dựng hoàn toàn từ các thẻ — không có chữ nào do mẫu tự thêm. */
export function reportMarkdown(title: string, cards: KnowledgeCard[]): string {
  const claims = cards.filter((c) => c.kind === "claim" && c.status);
  const questions = cards.filter((c) => c.kind === "question");
  const mem = memoryOf(cards);
  const out: string[] = [`# Báo cáo cuộc họp: ${title}`, "", `Dựng từ ${cards.length} thẻ đối chiếu.`, ""];

  out.push("## Nhận định đã đối chiếu", "");
  if (claims.length === 0) out.push("Không có nhận định nào.", "");
  for (const status of EVIDENCE_ORDER) {
    const rows = claims.filter((c) => c.status === status);
    if (rows.length === 0) continue;
    out.push(`### ${EVIDENCE_LABEL[status]} (${rows.length})`, "", ...rows.map(bullet), "");
  }
  const failed = cards.filter((c) => c.error);
  if (failed.length) out.push(`## ${ERROR_LABEL} (${failed.length})`, "", ...failed.map(bullet), "");
  if (questions.length) out.push("## Câu hỏi và trả lời", "", ...questions.map(bullet), "");
  if (mem.decisions.length) out.push("## Quyết định", "", ...mem.decisions.map(bullet), "");
  if (mem.dependencies.length) out.push("## Phụ thuộc đang cản trở", "", ...mem.dependencies.map(bullet), "");
  if (mem.assumptions.length) out.push("## Giả định cần kiểm chứng tiếp", "", ...mem.assumptions.map(bullet), "");
  return out.join("\n").trimEnd() + "\n";
}
