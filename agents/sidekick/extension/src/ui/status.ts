// Phân loại một dòng trạng thái thành loại dải hiển thị. Hợp đồng thiết kế tách hai
// dải: vàng = đang chạy nhưng kém (không micro, không gõ được vào chat), đỏ = đường
// bị chặn (thiếu khóa, hết credit, mất STT). Lẫn hai loại này là lỗi thiết kế, nên
// phân loại nằm ở một chỗ để panel và web không bao giờ lệch nhau.
import { STATUS_RUNNING, STATUS_STARTING, STATUS_WAITING } from '../../../../../lib/bridgeProtocol';

export type StatusKind = 'idle' | 'busy' | 'live' | 'warn' | 'error' | 'info';

const WARN = ['Không dùng được micro', 'Không gửi được vào chat'];
const ERROR = ['Thiếu khóa', 'Blaze', 'Exa', 'Mất kết nối'];

export function classify(status: string): StatusKind {
  if (status === '' || status === 'Đã dừng' || status.startsWith('Phiên đã kết thúc')) return 'idle';
  if (status === STATUS_RUNNING) return 'live';
  if (status === STATUS_STARTING) return 'busy';
  if (status === STATUS_WAITING) return 'info';
  if (WARN.some((p) => status.startsWith(p))) return 'warn';
  if (ERROR.some((p) => status.startsWith(p))) return 'error';
  return 'info';
}
