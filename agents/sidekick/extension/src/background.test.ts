import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: { session: area(session), local: area(local), onChanged: { addListener() {} } },
    runtime: {
      onMessage: { addListener: (fn: never) => onMessage.push(fn) },
      sendMessage: vi.fn(async () => undefined),
      getContexts: async () => [],
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
      getManifest: () => ({ version: '0.1.0' }),
    },
    tabs: {
      query: async () => [],
      sendMessage: vi.fn(async () => undefined),
      update,
      get,
      create,
      onRemoved: { addListener: (fn: never) => (onRemoved = fn) },
      onUpdated: { addListener: (fn: never) => (onUpdated = fn) },
    },
    offscreen: { closeDocument: async () => undefined, createDocument: async () => undefined, Reason: { USER_MEDIA: 'USER_MEDIA' } },
    windows: { update: vi.fn(async () => ({})) },
    scripting: { executeScript: vi.fn(async () => undefined) },
  };

  await import('./background');
  const send = (msg: unknown, tabId?: number) =>
    onMessage.forEach((fn) => fn(msg, tabId === undefined ? {} : { tab: { id: tabId } }, () => undefined));
  return { send, onRemoved: (id: number) => onRemoved(id), onUpdated: (id: number, url: string) => onUpdated(id, { url }), update, get, create, session };
}

const settle = () => new Promise((r) => setTimeout(r, 30));
// phiên đang mở trong tab Meet số 7, và dòng trạng thái đã bị một cảnh báo ghi đè
const ACTIVE = { active: true, meetTabId: 7, status: 'Không dùng được micro — chỉ nghe âm thanh từ người khác', webTabId: 9 };

describe('background: kết thúc phiên khi rời họp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chuyển tab Meet sang trang Cuộc họp khi người dùng rời cuộc gọi, kể cả khi trạng thái đang là cảnh báo', async () => {
    const t = await boot({ session: ACTIVE, local: { webOrigin: 'http://localhost:3000' } });
    t.send({ type: 'meetmate.left' }, 7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: URL_OK, active: true });
    expect(t.session.active).toBeUndefined(); // phiên đã đóng
  });

  it('dùng origin của web đã bắt tay, không cố định cổng 3000', async () => {
    const t = await boot({ session: ACTIVE, local: { webOrigin: 'http://localhost:3001' } });
    t.send({ type: 'meetmate.left' }, 7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: 'http://localhost:3001/dashboard/callSessions', active: true });
  });

  it('tab Meet đã đóng thì chuyển tab web sang trang Cuộc họp', async () => {
    const t = await boot({ session: ACTIVE, meetTabAlive: false, webTabUrl: 'http://localhost:3000/dashboard/settings' });
    t.onRemoved(7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(9, { url: URL_OK, active: true });
  });

  it('tab web đang ở đúng trang thì chỉ đưa lên trước, không tải lại', async () => {
    const t = await boot({ session: ACTIVE, meetTabAlive: false, webTabUrl: URL_OK });
    t.onRemoved(7);
    await settle();
    expect(t.update).toHaveBeenCalledWith(9, { active: true });
  });

  it('không có tab nào thì mở tab mới', async () => {
    const t = await boot({ session: { ...ACTIVE, webTabId: undefined }, meetTabAlive: false });
    t.onRemoved(7);
    await settle();
    expect(t.create).toHaveBeenCalledWith({ url: URL_OK });
  });

  it('không làm gì khi không có phiên đang mở, hoặc tab khác', async () => {
    const idle = await boot({ session: { meetTabId: 7, status: 'Đã dừng' } });
    idle.send({ type: 'meetmate.left' }, 7);
    await settle();
    expect(idle.update).not.toHaveBeenCalled();

    const other = await boot({ session: ACTIVE });
    other.send({ type: 'meetmate.left' }, 99);
    await settle();
    expect(other.update).not.toHaveBeenCalled();
  });

  it('nhận ra URL phòng họp dạng /meet/abc-defg-hij, không coi là đã rời', async () => {
    const t = await boot({ session: ACTIVE });
    t.onUpdated(7, 'https://meet.google.com/meet/wwb-mikq-osr?authuser=0');
    await settle();
    expect(t.update).not.toHaveBeenCalled();
    t.onUpdated(7, 'https://meet.google.com/landing');
    await settle();
    expect(t.update).toHaveBeenCalledWith(7, { url: URL_OK, active: true });
  });

  it('bấm Dừng nghe (stopped) không chuyển hướng', async () => {
    const t = await boot({ session: ACTIVE });
    t.send({ type: 'meetmate.stop' });
    await settle();
    expect(t.update).not.toHaveBeenCalled();
  });
});
