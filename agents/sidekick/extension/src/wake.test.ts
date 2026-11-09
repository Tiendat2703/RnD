import { describe, expect, it } from 'vitest';
import { detectWake } from './wake';

describe('detectWake', () => {
  it('reads the spelling Blaze STT actually produces', () => {
    expect(detectWake('Mít mết ơi, ngân sách dự án là bao nhiêu?')).toEqual({ question: 'ngân sách dự án là bao nhiêu?' });
    expect(detectWake('Mít mết ơi cho mình hỏi hạn chót bàn giao là ngày nào?'))
      .toEqual({ question: 'cho mình hỏi hạn chót bàn giao là ngày nào?' });
  });

  it('accepts the English name and other common spellings, anywhere in the line', () => {
    expect(detectWake('MeetMate ơi, phí bảo trì bao nhiêu')?.question).toBe('phí bảo trì bao nhiêu');
    expect(detectWake('Meet Mate, đội có mấy người?')?.question).toBe('đội có mấy người?');
    expect(detectWake('à mà mít mét ơi tranh chấp xử ở đâu')?.question).toBe('tranh chấp xử ở đâu');
    expect(detectWake('Mitmet ơi')?.question).toBe('');
  });

  it('accepts the clipped "Mít ơi" STT sometimes produces, but not "mít" alone', () => {
    expect(detectWake('Mít ơi, đợt 2 thanh toán bao nhiêu phần trăm?')?.question).toBe('đợt 2 thanh toán bao nhiêu phần trăm?');
    expect(detectWake('Mua mít về ăn đi')).toBeNull();
  });

  it('returns an empty question when the name is said alone', () => {
    expect(detectWake('Mít mết ơi.')).toEqual({ question: '' });
  });

  it('ignores ordinary speech', () => {
    expect(detectWake('Phí bảo trì là 12 triệu mỗi tháng')).toBeNull();
    expect(detectWake('Mình gặp lại sau nhé')).toBeNull();
    expect(detectWake('He is my mate from school')).toBeNull();
  });
});
