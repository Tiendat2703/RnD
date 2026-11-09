import { isMeetingUrl } from './meet-url';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Msg, type PanelEvent, type PostReply, type Settings, type StartReply } from './messages';
import { EMPTY_VIEW, reduce, startView, type View } from './view';

const OFFSCREEN = 'offscreen.html';
// Blaze sends the last finals within about a second after audio stops (stt.ts CLOSE_GRACE_MS).
const STOP_GRACE_MS = 1_500;

// The toolbar click is the only gesture that lets an extension capture a tab: a button inside
// the side panel does not count (measured in Cốc Cốc 154). So the click itself opens the panel
// and, on a meeting tab, starts listening.
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);

chrome.action.onClicked.addListener(tab => {
  // sidePanel.open needs the user gesture, so it is called before anything awaits.
  if (tab.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined);
  if (tab.id === undefined || !isMeetingUrl(tab.url)) {
    // Never silent: say why the click did not start listening.
    void apply({
      kind: 'notice', level: 'info',
      message: tab.url
        ? 'Tab này không phải cuộc họp Google Meet. Mở tab cuộc họp rồi bấm biểu tượng MeetMate.'
        : 'MeetMate không đọc được địa chỉ tab này. Kiểm tra MeetMate được phép truy cập meet.google.com.',
    });
    return;
  }
  const tabId = tab.id;
  // Ask for the stream at once, while the click's grant is fresh; it expires within seconds.
  const streamId = chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  void startFromClick(tabId, streamId).catch((e: unknown) =>
    apply({ kind: 'state', state: 'error', detail: `Không bắt đầu được: ${e instanceof Error ? e.message : String(e)}` }));
});

async function startFromClick(tabId: number, streamId: Promise<string>): Promise<void> {
  const id = await streamId.catch((e: unknown) => e as Error);
  const view = await currentView();
  if (view.state === 'live' || view.state === 'starting' || view.state === 'reconnecting') {
    await apply({ kind: 'notice', level: 'info', message: 'MeetMate đang nghe. Bấm Dừng trong bảng này nếu muốn dừng.' });
    return;
  }
  await apply({ kind: 'notice', level: 'info', message: 'Đang bắt đầu nghe…' });
  if (id instanceof Error) {
    await apply({ kind: 'state', state: 'error', detail: `Không ghi âm được tab Meet: ${id.message}` });
    return;
  }
  const blaze = (await chrome.storage.local.get(STORAGE_KEYS.blaze))[STORAGE_KEYS.blaze];
  if (!String(blaze ?? '').trim()) {
    await apply({ kind: 'state', state: 'error', detail: 'Nhập khóa Blaze trong phần Cài đặt, rồi bấm lại biểu tượng MeetMate.' });
    return;
  }
  // The offscreen page cannot show the microphone prompt; ask once in a visible tab first.
  const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);
  if (mic?.state === 'prompt') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission.html') });
    await apply({ kind: 'notice', level: 'info', message: 'Cấp quyền micro trong tab vừa mở, rồi quay lại tab Meet và bấm biểu tượng MeetMate lần nữa.' });
    return;
  }
  await start(tabId, id);
}

// The service worker can be stopped at any time, so the view lives in session storage and
// every change is a serialized read-modify-write.
let queue: Promise<unknown> = Promise.resolve();
function update(fn: (view: View) => View): Promise<View> {
  const next = queue.then(async () => {
    const stored = (await chrome.storage.session.get(STORAGE_KEYS.view))[STORAGE_KEYS.view] as View | undefined;
    const view = fn(stored ?? EMPTY_VIEW);
    await chrome.storage.session.set({ [STORAGE_KEYS.view]: view });
    return view;
  });
  queue = next.catch(() => undefined);
  return next;
}
const apply = (event: PanelEvent) => update(view => reduce(view, event));
const currentView = () => update(view => view);

async function ensureOffscreen(): Promise<void> {
  const url = chrome.runtime.getURL(OFFSCREEN);
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType], documentUrls: [url] });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN,
    reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
    justification: 'Ghi âm tab Google Meet và micro để nhận dạng giọng nói trong cuộc họp',
  });
}

async function closeOffscreen(): Promise<void> {
  await chrome.offscreen.closeDocument().catch(() => undefined);
}

async function start(tabId: number, streamId: string | null): Promise<StartReply> {
  const view = await currentView();
  if (view.state === 'live' || view.state === 'starting' || view.state === 'reconnecting') await stop();
  const stored = await chrome.storage.local.get([STORAGE_KEYS.blaze, STORAGE_KEYS.exa, STORAGE_KEYS.settings]);
  const blazeApiKey = String(stored[STORAGE_KEYS.blaze] ?? '').trim();
  if (!blazeApiKey) return { ok: false, error: 'Thiếu khóa Blaze. Nhập khóa trong phần Cài đặt.' };
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] as Partial<Settings> | undefined) };
  await update(() => startView(tabId));
  try {
    await ensureOffscreen();
    const reply = (await chrome.runtime.sendMessage({
      type: 'mm.offscreen.start', streamId, blazeApiKey, exaApiKey: String(stored[STORAGE_KEYS.exa] ?? '').trim(), settings,
    } satisfies Msg)) as StartReply | undefined;
    if (!reply?.ok) throw new Error(reply?.error ?? 'Không mở được bộ ghi âm');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await closeOffscreen();
    await apply({ kind: 'state', state: 'error', detail: message });
    return { ok: false, error: message };
  }
}

async function stop(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'mm.offscreen.stop' } satisfies Msg).catch(() => undefined);
  await new Promise(r => setTimeout(r, STOP_GRACE_MS));
  await closeOffscreen();
  await update(view => (view.state === 'error' ? view : { ...view, state: 'idle', detail: undefined }));
}

async function sendToTab(tabId: number, text: string): Promise<PostReply> {
  const message: Msg = { type: 'mm.content.post', text };
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as PostReply;
  } catch {
    // The Meet tab was open before the extension loaded, so it has no content script yet.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return (await chrome.tabs.sendMessage(tabId, message)) as PostReply;
  }
}

// Chat messages go out one at a time, in order, across all cards.
let posting: Promise<void> = Promise.resolve();
function post(cardId: string, messages: string[]): void {
  posting = posting.then(async () => {
    const { tabId } = await currentView();
    let error = tabId === undefined ? 'Không biết tab Meet nào để gửi' : '';
    for (const text of messages) {
      if (error) break;
      const reply = await sendToTab(tabId!, text).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      if (!reply?.ok) error = reply?.error ?? 'Không gửi được vào chat Meet';
    }
    await apply(error ? { kind: 'chat', cardId, status: 'failed', detail: error } : { kind: 'chat', cardId, status: 'sent' });
  });
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'mm.start':
      void start(msg.tabId, msg.streamId).then(sendResponse);
      return true;
    case 'mm.stop':
      void stop().then(() => sendResponse({ ok: true }));
      return true;
    case 'mm.event':
      if (msg.event.kind !== 'partial') void apply(msg.event);
      return false;
    case 'mm.post':
      post(msg.cardId, msg.messages);
      return false;
    default:
      return false;
  }
});

chrome.tabs.onRemoved.addListener(async tabId => {
  const view = await currentView();
  if (view.tabId === tabId && view.state !== 'idle' && view.state !== 'error') await stop();
});
