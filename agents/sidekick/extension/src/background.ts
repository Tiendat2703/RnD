import {
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_WAITING,
  type ExtInfo,
  type ExtToWeb,
  type SessionDraft,
} from '../../../../lib/bridgeProtocol';
import { storedDocsOf } from './docs/session';
import { replaceDocs } from './docs/store';
import { isMeetingUrl } from './meet-url';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Msg, type PanelEvent, type PostReply, type Settings, type StartReply } from './messages';
import { currentId, deleteSession, finishCurrent, listSessions, markSynced, recordEvent, startSession } from './sessionStore';
import { EMPTY_VIEW, reduce, startView, type View } from './view';
import { webEventsOf, type WebContext } from './webEvents';

const OFFSCREEN = 'offscreen.html';
// Blaze sends the last finals within about a second after audio stops (stt.ts CLOSE_GRACE_MS).
const STOP_GRACE_MS = 1_500;
// session storage: startedAt/maxSources of the meeting being recorded (the worker may restart mid-meeting)
const WEB_CTX_KEY = 'webCtx';
const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';
const DASHBOARD_PATH = '/dashboard/callSessions';
const STATUS_STOPPED = 'Đã dừng';
const STATUS_RECONNECTING = 'Mất kết nối nhận dạng giọng nói, đang nối lại…';

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
  if (isRunning(view)) {
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

const isRunning = (view: View) => view.state === 'live' || view.state === 'starting' || view.state === 'reconnecting';

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
const apply = (event: PanelEvent) => {
  void forward(event).catch((e: unknown) => console.warn('[MeetMate] không chuyển được sự kiện cho web', e));
  return update(view => reduce(view, event));
};
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
  if (isRunning(view)) await stop('stopped');
  const stored = await chrome.storage.local.get([STORAGE_KEYS.blaze, STORAGE_KEYS.exa, STORAGE_KEYS.settings]);
  const blazeApiKey = String(stored[STORAGE_KEYS.blaze] ?? '').trim();
  if (!blazeApiKey) return { ok: false, error: 'Thiếu khóa Blaze. Nhập khóa trong phần Cài đặt.' };
  const draft = await getDraft();
  const saved: Settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] as Partial<Settings> | undefined) };
  // A meeting prepared on the web console with auto-post off never posts to the Meet chat.
  const settings: Settings = draft && !draft.autoPost ? { ...saved, postToChat: false } : saved;
  // Documents belong to the session the web prepared; a meeting started without one has none.
  if (!draft) await setDocuments([]);
  await update(() => startView(tabId));
  await beginRecording(draft);
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

/** Stops listening; `reason` is how the recorded session ends (null: leave it to the caller). */
async function stop(reason: EndReason | null): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'mm.offscreen.stop' } satisfies Msg).catch(() => undefined);
  await new Promise(r => setTimeout(r, STOP_GRACE_MS));
  await closeOffscreen();
  await update(view => (view.state === 'error' ? view : { ...view, state: 'idle', detail: undefined }));
  if (reason) await endRecording(reason);
}

async function sendToTab(tabId: number, message: Msg): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // The Meet tab was open before the extension loaded, so it has no content script yet.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

// Research cards whose chat messages count as posted sources on the web (doc findings do not).
const researchCards = new Set<string>();

// Chat messages go out one at a time, in order, across all cards.
let posting: Promise<void> = Promise.resolve();
function post(cardId: string, messages: string[]): void {
  posting = posting.then(async () => {
    const { tabId } = await currentView();
    let error = tabId === undefined ? 'Không biết tab Meet nào để gửi' : '';
    for (const text of messages) {
      if (error) break;
      const reply = (await sendToTab(tabId!, { type: 'mm.content.post', text }).catch((e: unknown) => ({
        ok: false as const, error: e instanceof Error ? e.message : String(e),
      }))) as PostReply | undefined;
      if (!reply?.ok) error = reply?.error ?? 'Không gửi được vào chat Meet';
      else if (researchCards.has(cardId)) await emit({ type: 'posted', text });
    }
    await apply(error ? { kind: 'chat', cardId, status: 'failed', detail: error } : { kind: 'chat', cardId, status: 'sent' });
  });
}

// ---------------------------------------------------------------------------------------------
// Web console, saved sessions and the in-Meet panel. The web talks through bridge.ts; every
// meeting is recorded in chrome.storage.local as it happens (sessionStore.ts), so closing the
// web or the Meet tab never loses what was already heard.

type EndReason = Extract<ExtToWeb, { type: 'ended' }>['reason'];

async function getDraft(): Promise<SessionDraft | null> {
  const r = await chrome.storage.session.get(STORAGE_KEYS.session);
  return (r[STORAGE_KEYS.session] as SessionDraft | undefined) ?? null;
}

