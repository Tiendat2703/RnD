import type { Msg, PostReply } from '../messages';
import { isLeftHeading, matchesLeaveLabel } from './leave';
import { applyEvent, isActive } from './panel';
import { CHAT_INPUT, CHAT_OPEN_BUTTON, CHAT_SEND_BUTTON, LEAVE_BUTTON } from './selectors';

// Injected both by the manifest and, for tabs opened before install, by scripting.executeScript.
declare global {
  interface Window { __meetmateContent?: boolean }
}

const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0;
const find = (selectors: string[]) => {
  for (const s of selectors) {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find(visible);
    if (el) return el;
  }
  return null;
};
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function waitFor(selectors: string[], ms: number): Promise<HTMLElement | null> {
  const end = Date.now() + ms;
  for (let el = find(selectors); ; el = find(selectors)) {
    if (el || Date.now() > end) return el;
    await sleep(150);
  }
}

function insert(input: HTMLElement, text: string): void {
  input.focus();
  // execCommand goes through Meet's own input handling, so its send button enables itself.
  const current = () => (input as HTMLTextAreaElement).value ?? input.textContent ?? '';
  if (document.execCommand('insertText', false, text) && current().includes(text.slice(0, 20))) return;
  if (input instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(input, text);
  } else input.textContent = text;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
}

async function postOne(text: string): Promise<PostReply> {
  let input = find(CHAT_INPUT);
  if (!input) {
    find(CHAT_OPEN_BUTTON)?.click();
    input = await waitFor(CHAT_INPUT, 3_000);
  }
  if (!input) return { ok: false, error: 'Không tìm thấy khung chat Meet. Mở khung chat rồi thử lại.' };
  insert(input, text);
  await sleep(120);
  const send = find(CHAT_SEND_BUTTON) as HTMLButtonElement | null;
  if (send && !send.disabled && send.getAttribute('aria-disabled') !== 'true') send.click();
  else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  // Meet clears the box once the message is sent; text still there means it was refused.
  await sleep(400);
  const left = (input as HTMLTextAreaElement).value ?? input.textContent ?? '';
  return left.includes(text.slice(0, 20)) ? { ok: false, error: 'Meet chưa nhận tin nhắn (có thể quá dài hoặc chat bị tắt).' } : { ok: true };
}

/**
 * Tells the background when the user leaves the call being listened to. Leaving does not reload
 * the page: Meet swaps its content for a "you left the meeting" screen in place. So watch both the
 * end-call button (by selector, then by label, since Meet's attributes change) and that screen.
 * Closing the tab is caught by the background through tabs.onRemoved.
 */
function watchLeave(): void {
  let reported = false;
  const tellLeft = () => {
    if (reported) return;
    reported = true;
    void chrome.runtime.sendMessage({ type: 'mm.left' } satisfies Msg).catch(() => undefined);
  };
  document.addEventListener('click', e => {
    const target = e.target as Element | null;
    if (!target || !isActive()) return;
    const control = target.closest('button, [role="button"]');
    const label = control?.getAttribute('aria-label') ?? control?.getAttribute('data-tooltip');
    if (target.closest(LEAVE_BUTTON.join(',')) || matchesLeaveLabel(label)) tellLeft();
  }, true);
  window.addEventListener('pagehide', () => isActive() && tellLeft());
  /** A short text node standing alone that is exactly the after-call heading. */
  const leftScreenShown = () => {
    const walker = document.createTreeWalker(document.body ?? document, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.nodeValue ?? '';
      if (t.length >= 10 && t.length <= 60 && isLeftHeading(t)) return true;
    }
    return false;
  };
  // Only scans while a session is open, so it costs nothing when idle.
  window.setInterval(() => {
    if (!isActive()) {
      reported = false; // a new session may report again
      return;
    }
    if (!reported && leftScreenShown()) tellLeft();
  }, 1500);
}

if (!window.__meetmateContent) {
  window.__meetmateContent = true;
  // One message at a time, spaced so Meet keeps their order.
  let chain: Promise<unknown> = Promise.resolve();
  watchLeave();
  chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
    if (msg.type === 'mm.panel') {
      applyEvent(msg.event);
      return false;
    }
    if (msg.type !== 'mm.content.post') return false;
    chain = chain.then(async () => {
      const reply = await postOne(msg.text).catch((e: unknown) => ({ ok: false as const, error: String(e) }));
      sendResponse(reply);
      await sleep(600);
    });
    return true;
  });
}
