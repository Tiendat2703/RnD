import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedSession } from '../../../../lib/bridgeProtocol';
import { newSession } from './sessionStore';

// IndexedDB does not exist in the test runtime; the document library is checked through this mock.
const replaceDocs = vi.fn(async (_docs: unknown[]) => undefined);
vi.mock('./docs/store', () => ({ replaceDocs: (docs: unknown[]) => replaceDocs(docs) }));
// Web sessions waiting to be recorded (drafts.ts, IndexedDB in the extension), kept in memory here.
type Draft = { id: string; draft: { id: string; title: string }; docs: { id: string }[]; preparedAt: number };
const draftStore = new Map<string, Draft>();
vi.mock('./drafts', () => ({
  getDraftRecord: async (id: string) => draftStore.get(id) ?? null,
  putDraft: async (r: Draft) => void draftStore.set(r.id, r),
  deleteDraft: async (id: string) => void draftStore.delete(id),
}));

type Store = Record<string, unknown>;

function area(store: Store) {
  return {
    get: async (keys?: string | string[]) => {
      const list = keys === undefined ? Object.keys(store) : Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
    },
    set: async (o: Store) => void Object.assign(store, o),
    remove: async (k: string | string[]) => {
      for (const key of Array.isArray(k) ? k : [k]) delete store[key];
    },
  };
}

const URL_OK = 'http://localhost:3000/dashboard/callSessions';

/** Dựng `chrome` giả, nạp background.ts, trả về các listener nó đăng ký. */
async function boot(opts: { session?: Store; local?: Store; webTabUrl?: string; meetTabAlive?: boolean }) {
  vi.resetModules();
  const session: Store = { ...opts.session };
  const local: Store = { ...opts.local };
  const onMessage: ((m: unknown, s: unknown, r: (v?: unknown) => void) => unknown)[] = [];
  let onRemoved: (id: number) => void = () => undefined;
  let onUpdated: (id: number, c: { url?: string }) => void = () => undefined;

  const update = vi.fn(async (id: number) => {
    if (id === 7 && opts.meetTabAlive === false) throw new Error('No tab with id: 7');
    return { id };
  });
  const get = vi.fn(async (id: number) => ({ id, url: opts.webTabUrl ?? 'http://localhost:3000/', windowId: 1 }));
  const create = vi.fn(async () => ({}));
  const tabMessage = vi.fn(async (_id: number, _m: unknown) => undefined);

  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: { session: area(session), local: area(local), onChanged: { addListener() {} } },
    runtime: {
      onMessage: { addListener: (fn: never) => onMessage.push(fn) },
      sendMessage: vi.fn(async () => undefined),
      getContexts: async () => [],
      getManifest: () => ({ version: '0.3.0' }),
    },
    sidePanel: { setPanelBehavior: async () => undefined, open: async () => undefined },
    action: { onClicked: { addListener() {} } },
    tabs: {
      query: async () => [{ id: 7, url: 'https://meet.google.com/abc-defg-hij' }],
      sendMessage: tabMessage,
      update,
      get,
      create,
      onRemoved: { addListener: (fn: never) => (onRemoved = fn) },
      onUpdated: { addListener: (fn: never) => (onUpdated = fn) },
    },
    offscreen: { closeDocument: async () => undefined, createDocument: async () => undefined },
    windows: { update: vi.fn(async () => ({})) },
    scripting: { executeScript: vi.fn(async () => undefined) },
  };

  await import('./background');
  const send = (msg: unknown, tabId?: number) =>
    new Promise<unknown>((resolve) => {
      let async = false;
      onMessage.forEach((fn) => {
        if (fn(msg, tabId === undefined ? {} : { tab: { id: tabId, url: 'http://localhost:3000/dashboard' } }, resolve) === true) async = true;
      });
      if (!async) resolve(undefined);
    });
  const saved = () => (local.sessions as Record<string, SavedSession>)?.s1;
  return {
    send,
    onRemoved: (id: number) => onRemoved(id),
    onUpdated: (id: number, url: string) => onUpdated(id, { url }),
    update, get, create, tabMessage, session, local, saved,
  };
}

