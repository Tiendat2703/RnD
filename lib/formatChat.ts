// lib/formatChat.ts — định dạng tin nhắn MeetMate gửi vào chat Meet.
//
// Web console và extension phải dùng ĐÚNG MỘT chỗ này. Chat Meet có trần độ dài
// thật, và hai bản sao của hàm cắt chuỗi sẽ lệch nhau ngay lần sửa đầu tiên —
// hậu quả là bản demo hiển thị một tin mà chat Meet sẽ từ chối.
//
// Hai bất biến:
//   1. Mỗi tin ≤ LIMITS.chatMaxChars ký tự.
//   2. URL không bao giờ bị cắt. Một đường dẫn cụt là một nguồn không mở được,
//      mà nguồn là toàn bộ lý do tồn tại của sản phẩm.

import { LIMITS, type PostedMessage, type ResearchResult } from "./types";

/** Cắt theo ký tự, thêm dấu lửng, và vẫn nằm trong trần. */
export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  if (max <= 1) return t.slice(0, max);
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Cắt một tin nhiều dòng mà giữ nguyên dòng chứa URL.
 *
 * Cách làm: những dòng không phải URL được chia lại phần còn lại của ngân sách,
 * cắt từ dòng cuối ngược lên (dòng đầu là dòng mang nghĩa nhất). Nếu ngay cả khi
 * bỏ hết dòng phụ thì URL vẫn không kịp chỗ, tin bị loại — thà không gửi còn
 * hơn gửi một nguồn mở không được.
 */
export function clipKeepUrl(text: string, max: number = LIMITS.chatMaxChars): string {
  if (text.length <= max) return text;

  const lines = text.split("\n");
  const urlAt = lines.findIndex((l) => /^\s*(https?:\/\/|www\.)\S+/i.test(l.trim()));

  if (urlAt === -1) return clip(text, max);

  const urlLine = lines[urlAt];
  const budget = max - urlLine.length - 1; // 1 cho ký tự xuống dòng
  if (budget < 20) return "";

  const rest = lines.filter((_, i) => i !== urlAt);
  // cắt từ dưới lên cho tới khi vừa ngân sách
  for (let keep = rest.length; keep > 0; keep--) {
    const head = rest.slice(0, keep).join("\n");
    const probe = `${head}\n${urlLine}`;
    if (probe.length <= max) return probe;
  }
  // không còn dòng nào vừa: giữ dòng đầu tiên, cắt trong dòng đó
  const first = clip(rest[0], budget);
  return first ? `${first}\n${urlLine}` : "";
}

/**
 * Một kết quả research → các khối tin có cấu trúc, theo đúng thứ tự sẽ gửi.
 *
 * `text` là nội dung cuối cùng đi vào ô chat; `title/url/why` là cùng nội dung
 * đó tách ra để web console vẽ được thẻ. Cả hai nằm trong MỘT hàm vì nếu tách,
 * thẻ đẹp và tin thật sẽ lệch nhau ngay lần sửa đầu tiên — mà tin thật là thứ
 * duy nhất người dùng khác nhìn thấy.
 */
export interface ChatPost {
  eyebrow: string;
  title: string;
  url: string;
  why: string;
  text: string;
  chars: number;
}

export function toChatPosts(result: ResearchResult): ChatPost[] {
  const shown = result.sources.slice(0, LIMITS.maxSources);
  const total = shown.length;

  const head: ChatPost = (() => {
    const text = clipKeepUrl(
      `${LIMITS.prefix}Chủ đề: ${result.topic}\n${clip(result.summary, LIMITS.summaryMaxChars)}`
    );
    return {
      eyebrow: `${LIMITS.prefix}Chủ đề`,
      title: clip(result.topic, 120),
      url: "",
      why: clip(result.summary, LIMITS.summaryMaxChars),
      text,
      chars: text.length,
    };
  })();

  const posts: ChatPost[] = shown.map((s, i) => {
    const eyebrow = `${LIMITS.prefix}[${i + 1}/${total}]`;
    const why = `Vì sao chọn: ${clip(s.reason, LIMITS.reasonMaxChars)}`;
    const text = clipKeepUrl(`${eyebrow} ${s.title}\n${s.url}\n${why}`);
    return { eyebrow, title: s.title, url: s.url, why, text, chars: text.length };
  });

  return [head, ...posts].filter((p) => p.text);
}

/** Một kết quả research → chuỗi tin sẽ gõ vào chat Meet, theo đúng thứ tự. */
export function toChatMessages(result: ResearchResult): string[] {
  return toChatPosts(result).map((p) => p.text);
}

/** Định dạng cuối trước khi gửi: kèm số ký tự thật đã dùng. */
export function toPostedMessages(result: ResearchResult): PostedMessage[] {
  return toChatMessages(result).map((text) => ({ text, chars: text.length }));
}

/** "Tab Meet" / "Micro của bạn" — nhãn kênh âm, không phải tên người. */
export function audioSourceLabel(source: "tab" | "mic"): string {
  return source === "tab" ? "Âm thanh tab Meet" : "Micro của bạn";
}

/** mm:ss từ mốc ms của một dòng transcript. */
export function stampFromMs(atMs: number): string {
  const s = Math.max(0, Math.floor(atMs / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
