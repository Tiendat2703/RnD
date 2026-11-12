import { describe, expect, it } from 'vitest';
import { detectWake } from './wake';

describe('detectWake', () => {
  it.each([
    'Trợ lý ơi, Ngũ Hành Sơn ở đâu?',
    'trợ lý, Ngũ Hành Sơn ở đâu?',
    'Này TRỢ LÝ: Ngũ Hành Sơn ở đâu?',
    'tro ly oi, Ngũ Hành Sơn ở đâu?',
    'Trợ lí ơi, Ngũ Hành Sơn ở đâu?',
    'Trợ lý ơi, Ngũ Hành Sơn ở đâu?'.normalize('NFD'),
  ])('accepts the keyword and preserves the question: %s', text => {
    expect(detectWake(text)).toEqual({ question: 'Ngũ Hành Sơn ở đâu?' });
  });

  it.each(['Trợ lý', 'Trợ lý ơi.', 'tro ly'])('accepts a standalone keyword: %s', text => {
    expect(detectWake(text)).toEqual({ question: '' });
  });

  it.each([
    'Phí bảo trì bao nhiêu?', 'MeetMate ơi, tìm giúp tôi.', 'Mít mết ơi, phí bao nhiêu?',
    'Mít ơi', 'Mẹ mình ơi', 'hỗ trợ lý thuyết', 'trợ lýthuyết', 'troly', 'trợ. Lý do là gì?',
  ])('does not trigger without the complete keyword: %s', text => {
    expect(detectWake(text)).toBeNull();
  });
});