async function getContext(): Promise<WebContext | null> {
  const r = await chrome.storage.session.get(WEB_CTX_KEY);
  return (r[WEB_CTX_KEY] as WebContext | undefined) ?? null;
}

async function beginRecording(draft: SessionDraft | null): Promise<void> {
  researchCards.clear();
  // a session the web did not prepare is still recorded, with a default name
  await startSession(draft?.id ?? `ext-${Date.now()}`, draft?.title ?? 'Cuộc họp Google Meet', draft?.kind ?? 'khac');
  await chrome.storage.session.set({ [WEB_CTX_KEY]: { startedAt: Date.now(), maxSources: draft?.sources ?? 4 } satisfies WebContext });
  await setStatus(STATUS_STARTING);
}

/**
 * Closes the recorded session and, when the meeting itself ended, opens the web. Serialized and
 * idempotent: closing the Meet tab reports the end twice (tabs.onRemoved and the audio track).
 */
let ending: Promise<void> = Promise.resolve();
function endRecording(reason: EndReason): Promise<void> {
  const next = ending.then(async () => {
    if (!(await currentId())) return;
    await finishCurrent();
    await chrome.storage.session.remove(WEB_CTX_KEY);
    await setStatus(STATUS_STOPPED);
    await emit({ type: 'ended', reason });
    await chrome.storage.session.remove(STORAGE_KEYS.session);
    if (reason === 'left' || reason === 'meet-closed') {
      await goToDashboard().catch(e => console.warn('[MeetMate] không chuyển hướng được', e));
    }
  });
  ending = next.catch(() => undefined);
  return next;
}

let lineSeq = 0;
/** Mirrors a pipeline event to the web, the saved session and the in-Meet panel. */
async function forward(event: PanelEvent): Promise<void> {
  if (event.kind === 'state') {
    if (event.state === 'live') await setStatus(STATUS_RUNNING);
    else if (event.state === 'starting') await setStatus(STATUS_STARTING);
    else if (event.state === 'reconnecting') await setStatus(STATUS_RECONNECTING);
    else if (event.state === 'error') {
      await setStatus(event.detail ?? 'Lỗi');
      await emit({ type: 'error', message: event.detail ?? 'Lỗi' });
      await endRecording('error');
    } else if (event.state === 'idle') {
      // the offscreen page reports idle only when the Meet tab stopped producing audio
      await endRecording('meet-closed');
    }
    return;
  }
  if (event.kind === 'card' && event.card.kind === 'research') researchCards.add(event.card.id);
  const ctx = await getContext();
  if (!ctx) return; // nothing is being recorded (e.g. a notice before listening starts)
  for (const e of webEventsOf(event, ctx, () => `l-${event.kind === 'final' ? event.at : Date.now()}-${++lineSeq}`)) await emit(e);
}

async function setStatus(status: string): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEYS.status]: status });
  const draft = await getDraft();
  const view = await currentView();
  await emit({
    type: 'status',
    status,
    running: status === STATUS_RUNNING,
    active: isRunning(view) && status !== STATUS_STOPPED,
    mock: false,
    sessionId: (await currentId()) ?? draft?.id ?? null,
  });
}

/** Saves the event first (so nothing is lost if the web is closed), then tells the panel and the web. */
async function emit(event: ExtToWeb): Promise<void> {
  await recordEvent(event);
  const { tabId } = await currentView();
  if (tabId !== undefined) await sendToTab(tabId, { type: 'mm.panel', event }).catch(() => undefined);
  const r = await chrome.storage.session.get(STORAGE_KEYS.webTab);
  const webTab = r[STORAGE_KEYS.webTab] as number | undefined;
  if (typeof webTab !== 'number') return;
  await chrome.tabs.sendMessage(webTab, { type: 'mm.toweb', event } satisfies Msg).catch(() => undefined);
}

async function info(): Promise<ExtInfo> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.blaze);
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
  const status = (await chrome.storage.session.get(STORAGE_KEYS.status))[STORAGE_KEYS.status] as string | undefined;
  const draft = await getDraft();
  return {
    version: chrome.runtime.getManifest().version,
    // Exa is optional: without it MeetMate still transcribes and checks documents
    keysSet: !!String(stored[STORAGE_KEYS.blaze] ?? '').trim(),
    mock: false,
    meetTabs: tabs.filter(t => isMeetingUrl(t.url)).length,
    running: isRunning(await currentView()),
    status: status ?? '',
    sessionId: (await currentId()) ?? draft?.id ?? null,
  };
}

