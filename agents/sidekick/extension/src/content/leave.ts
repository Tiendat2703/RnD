// Nhận biết người dùng đã rời cuộc họp. Meet không tải lại trang khi bạn rời cuộc gọi:
// nó đổi nội dung ngay trong tab sang màn hình "Bạn đã rời khỏi cuộc họp", nên
// `pagehide` và đổi URL đều không xảy ra. Vì vậy dùng hai tín hiệu, cả hai đều dựa vào
// chữ hiển thị (selector của Meet bị che và đổi thường xuyên, chữ thì ổn định hơn).

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Câu của màn hình sau cuộc gọi (tiếng Việt và tiếng Anh). */
const LEFT_PHRASES = [
  'bạn đã rời khỏi cuộc họp',
  'bạn đã rời khỏi cuộc gọi',
  'bạn đã rời cuộc họp',
  'bạn đã bị xóa khỏi cuộc họp',
  'bạn đã bị loại khỏi cuộc họp',
  'cuộc họp đã kết thúc',
  'you left the meeting',
  "you've left the meeting",
  'you have left the meeting',
  'you left the call',
  'you were removed from the meeting',
  'the meeting has ended',
];

/** Nhãn của nút kết thúc cuộc gọi (aria-label hoặc tooltip). */
const LEAVE_LABELS = ['rời khỏi cuộc gọi', 'rời cuộc gọi', 'leave call', 'end call', 'kết thúc cuộc gọi'];

export function looksLeft(text: string): boolean {
  const t = norm(text);
  return LEFT_PHRASES.some((p) => t.includes(p));
}

/**
 * Một đoạn chữ có phải TIÊU ĐỀ của màn hình sau cuộc gọi không: đứng riêng và ngắn.
 * Một tin chat dài chứa cùng câu đó (hoặc người khác gõ nó) không được tính.
 */
export function isLeftHeading(text: string): boolean {
  const t = norm(text).replace(/[\s.!?…]+$/, '');
  return LEFT_PHRASES.includes(t);
}

export function matchesLeaveLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const t = norm(label);
  return LEAVE_LABELS.some((p) => t.includes(p));
}
