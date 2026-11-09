import { describe, expect, it } from 'vitest';
import { classify } from './status';

describe('classify', () => {
  it('separates degraded-but-running (warn) from blocked (error)', () => {
    expect(classify('Không dùng được micro — chỉ nghe âm thanh từ người khác')).toBe('warn');
    expect(classify('Không gửi được vào chat Meet')).toBe('warn');
    expect(classify('Thiếu khóa Blaze hoặc Exa')).toBe('error');
    expect(classify('Blaze STT: Insufficient credits')).toBe('error');
    expect(classify('Mất kết nối Blaze STT')).toBe('error');
  });

  it('maps the lifecycle statuses', () => {
    expect(classify('Đang chạy')).toBe('live');
    expect(classify('Đang khởi động…')).toBe('busy');
    expect(classify('')).toBe('idle');
    expect(classify('Đã dừng')).toBe('idle');
    expect(classify('Phiên đã kết thúc và được lưu')).toBe('idle');
  });

  it('treats guidance text as info, not as an error', () => {
    expect(classify('Hãy mở MeetMate trong tab Google Meet')).toBe('info');
  });
});