// stop() chờ STT gửi nốt câu cuối (STOP_GRACE_MS) nên thời gian là giả.
const settle = () => vi.advanceTimersByTimeAsync(2_000);
// đang nghe tab Meet số 7, phiên s1 đang ghi, web console ở tab 9
const LIVE: Store = {
  view: { state: 'live', tabId: 7, startedAt: 1_000, transcript: [], cards: [] },
  currentSessionId: 's1',
  webTabId: 9,
  webCtx: { startedAt: 1_000, maxSources: 2 },
};
const SESSIONS = () => ({ sessions: { s1: newSession('s1', 'Họp tuần', 'khac', 1_000) } });

beforeEach(() => {
  vi.useFakeTimers();
  replaceDocs.mockClear();
  draftStore.clear();
});
afterEach(() => vi.useRealTimers());

describe('background: kết thúc phiên khi rời họp', () => {
  it('rời cuộc gọi: đóng phiên đã lưu và chuyển tab Meet sang trang Cuộc họp', async () => {
    const t = await boot({ session: LIVE, local: { ...SESSIONS(), webOrigin: 'http://localhost:3000' } });
    void t.send({ type: 'mm.left' }, 7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: URL_OK, active: true });
    expect(t.saved().endedAt).not.toBeNull();
    expect(t.session.currentSessionId).toBeUndefined();
  });

  it('dùng origin của web đã bắt tay, không cố định cổng 3000', async () => {
    const t = await boot({ session: LIVE, local: { ...SESSIONS(), webOrigin: 'http://localhost:3001' } });
    void t.send({ type: 'mm.left' }, 7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: 'http://localhost:3001/dashboard/callSessions', active: true });
  });

  it('tab Meet đã đóng thì chuyển tab web sang trang Cuộc họp', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS(), meetTabAlive: false, webTabUrl: 'http://localhost:3000/dashboard/settings' });
    t.onRemoved(7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(9, { url: URL_OK, active: true });
  });

  it('tab web đang ở đúng trang thì chỉ đưa lên trước, không tải lại', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS(), meetTabAlive: false, webTabUrl: URL_OK });
    t.onRemoved(7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(9, { active: true });
  });

  it('không có tab nào thì mở tab mới', async () => {
    const t = await boot({ session: { ...LIVE, webTabId: undefined }, local: SESSIONS(), meetTabAlive: false });
    t.onRemoved(7);
    await settle();
    expect(t.create).toHaveBeenCalledWith({ url: URL_OK });
  });

  it('đóng tab báo kết thúc hai lần (tabs.onRemoved và track âm thanh) mà chỉ chuyển hướng một lần', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS(), meetTabAlive: false });
    t.onRemoved(7);
    void t.send({ type: 'mm.event', event: { kind: 'state', state: 'idle', detail: 'Tab Meet đã dừng phát âm thanh' } });
    await settle();
    expect(t.update.mock.calls.filter(([id]) => id === 9)).toHaveLength(1);
  });

  it('không làm gì khi không có phiên đang ghi, hoặc tab khác', async () => {
    const idle = await boot({ session: { view: { state: 'idle', tabId: 7, transcript: [], cards: [] } } });
    void idle.send({ type: 'mm.left' }, 7);
    await settle();
    expect(idle.update).not.toHaveBeenCalled();

    const other = await boot({ session: LIVE, local: SESSIONS() });
    void other.send({ type: 'mm.left' }, 99);
    await settle();
    expect(other.update).not.toHaveBeenCalled();
  });

  it('nhận ra URL phòng họp dạng /meet/abc-defg-hij, không coi là đã rời', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS() });
    t.onUpdated(7, 'https://meet.google.com/meet/wwb-mikq-osr?authuser=0');
    await settle();
    expect(t.update).not.toHaveBeenCalled();
    t.onUpdated(7, 'https://meet.google.com/landing');
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: URL_OK, active: true });
  });

  it('bấm Dừng nghe: đóng phiên nhưng không chuyển hướng', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS() });
    void t.send({ type: 'mm.stop' });
    await settle();
    expect(t.update).not.toHaveBeenCalled();
    expect(t.saved().endedAt).not.toBeNull();
  });
});

