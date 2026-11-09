import { CHAT_GAP_MS } from '../config';
import type { Msg } from '../messages';
import { isActive, applyEvent } from './panel';
import { isLeftHeading, matchesLeaveLabel } from './leave';
import { CHAT_INPUT, CHAT_OPEN_BUTTON, CHAT_SEND_BUTTON, LEAVE_BUTTON } from './selectors';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function find<T extends Element>(selectors: string[]): T | null {
  for (const s of selectors) {
    const el = document.querySelector<T>(s);
    if (el) return el;
  }
  return null;
}

async function findInput(): Promise<HTMLTextAreaElement | null> {
  let input = find<HTMLTextAreaElement>(CHAT_INPUT);
  if (input) return input;
  find<HTMLButtonElement>(CHAT_OPEN_BUTTON)?.click();
  for (let waited = 0; waited < 3000; waited += 200) {
    await sleep(200);
    input = find<HTMLTextAreaElement>(CHAT_INPUT);
    if (input) return input;
  }
  return null;
}

async function send(text: string): Promise<boolean> {
  const input = await findInput();
  if (!input) return false;
  input.focus();
  document.execCommand('insertText', false, text);
  const button = find<HTMLButtonElement>(CHAT_SEND_BUTTON);
  if (button) button.click();
  else {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
    );
  }
  return true;
}

// Tin gửi tuần tự, mỗi tin cách nhau CHAT_GAP_MS.
let queue: Promise<unknown> = Promise.resolve();

// Background có thể chèn lại script này vào một tab đã mở trước khi nạp extension;
// cờ này giữ cho một tab không bao giờ có hai listener (tin sẽ bị gõ hai lần).
const guard = window as unknown as { __meetmateContent?: boolean };
if (!guard.__meetmateContent) {
  guard.__meetmateContent = true;

  // Rời cuộc gọi: bấm nút "Rời cuộc gọi" hoặc trang bị điều hướng đi. Đóng tab thì
  // background tự biết qua tabs.onRemoved.
  let reported = false;
  const tellLeft = () => {
    if (reported) return;
    reported = true;
    void chrome.runtime.sendMessage({ type: 'meetmate.left' } satisfies Msg);
  };
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      if (!target || !isActive()) return;
      // theo selector đã biết, rồi theo nhãn chữ của nút (selector của Meet hay đổi)
      const control = target.closest('button, [role="button"]');
      const label = control?.getAttribute('aria-label') ?? control?.getAttribute('data-tooltip');
      if (target.closest(LEAVE_BUTTON.join(',')) || matchesLeaveLabel(label)) tellLeft();
    },
    true,
  );
  window.addEventListener('pagehide', () => isActive() && tellLeft());

  // Rời cuộc gọi không tải lại trang: Meet đổi nội dung tại chỗ sang "Bạn đã rời khỏi
  // cuộc họp". Canh màn hình đó (chỉ khi có phiên đang mở, nên không tốn gì lúc rảnh).
  /** Có đoạn chữ ngắn, đứng riêng, đúng câu của màn hình sau cuộc gọi không. */
  const leftScreenShown = () => {
    const walker = document.createTreeWalker(document.body ?? document, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.nodeValue ?? '';
      if (t.length >= 10 && t.length <= 60 && isLeftHeading(t)) return true;
    }
    return false;
  };
  window.setInterval(() => {
    if (!isActive()) {
      reported = false; // phiên mới được phép báo lại
      return;
    }
    if (reported) return;
    if (leftScreenShown()) tellLeft();
  }, 1500);

  chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
    if (msg.type === 'meetmate.panel') {
      applyEvent(msg.event);
      return false;
    }
    if (msg.type !== 'meetmate.post') return false;
    queue = queue.then(async () => {
      const ok = await send(msg.text);
      sendResponse({ ok });
      await sleep(CHAT_GAP_MS);
    });
    return true; // trả lời bất đồng bộ
  });
}
