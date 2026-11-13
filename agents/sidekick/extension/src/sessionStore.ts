import { parsePresentation } from '../../../../lib/presentation';
// Lưu phiên trong chrome.storage.local, để một cuộc họp không mất khi web console
// không mở lúc họp, khi tải lại trang, hoặc khi service worker bị dừng.
//
// `applyEvent` là hàm thuần (test được); phần còn lại chỉ là đọc/ghi storage.
import type { ExtToWeb, SavedSession } from '../../../../lib/bridgeProtocol';
import type { MeetingKind } from '../../../../lib/types';

export const SESSIONS_KEY = 'sessions';
export const CURRENT_KEY = 'currentSessionId';

const MAX_LINES = 3000;
const MAX_SESSIONS = 50;

export function newSession(
  id: string,
  title: string,
  kind: MeetingKind,
  now: number,
): SavedSession {
  return { id, title, kind, startedAt: now, endedAt: null, lines: [], topics: [], cards: [], syncedAt: null };
}

/** Phiên được phép dọn: đã kết thúc và backend đã xác nhận lưu. */
export function isDisposable(s: SavedSession): boolean {
  return s.endedAt !== null && typeof s.syncedAt === 'number';
}

/** Đánh dấu đã lưu backend. Chỉ áp cho phiên đã kết thúc; giữ mốc đầu tiên. */
export function markSyncedPure(s: SavedSession, syncedAt: number): SavedSession {
  if (s.endedAt === null || !Number.isFinite(syncedAt)) return s;
  return typeof s.syncedAt === 'number' ? s : { ...s, syncedAt };
}

/** Tin chat thuộc chủ đề nào: theo URL nguồn, rồi theo tên chủ đề, rồi chủ đề mới nhất. */
function topicIndexFor(s: SavedSession, text: string): number {
  const byUrl = s.topics.findIndex((t) => t.result?.sources.some((src) => text.includes(src.url)));
  if (byUrl >= 0) return byUrl;
  const byName = s.topics.findIndex((t) => text.includes(`Chủ đề: ${t.topic.topic}`));
  return byName >= 0 ? byName : s.topics.length - 1;
}

export function applyEvent(s: SavedSession, e: ExtToWeb, now: number): SavedSession {
  switch (e.type) {
    case 'presentation': {
      if (e.id !== s.id) return s;
      const snapshot = parsePresentation(e.snapshot);
      if (s.presentation && (snapshot.revision !== s.presentation.revision || snapshot.sequence <= s.presentation.sequence)) return s;
      return { ...s, mode: 'presentation', presentation: snapshot };
    }
    case 'line': {
      if(s.lines.some(l=>l.id===e.line.id)) return s;
      const lines=[...s.lines,e.line].slice(-MAX_LINES);
      // Evidence remains verifiable after the rolling transcript window is trimmed.
      const pinned=new Set([...(s.presentation?.items.map(i=>i.evidence?.lineId)??[]),...(s.presentation?.deviations??[]).flatMap(d=>[d.evidence.lineId,d.resolvedBy?.lineId])].filter(Boolean));
      for(const line of s.lines) if(pinned.has(line.id) && !lines.some(l=>l.id===line.id)) lines.unshift(line);
      return {...s,lines};
    }
    case 'topic':
      return { ...s, topics: [...s.topics, { topic: e.topic, result: null, posted: 0 }] };
    case 'research': {
      const i = s.topics.length - 1;
      if (i < 0) return s;
      const topics = s.topics.map((t, j) => (j === i ? { ...t, result: e.result } : t));
      return { ...s, topics };
    }
    case 'posted': {
      const i = topicIndexFor(s, e.text);
      if (i < 0) return s;
      const topics = s.topics.map((t, j) => (j === i ? { ...t, posted: t.posted + 1 } : t));
      return { ...s, topics };
    }
    case 'card': {
      const cards = s.cards ?? [];
      return cards.some((c) => c.id === e.card.id) ? s : { ...s, cards: [...cards, e.card] };
    }
    case 'ended':
      return s.endedAt === null ? { ...s, endedAt: now } : s;
    default:
      return s;
  }
}

export function finish(s: SavedSession, now: number): SavedSession {
  return s.endedAt === null ? { ...s, endedAt: now } : s;
}

/**
 * Giữ tối đa MAX_SESSIONS phiên bằng cách bỏ các phiên đã lưu backend cũ nhất.
 * Phiên đang chạy hoặc chưa gửi không bao giờ bị bỏ, kể cả khi vượt giới hạn:
 * mất dữ liệu cuộc họp tệ hơn vượt hạn mức.
 */
export function prune(all: Record<string, SavedSession>): Record<string, SavedSession> {
  const list = Object.values(all);
  const excess = list.length - MAX_SESSIONS;
  if (excess <= 0) return all;
  const drop = new Set(
    list
      .filter(isDisposable)
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(0, excess)
      .map((x) => x.id),
  );
  return Object.fromEntries(Object.entries(all).filter(([id]) => !drop.has(id)));
}

type Store = Record<string, SavedSession>;

async function readAll(): Promise<Store> {
  const r = (await chrome.storage.local.get(SESSIONS_KEY)) as { [SESSIONS_KEY]?: Store };
  return r[SESSIONS_KEY] ?? {};
}

/** Id của phiên đang ghi; null = không có phiên nào mở. */
export async function currentId(): Promise<string | null> {
  const r = (await chrome.storage.session.get(CURRENT_KEY)) as { [CURRENT_KEY]?: string };
  return r[CURRENT_KEY] ?? null;
}

// Ghi nối tiếp để hai sự kiện đến sát nhau không ghi đè lên nhau.
let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
};

export function startSession(id: string, title: string, kind: MeetingKind): Promise<void> {
  return serial(async () => {
    const all = await readAll();
    all[id] = newSession(id, title, kind, Date.now());
    await chrome.storage.local.set({ [SESSIONS_KEY]: prune(all) });
    await chrome.storage.session.set({ [CURRENT_KEY]: id });
  });
}

export function recordEvent(e: ExtToWeb): Promise<void> {
  if (!['presentation', 'line', 'topic', 'research', 'card', 'posted', 'ended'].includes(e.type)) return Promise.resolve();
  return serial(async () => {
    const id = await currentId();
    if (!id) return;
    const all = await readAll();
    const s = all[id];
    if (!s) return;
    all[id] = applyEvent(s, e, Date.now());
    await chrome.storage.local.set({ [SESSIONS_KEY]: all });
  });
}

/** Đóng phiên hiện tại (idempotent). */
export function finishCurrent(): Promise<void> {
  return serial(async () => {
    const id = await currentId();
    if (!id) return;
    const all = await readAll();
    const s = all[id];
    if (!s) return;
    all[id] = finish(s, Date.now());
    await chrome.storage.local.set({ [SESSIONS_KEY]: all });
    await chrome.storage.session.remove(CURRENT_KEY);
  });
}

export function deleteSession(id: string): Promise<void> {
  return serial(async () => {
    const all = await readAll();
    if (!(id in all)) return;
    delete all[id];
    await chrome.storage.local.set({ [SESSIONS_KEY]: all });
  });
}

export function markSynced(id: string, syncedAt: number): Promise<void> {
  return serial(async () => {
    const all = await readAll();
    const s = all[id];
    if (!s) return;
    const next = markSyncedPure(s, syncedAt);
    if (next === s) return;
    all[id] = next;
    await chrome.storage.local.set({ [SESSIONS_KEY]: prune(all) });
  });
}

export async function listSessions(): Promise<SavedSession[]> {
  return Object.values(await readAll()).sort((a, b) => b.startedAt - a.startedAt);
}