describe('background: ghi phiên và cầu nối web', () => {
  it('lưu câu đã chốt, chủ đề và kết quả research vào phiên đang ghi, rồi gửi cho web', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS() });
    void t.send({ type: 'mm.event', event: { kind: 'final', text: 'Chốt giá gói SME', at: 4_000 } });
    void t.send({
      type: 'mm.event',
      event: {
        kind: 'card',
        card: {
          id: 'r1', at: 5_000, kind: 'research', title: 'Giá SaaS', text: 'Tóm tắt', chat: 'off',
          links: [1, 2, 3].map((i) => ({ title: `Nguồn ${i}`, url: `https://x/${i}`, reason: 'r' })),
        },
      },
    });
    await settle();
    const s = t.saved();
    expect(s.lines).toEqual([expect.objectContaining({ text: 'Chốt giá gói SME', atMs: 3_000, source: 'mixed' })]);
    expect(s.topics[0].topic.topic).toBe('Giá SaaS');
    expect(s.topics[0].result?.sources).toHaveLength(2); // maxSources của phiên
    const toWeb = t.tabMessage.mock.calls.filter(([id]) => id === 9).map(([, m]) => (m as { event: { type: string } }).event.type);
    expect(toWeb).toEqual(expect.arrayContaining(['line', 'topic', 'research']));
  });

  it('thẻ đối chiếu tài liệu thành Knowledge Card trong phiên', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS() });
    void t.send({
      type: 'mm.event',
      event: {
        kind: 'card',
        card: { id: 'c1', at: 2_000, kind: 'contradiction', utterance: 'Hạn là thứ Sáu', text: 'Tài liệu ghi thứ Hai', quote: 'hạn chót thứ Hai', source: 'ke-hoach.pdf, tr. 2', chat: 'off' },
      },
    });
    await settle();
    expect(t.saved().cards).toEqual([
      expect.objectContaining({ id: 'c1', kind: 'claim', status: 'contradicted', quote: 'Hạn là thứ Sáu', atMs: 1_000 }),
    ]);
  });

  it('ping trả lời trạng thái; khóa Exa không bắt buộc', async () => {
    const t = await boot({ session: LIVE, local: { ...SESSIONS(), blazeApiKey: 'k' } });
    const reply = (await t.send({ type: 'mm.web', msg: { type: 'ping' } }, 9)) as { type: string; info: { keysSet: boolean; meetTabs: number; running: boolean; sessionId: string } };
    expect(reply.type).toBe('pong');
    expect(reply.info).toMatchObject({ keysSet: true, meetTabs: 1, running: true, sessionId: 's1' });
  });

  it('markSynced đánh dấu phiên đã lưu backend', async () => {
    const ended = { ...newSession('s1', 'Họp tuần', 'khac', 1_000), endedAt: 9_000 };
    const t = await boot({ session: {}, local: { sessions: { s1: ended } } });
    await t.send({ type: 'mm.web', msg: { type: 'sessions.markSynced', id: 's1', syncedAt: 10_000 } }, 9);
    expect(t.saved().syncedAt).toBe(10_000);
  });
});

const DOCS = [{ id: 'dabc1', name: 'Hợp đồng.pdf', pageCount: 1, chunks: [{ id: 'dabc1#1', docId: 'dabc1', docName: 'Hợp đồng.pdf', page: 1, pageEnd: 1, text: 'Phí bảo trì 12.000.000 đồng.' }] }];
const prepare = (id: string, documents: unknown[] = []) =>
  ({ type: 'mm.web', msg: { type: 'session.prepare', session: { id, title: `Họp ${id}`, kind: 'khac', sources: 9, autoPost: false, documents } } });
const runtimeSend = () => (globalThis as unknown as { chrome: { runtime: { sendMessage: ReturnType<typeof vi.fn> } } }).chrome.runtime.sendMessage;

