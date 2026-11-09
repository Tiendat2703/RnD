import { describe, expect, it } from 'vitest';
import { isLeftHeading, looksLeft, matchesLeaveLabel } from './leave';

describe('looksLeft', () => {
  it('recognises the post-call screen in Vietnamese and English', () => {
    expect(looksLeft('Bạn đã rời khỏi cuộc họp')).toBe(true);
    expect(looksLeft('  BẠN ĐÃ RỜI KHỎI CUỘC HỌP  ')).toBe(true);
    expect(looksLeft('You left the meeting')).toBe(true);
    expect(looksLeft("You've left the meeting")).toBe(true);
    expect(looksLeft('The meeting has ended')).toBe(true);
  });

  it('does not fire on ordinary in-call text', () => {
    expect(looksLeft('Tham gia bằng dn7110994@gmail.com')).toBe(false);
    expect(looksLeft('Cuộc họp đã sẵn sàng')).toBe(false);
    expect(looksLeft('')).toBe(false);
  });
});

describe('isLeftHeading', () => {
  it('accepts a standalone heading but not a sentence that merely contains the phrase', () => {
    expect(isLeftHeading('Bạn đã rời khỏi cuộc họp')).toBe(true);
    expect(isLeftHeading('Linh: bạn đã rời khỏi cuộc họp hồi nãy phải không, mình tưởng còn ở đây')).toBe(false);
    expect(isLeftHeading('Chat: bạn đã rời khỏi cuộc họp (tin nhắn của người khác)')).toBe(false);
    expect(isLeftHeading('Bạn đã rời khỏi cuộc họp.')).toBe(true);
  });
});

describe('matchesLeaveLabel', () => {
  it('matches the leave-call button label', () => {
    expect(matchesLeaveLabel('Rời khỏi cuộc gọi')).toBe(true);
    expect(matchesLeaveLabel('Leave call')).toBe(true);
    expect(matchesLeaveLabel('Bật micrô')).toBe(false);
    expect(matchesLeaveLabel(null)).toBe(false);
  });
});
