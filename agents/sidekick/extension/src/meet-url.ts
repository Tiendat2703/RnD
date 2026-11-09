// A meeting code is three letter groups (abc-defg-hij). Meet serves rooms both at the root and
// under a path (seen live: meet.google.com/meet/ubu-dmfq-ygt), so the code may follow any path.
const MEETING = /^https:\/\/meet\.google\.com\/(?:[^?#]*\/)?[a-z]{3,}-[a-z]{3,}-[a-z]{3,}(?:[/?#]|$)/i;

export const isMeetingUrl = (url: string | undefined): boolean => MEETING.test(url ?? '');

type TabLike = { id?: number; url?: string; active?: boolean };

/**
 * The tab to capture: the active tab when it is a meeting, otherwise the active (then any)
 * meeting tab, since a browser may report the side panel's window differently.
 */
export function pickMeetingTab<T extends TabLike>(active: T | undefined, meetTabs: T[]): T | null {
  if (active?.id !== undefined && isMeetingUrl(active.url)) return active;
  const meetings = meetTabs.filter(t => t.id !== undefined && isMeetingUrl(t.url));
  return meetings.find(t => t.active) ?? meetings[0] ?? null;
}