describe('background: chọn phiên web trong extension', () => {
  it('session.prepare thêm phiên vào danh sách chờ, chọn nó và nạp đúng tài liệu của nó', async () => {
    const t = await boot({ session: {}, local: {} });
    await t.send(prepare('w1', DOCS), 9);
    expect(draftStore.get('w1')).toMatchObject({ draft: { id: 'w1', title: 'Họp w1', kind: 'khac', sources: 4, autoPost: false } });
    expect(draftStore.get('w1')!.draft).not.toHaveProperty('documents');
    expect(t.local.selectedDraftId).toBe('w1');
    expect(replaceDocs).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'dabc1', chunks: DOCS[0].chunks })]);
    expect(runtimeSend()).toHaveBeenCalledWith({ type: 'mm.docs.changed' });
    expect(runtimeSend()).toHaveBeenCalledWith({ type: 'mm.drafts.changed' });
  });

  it('giữ nhiều phiên; đổi qua lại thì kho tài liệu đổi theo, "Phiên mới" thì kho rỗng', async () => {
    const t = await boot({ session: {}, local: {} });
    await t.send(prepare('w1', DOCS), 9);
    await t.send(prepare('w2'), 9);
    expect([...draftStore.keys()]).toEqual(['w1', 'w2']);
    expect(t.local.selectedDraftId).toBe('w2');
    expect(replaceDocs).toHaveBeenLastCalledWith([]);

    expect(await t.send({ type: 'mm.selectDraft', id: 'w1' })).toEqual({ ok: true });
    expect(replaceDocs).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'dabc1' })]);
    expect(await t.send({ type: 'mm.selectDraft', id: null })).toEqual({ ok: true });
    expect(t.local.selectedDraftId).toBeNull();
    expect(replaceDocs).toHaveBeenLastCalledWith([]);
    expect(await t.send({ type: 'mm.selectDraft', id: 'gone' })).toMatchObject({ ok: false });
  });

  it('không đổi phiên khi đang nghe; phiên web gửi lúc đang nghe chỉ vào danh sách chờ', async () => {
    const t = await boot({ session: LIVE, local: SESSIONS() });
    await t.send(prepare('w9', DOCS), 9);
    expect(draftStore.has('w9')).toBe(true);
    expect(t.local.selectedDraftId).toBeUndefined();
    expect(replaceDocs).not.toHaveBeenCalled();
    expect(await t.send({ type: 'mm.selectDraft', id: 'w9' })).toMatchObject({ ok: false });
  });

  it('web hủy phiên chưa bắt đầu: bỏ đúng phiên đó khỏi danh sách', async () => {
    const t = await boot({ session: {}, local: {} });
    await t.send(prepare('w1', DOCS), 9);
    await t.send({ type: 'mm.web', msg: { type: 'session.stop', id: 'w1' } }, 9);
    expect(draftStore.has('w1')).toBe(false);
    expect(t.local.selectedDraftId).toBeNull();
    expect(replaceDocs).toHaveBeenLastCalledWith([]);
  });

  it('ghi xong một phiên web thì phiên đó rời danh sách chờ (ghi lại sẽ đè phiên đã lưu)', async () => {
    draftStore.set('s1', { id: 's1', draft: { id: 's1', title: 'Họp tuần' }, docs: [], preparedAt: 1 });
    const t = await boot({ session: LIVE, local: { ...SESSIONS(), selectedDraftId: 's1' } });
    void t.send({ type: 'mm.stop' });
    await settle();
    expect(draftStore.has('s1')).toBe(false);
    expect(t.local.selectedDraftId).toBeNull();
  });

  it('lỗi trước khi nghe được câu nào: bỏ bản ghi rỗng, giữ phiên web để bắt đầu lại', async () => {
    draftStore.set('s1', { id: 's1', draft: { id: 's1', title: 'Họp tuần' }, docs: [], preparedAt: 1 });
    const t = await boot({ session: LIVE, local: { ...SESSIONS(), selectedDraftId: 's1' } });
    void t.send({ type: 'mm.event', event: { kind: 'state', state: 'error', detail: 'Blaze từ chối khóa' } });
    await settle();
    expect(t.saved()).toBeUndefined();
    expect(draftStore.has('s1')).toBe(true);
    expect(t.local.selectedDraftId).toBe('s1');
  });
});
