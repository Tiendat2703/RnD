// Bộ lọc chạy trên máy, trước khi tốn một lượt LLM: câu nào trong cuộc họp đáng được tự đối chiếu
// với tài liệu của phiên. Thà bỏ sót còn hơn báo ồn; câu bị bỏ sót vẫn kiểm được bằng cách bấm vào
// nó trong transcript, hoặc hỏi "Trợ lý ơi".
//
// Ba lớp, đều phải qua:
// 1. Khẳng định, không phải câu hỏi hay đề xuất ("hay là…", "nếu…", "giả sử…").
// 2. Có dữ kiện cứng: con số, tiền, phần trăm, ngày/hạn, đơn vị thời gian, hoặc tên riêng.
// 3. Nói tới thứ có trong tài liệu: đoạn BM25 tìm thấy chung với câu ít nhất MIN_SHARED_PAIRS cụm hai
//    âm tiết ("phí bảo trì" → phi_bao, bao_tri). Đếm cụm chứ không dùng điểm BM25, vì điểm phụ thuộc
//    số đoạn của tài liệu: tài liệu một đoạn cho điểm rất thấp dù câu nói đúng chủ đề.
import type { DocLibrary } from './doccheck';
import { fold, terms } from './docs/normalize';

export type Gate =
  | { pass: true; score: number; anchors: string[] }
  | { pass: false; reason: 'question' | 'hedge' | 'no-fact' | 'no-doc-match'; score?: number };

const QUESTION = /(?:^| )(bao nhieu|bao gio|bao lau|khi nao|ngay nao|thang nao|o dau|the nao|tai sao|vi sao|la gi|co phai|dung khong|phai khong|duoc khong|chua nhi|khong nhi)(?: |$)/;

/** Giả định, đề xuất, phỏng đoán: không phải điều người nói khẳng định là đúng. */
const HEDGE = /(?:^| )(hay la|neu nhu|neu ma|gia su|gia dinh|de xuat|minh thu|thu xem|co nen|co le|chac la|hinh nhu|du dinh|muon tang|muon giam|tinh tang|tinh giam)(?: |$)|^neu /;

/** Câu chào, cảm ơn, mở đầu: nói về cuộc họp chứ không nói nội dung tài liệu. */
const GREETING = /^(xin chao|chao|cam on|alo|a lo)(?: |$)/;

/** Đơn vị của dữ kiện cứng (đã bỏ dấu). "nam" vừa là "năm" (năm/số 5) nên vẫn tính. */
const FACT_WORDS = /(?:^| )(trieu|ty|ti|nghin|ngan|dong|usd|vnd|cu|phan tram|ngay|thang|nam|tuan|quy|gio|phut|han chot|deadline|thoi han|truoc ngay|cuoi thang|dau thang|giai doan|dot)(?: |$)/;

/** Số đếm đọc bằng chữ đứng trước thứ được đếm: "sáu người", "hai mươi lăm nhân viên". */
const COUNTED = /(?:^| )(?:mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi|tram)(?: (?:mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi|tram|linh|le))* (?:nguoi|nhan vien|thanh vien|lan|man hinh|tinh nang)(?: |$)/;

/** Tên riêng: từ viết hoa không đứng đầu câu (Flutter, Sao Mai, React Native). */
const PROPER = /(?<=[\p{L}\d,] )\p{Lu}[\p{L}\d]+/u;

/**
 * Số cụm hai âm tiết tối thiểu chung với đoạn khớp nhất. Đo trên tài liệu mẫu (claims.test.ts):
 * câu đáng kiểm có từ 2 cụm, chuyện ngoài lề có nhiều nhất 1 cụm chung chung ("hôm nay", "công ty").
 */
export const MIN_SHARED_PAIRS = 2;

export const isQuestion = (text: string) => text.includes('?') || QUESTION.test(fold(text));

export function hasFact(text: string): boolean {
  const f = fold(text);
  return /\d/.test(f) || text.includes('%') || FACT_WORDS.test(f) || COUNTED.test(f) || PROPER.test(text.trim());
}

export function checkable(text: string, lib: DocLibrary): Gate {
  const f = fold(text);
  if (isQuestion(text)) return { pass: false, reason: 'question' };
  if (HEDGE.test(f) || GREETING.test(f)) return { pass: false, reason: 'hedge' };
  if (!hasFact(text)) return { pass: false, reason: 'no-fact' };
  const [top] = lib.index.search(text, 1);
  if (!top) return { pass: false, reason: 'no-doc-match', score: 0 };
  const passage = new Set(terms(top.chunk.text).filter(t => t.includes('_')));
  const anchors = [...new Set(terms(text).filter(t => t.includes('_') && passage.has(t)))];
  if (anchors.length < MIN_SHARED_PAIRS) return { pass: false, reason: 'no-doc-match', score: top.score };
  return { pass: true, score: top.score, anchors };
}