/** Replaces the document library and tells the offscreen page and the side panel to reload it. */
async function setDocuments(docs: Parameters<typeof replaceDocs>[0]): Promise<void> {
  await replaceDocs(docs);
  await chrome.runtime.sendMessage({ type: 'mm.docs.changed' } satisfies Msg).catch(() => undefined);
}

/** The draft kept in session storage: everything but the documents, which go to IndexedDB. */
function cleanDraft(raw: SessionDraft): SessionDraft {
  return {
    id: String(raw.id).slice(0, 64),
    title: String(raw.title).slice(0, 120),
    kind: raw.kind,
    sources: Math.max(1, Math.min(4, Number(raw.sources) || 4)),
    autoPost: raw.autoPost !== false,
  };
}

/**
 * After the meeting, take the user to the web console's meeting list: the Meet tab (if still
 * open) goes straight there; otherwise the web tab that talked to the bridge, or a new tab.
 */
async function goToDashboard(): Promise<void> {
  const o = await chrome.storage.local.get(STORAGE_KEYS.webOrigin);
  const url = `${(o[STORAGE_KEYS.webOrigin] as string | undefined) ?? DEFAULT_WEB_ORIGIN}${DASHBOARD_PATH}`;
  const { tabId } = await currentView();
  if (tabId !== undefined) {
    try {
      await chrome.tabs.update(tabId, { url, active: true });
      return;
    } catch {
      // the Meet tab is closed
    }
  }
  const s = await chrome.storage.session.get(STORAGE_KEYS.webTab);
  const webTab = s[STORAGE_KEYS.webTab] as number | undefined;
  if (typeof webTab === 'number') {
    try {
      const tab = await chrome.tabs.get(webTab);
      // already on the list: bring it forward without reloading (the web syncs sessions itself)
      const onPage = (tab.url ?? '').split('?')[0].endsWith(DASHBOARD_PATH);
      await chrome.tabs.update(webTab, onPage ? { active: true } : { url, active: true });
      if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch {
      // the web tab is closed too
    }
  }
  await chrome.tabs.create({ url });
}

/** The user left the meeting being listened to (end-call button, navigated away, tab closed). */
async function endFromMeet(tabId: number, reason: 'left' | 'meet-closed'): Promise<void> {
  const view = await currentView();
  if (view.tabId !== tabId || !(await currentId())) return;
  try {
    await stop(null);
  } finally {
    // whichever cleanup step fails, the session is closed and the user reaches the web
    await endRecording(reason);
  }
}

async function handleWeb(web: Extract<Msg, { type: 'mm.web' }>['msg']): Promise<ExtToWeb | undefined> {
  switch (web.type) {
    case 'ping':
      return { type: 'pong', info: await info() };
    case 'session.prepare':
      await setDocuments(storedDocsOf(web.session.documents));
      await chrome.storage.session.set({ [STORAGE_KEYS.session]: cleanDraft(web.session) });
      await setStatus(STATUS_WAITING);
      return undefined;
    case 'session.stop':
      await stop('stopped');
      return undefined;
    case 'sessions.list':
      return { type: 'sessions', sessions: await listSessions() };
    case 'sessions.delete':
      await deleteSession(String(web.id));
      return undefined;
    case 'sessions.markSynced':
      await markSynced(String(web.id), Number(web.syncedAt));
      return undefined;
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'mm.start':
      void start(msg.tabId, msg.streamId).then(sendResponse);
      return true;
    case 'mm.stop':
      void stop('stopped').then(() => sendResponse({ ok: true }));
      return true;
    case 'mm.event':
      if (msg.event.kind !== 'partial') void apply(msg.event);
      return false;
    case 'mm.post':
      post(msg.cardId, msg.messages);
      return false;
    case 'mm.web':
      // remember the web console tab, to know where events go and where to return after a meeting
      if (sender.tab?.id !== undefined) {
        void chrome.storage.session.set({ [STORAGE_KEYS.webTab]: sender.tab.id });
        if (sender.tab.url) void chrome.storage.local.set({ [STORAGE_KEYS.webOrigin]: new URL(sender.tab.url).origin });
      }
      void handleWeb(msg.msg).then(sendResponse, () => sendResponse(undefined));
      return true;
    case 'mm.left':
      if (sender.tab?.id !== undefined) void endFromMeet(sender.tab.id, 'left');
      return false;
    default:
      return false;
  }
});

// Closing the Meet tab being listened to ends the meeting.
chrome.tabs.onRemoved.addListener(tabId => {
  void endFromMeet(tabId, 'meet-closed');
});

// After leaving the call Meet may navigate the tab away from the meeting.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !isMeetingUrl(changeInfo.url)) void endFromMeet(tabId, 'left');
});
