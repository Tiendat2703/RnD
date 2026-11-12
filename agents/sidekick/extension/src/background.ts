import {
  STATUS_RUNNING,
  STATUS_STARTING,
  STATUS_WAITING,
  type ExtInfo,
  type ExtToWeb,
  type SessionDraft,
} from '../../../../lib/bridgeProtocol';
import {
  MOCK_KEY,
  SESSION_KEY,
  RUN_KEY,
  STAGE_KEY,
  STATUS_KEY,
  TAB_KEY,
  WEB_ORIGIN_KEY,
  WEB_TAB_KEY,
  type Msg,
} from './messages';
import { deleteSession, finishCurrent, listSessions, markSynced, recordEvent, startSession } from './sessionStore';

// Phòng họp có hai dạng URL: meet.google.com/abc-defg-hij và meet.google.com/meet/abc-defg-hij.
const MEET_MEETING_URL = /^https:\/\/meet\.google\.com\/(?:meet\/)?[a-z]{3}-[a-z]{4}-[a-z]{3}/;

async function getStatus(): Promise<string> {
  const r = (await chrome.storage.session.get(STATUS_KEY)) as { [STATUS_KEY]?: string };
  return r[STATUS_KEY] ?? '';
}

async function isMock(): Promise<boolean> {
  const r = (await chrome.storage.local.get(MOCK_KEY)) as { [MOCK_KEY]?: boolean };
  return r[MOCK_KEY] === true;
}

async function getSession(): Promise<SessionDraft | null> {
  const r = (await chrome.storage.session.get(SESSION_KEY)) as { [SESSION_KEY]?: SessionDraft };
  return r[SESSION_KEY] ?? null;
}

/** Đẩy sự kiện vào panel trong mọi tab Meet đang họp. */
async function emitPanel(event: ExtToWeb): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    const message = { type: 'meetmate.panel', event } satisfies Msg;
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      // tab mở trước khi nạp extension nên chưa có content script: chèn rồi gửi lại
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        // không chèn được (trang chưa sẵn sàng): bỏ qua, sự kiện sau sẽ thử lại
      }
    }
  }
}

/** Gửi một sự kiện về trang web console (nếu còn mở) và panel trong Meet. */
async function emit(event: ExtToWeb): Promise<void> {
  await recordEvent(event); // lưu trước khi gửi: web đóng cũng không mất dữ liệu
  // bước pipeline hiện tại, để popup vẽ hàng sáu bước
  if (event.type === 'stage') {
    if (event.stage) await chrome.storage.session.set({ [STAGE_KEY]: event.stage });
    else await chrome.storage.session.remove(STAGE_KEY);
  }
  await emitPanel(event);
  const r = (await chrome.storage.session.get(WEB_TAB_KEY)) as { [WEB_TAB_KEY]?: number };
  const tabId = r[WEB_TAB_KEY];
  if (typeof tabId !== 'number') return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'meetmate.toweb', event } satisfies Msg);
  } catch {
    // tab web đã đóng hoặc chưa tải content script
  }
}

async function isActive(): Promise<boolean> {
  const r = (await chrome.storage.session.get(RUN_KEY)) as { [RUN_KEY]?: boolean };
  return r[RUN_KEY] === true;
}

async function setStatus(status: string): Promise<void> {
  // "Đang chạy" mở phiên, "Đã dừng" đóng nó; mọi dòng khác (cảnh báo giữa phiên) giữ nguyên
  if (status === STATUS_RUNNING) await chrome.storage.session.set({ [RUN_KEY]: true });
  else if (status === 'Đã dừng') await chrome.storage.session.remove(RUN_KEY);
  await chrome.storage.session.set({ [STATUS_KEY]: status });
  const session = await getSession();
  await emit({
    type: 'status',
    status,
    running: status === STATUS_RUNNING,
    active: await isActive(),
    mock: await isMock(),
    sessionId: session?.id ?? null,
  });
}

async function hasOffscreen(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  return contexts.length > 0;
}

async function info(): Promise<ExtInfo> {
  const keys = (await chrome.storage.local.get(['blazeApiKey', 'exaApiKey'])) as {
    blazeApiKey?: string;
    exaApiKey?: string;
  };
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
  const mock = await isMock();
  const status = await getStatus();
  const session = await getSession();
  return {
    version: chrome.runtime.getManifest().version,
    keysSet: (!!keys.blazeApiKey && !!keys.exaApiKey) || mock,
    mock,
    meetTabs: tabs.filter((t) => MEET_MEETING_URL.test(t.url ?? '')).length,
    running: await isActive(),
    status,
    sessionId: session?.id ?? null,
  };
}

