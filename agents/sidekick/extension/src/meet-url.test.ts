import { describe, expect, it } from 'vitest';
import { isMeetingUrl, pickMeetingTab } from './meet-url';

describe('isMeetingUrl', () => {
  it('accepts meeting rooms at the root and under a path', () => {
    expect(isMeetingUrl('https://meet.google.com/abc-defg-hij')).toBe(true);
    expect(isMeetingUrl('https://meet.google.com/meet/ubu-dmfq-ygt')).toBe(true);
    expect(isMeetingUrl('https://meet.google.com/abc-defg-hij?authuser=1')).toBe(true);
    expect(isMeetingUrl('https://meet.google.com/abc-defg-hij/')).toBe(true);
  });

  it('rejects the Meet home page, other sites and missing URLs', () => {
    expect(isMeetingUrl('https://meet.google.com/')).toBe(false);
    expect(isMeetingUrl('https://meet.google.com/landing')).toBe(false);
    expect(isMeetingUrl('https://example.com/abc-defg-hij')).toBe(false);
    expect(isMeetingUrl(undefined)).toBe(false);
  });
});

describe('pickMeetingTab', () => {
  const meet = { id: 1, url: 'https://meet.google.com/meet/ubu-dmfq-ygt', active: true };
  it('prefers the active tab when it is a meeting', () => {
    expect(pickMeetingTab(meet, [])).toBe(meet);
  });

  it('falls back to a meeting tab when the active tab is not one', () => {
    const other = { id: 2, url: 'https://youtube.com', active: true };
    const background = { id: 3, url: 'https://meet.google.com/abc-defg-hij', active: false };
    expect(pickMeetingTab(other, [background, meet])).toBe(meet);
    expect(pickMeetingTab(undefined, [background])).toBe(background);
    expect(pickMeetingTab(other, [])).toBeNull();
  });
});