/** Dừng offscreen và dọn phiên. `notifyWeb` false khi chính web đã yêu cầu dừng. */
async function stopEverything(notifyWeb: boolean): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'meetmate.offscreen.stop' } satisfies Msg);
  } catch {
    // offscreen chưa mở
  }
  if (await hasOffscreen()) await chrome.offscreen.closeDocument();
  await finishCurrent();
  await chrome.storage.session.remove(STAGE_KEY);
  await setStatus('Đã dừng');
  if (notifyWeb) await emit({ type: 'ended', reason: 'stopped' });
  await chrome.storage.session.remove(SESSION_KEY);
}

const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';
const DASHBOARD_PATH = '/dashboard/callSessions';

/**
 * Họp xong thì đưa người dùng sang danh sách cuộc họp của web console: tab Meet (nếu
 * còn) được chuyển hướng thẳng tới đó. Tab Meet đã đóng thì dùng tab web đã mở, hoặc
 * mở tab mới. Origin lấy từ tab web đã bắt tay (có thể là cổng khác 3000).
 */
async function goToDashboard(): Promise<void> {
  const o = (await chrome.storage.local.get(WEB_ORIGIN_KEY)) as { [WEB_ORIGIN_KEY]?: string };
  const url = `${o[WEB_ORIGIN_KEY] ?? DEFAULT_WEB_ORIGIN}${DASHBOARD_PATH}`;
  const s = (await chrome.storage.session.get([TAB_KEY, WEB_TAB_KEY])) as {
    [TAB_KEY]?: number;
    [WEB_TAB_KEY]?: number;
  };

  if (typeof s[TAB_KEY] === 'number') {
    try {
      await chrome.tabs.update(s[TAB_KEY], { url, active: true });
      return;
    } catch {
      // tab Meet đã đóng
    }
  }
  if (typeof s[WEB_TAB_KEY] === 'number') {
    try {
      const tab = await chrome.tabs.get(s[WEB_TAB_KEY]);
      // đang ở đúng trang thì chỉ đưa lên trước, không tải lại (web tự đồng bộ phiên)
      const onPage = (tab.url ?? '').split('?')[0].endsWith(DASHBOARD_PATH);
      await chrome.tabs.update(s[WEB_TAB_KEY], onPage ? { active: true } : { url, active: true });
      if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch {
      // tab web cũng đã đóng
    }
  }
  await chrome.tabs.create({ url });
}

/** Người dùng rời Meet (nút Rời cuộc gọi, tab điều hướng đi, hoặc đóng tab): kết thúc phiên đang nghe. */
async function endFromMeet(tabId: number, reason: 'left' | 'meet-closed'): Promise<void> {
  const { [TAB_KEY]: meetTab } = (await chrome.storage.session.get(TAB_KEY)) as {
    [TAB_KEY]?: number;
  };
  const active = await isActive();
  console.info('[MeetMate] rời họp?', { tabId, meetTab, reason, active });
  if (meetTab !== tabId || !active) return;
  try {
    await stopEverything(false);
    await emit({ type: 'ended', reason });
  } catch (e) {
    console.warn('[MeetMate] lỗi khi kết thúc phiên', e);
  } finally {
    // dù bước dọn dẹp nào lỗi thì người dùng vẫn phải được đưa sang web
    await goToDashboard().catch((e) => console.warn('[MeetMate] không chuyển hướng được', e));
  }
}

function cleanSession(raw: SessionDraft): SessionDraft {
  return {
    id: String(raw.id).slice(0, 64),
    title: String(raw.title).slice(0, 120),
    kind: raw.kind,
    sources: Math.max(1, Math.min(4, Number(raw.sources) || 4)),
    autoPost: raw.autoPost !== false,
  };
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  if (msg.type === 'meetmate.web') {
    // lệnh từ trang web console: ghi nhớ tab web để biết gửi sự kiện về đâu
    if (sender.tab?.id !== undefined) {
      void chrome.storage.session.set({ [WEB_TAB_KEY]: sender.tab.id });
      if (sender.tab.url) {
        void chrome.storage.local.set({ [WEB_ORIGIN_KEY]: new URL(sender.tab.url).origin });
      }
    }
    void (async () => {
      const web = msg.msg;
      if (web.type === 'ping') {
        sendResponse({ type: 'pong', info: await info() } satisfies ExtToWeb);
      } else if (web.type === 'session.prepare') {
        await chrome.storage.session.set({ [SESSION_KEY]: cleanSession(web.session) });
        await setStatus(STATUS_WAITING);
        sendResponse(undefined);
      } else if (web.type === 'session.stop') {
        await stopEverything(false);
        sendResponse(undefined);
      } else if (web.type === 'sessions.delete') {
        await deleteSession(String(web.id));
        sendResponse(undefined);
      } else if (web.type === 'sessions.markSynced') {
        await markSynced(String(web.id), Number(web.syncedAt));
        sendResponse(undefined);
      } else if (web.type === 'sessions.list') {
        sendResponse({ type: 'sessions', sessions: await listSessions() } satisfies ExtToWeb);
      }
    })();
    return true; // trả lời bất đồng bộ
  }
  if (msg.type === 'meetmate.left') {
    if (sender.tab?.id !== undefined) void endFromMeet(sender.tab.id, 'left');
    return false;
  }
  void handle(msg);
  return false;
});

async function handle(msg: Msg): Promise<void> {
  if (msg.type === 'meetmate.start') {
    const keys = (await chrome.storage.local.get(['blazeApiKey', 'exaApiKey'])) as {
      blazeApiKey?: string;
      exaApiKey?: string;
    };
    const mock = await isMock();
    if (!mock && (!keys.blazeApiKey || !keys.exaApiKey)) {
      await setStatus('Thiếu khóa Blaze hoặc Exa');
      return;
    }
    const session = await getSession();
    await chrome.storage.session.set({ [TAB_KEY]: msg.tabId });
    // phiên được lưu ngay từ đầu; không có phiên do web gửi thì tự đặt tên
    await startSession(
      session?.id ?? `ext-${Date.now()}`,
      session?.title ?? 'Cuộc họp Google Meet',
      session?.kind ?? 'khac',
    );
    if (!(await hasOffscreen())) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Capture Google Meet audio for transcription',
      });
    }
    await setStatus(STATUS_STARTING);
    await chrome.runtime.sendMessage({
      type: 'meetmate.offscreen.start',
      streamId: msg.streamId,
      blazeApiKey: keys.blazeApiKey ?? '',
      exaApiKey: keys.exaApiKey ?? '',
      prefs: { sources: session?.sources ?? 4, autoPost: session?.autoPost ?? true },
      mock,
    } satisfies Msg);
  } else if (msg.type === 'meetmate.stop') {
    await stopEverything(true); // bấm Dừng trong popup: web cần biết để kết thúc phiên
  } else if (msg.type === 'meetmate.post') {
    const { [TAB_KEY]: tabId } = (await chrome.storage.session.get(TAB_KEY)) as {
      [TAB_KEY]?: number;
    };
    if (typeof tabId !== 'number') return;
    try {
      const reply = (await chrome.tabs.sendMessage(tabId, msg)) as { ok?: boolean } | undefined;
      if (reply?.ok) {
        await emit({ type: 'posted', text: msg.text });
      } else {
        await setStatus('Không gửi được vào chat Meet');
        await emit({ type: 'error', message: 'Không gửi được vào chat Meet' });
      }
    } catch {
      await setStatus('Không gửi được vào chat Meet');
      await emit({ type: 'error', message: 'Không gửi được vào chat Meet' });
    }
  } else if (msg.type === 'meetmate.status') {
    await setStatus(msg.status);
  } else if (msg.type === 'meetmate.event') {
    // `ended` có thể đến hai lần (offscreen + tab đóng): chỉ xử lý khi còn đang chạy
    if (msg.event.type === 'ended' && !(await isActive())) return;
    await emit(msg.event);
    if (msg.event.type === 'ended') {
      // tab Meet đóng hoặc offscreen tự dừng: dọn tài nguyên rồi để status theo đó
      if (await hasOffscreen()) await chrome.offscreen.closeDocument();
      await finishCurrent();
      await chrome.storage.session.remove(STAGE_KEY);
      await setStatus('Đã dừng');
      await chrome.storage.session.remove(SESSION_KEY);
      if (msg.event.type === 'ended' && msg.event.reason !== 'stopped') await goToDashboard();
    }
  }
}

// Đóng tab Meet đang được nghe: kết thúc phiên (chế độ thử không có track âm để báo `ended`).
chrome.tabs.onRemoved.addListener((tabId) => {
  void endFromMeet(tabId, 'meet-closed');
});

// Tab Meet điều hướng khỏi phòng họp (sau khi rời cuộc gọi, Meet chuyển sang trang khác).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !MEET_MEETING_URL.test(changeInfo.url)) void endFromMeet(tabId, 'left');
});
