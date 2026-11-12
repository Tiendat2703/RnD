import type { ExtToWeb, SessionDraft, WebToExt } from '../../../../lib/bridgeProtocol';

export type { ExtToWeb, SessionDraft, WebToExt };

export type Settings = { postToChat: boolean; webResearch: boolean };
export const DEFAULT_SETTINGS: Settings = { postToChat: true, webResearch: true };

export type CardKind = 'contradiction' | 'answer' | 'not_in_doc' | 'research';
export type ChatStatus = 'pending' | 'sent' | 'failed' | 'off';
export type Card = {
  id: string;
  at: number;
  kind: CardKind;
  mode?: 'auto' | 'ask';
  /** The research topic, for research cards. */
  title?: string;
  utterance?: string;
  text: string;
  quote?: string;
  /** "hop-dong.pdf, tr. 3" — from the chunk, never from the model. */
  source?: string;
  links?: { title: string; url: string; reason: string }[];
  chat: ChatStatus;
  chatError?: string;
  /** Already reported earlier in the meeting; not posted to the chat again. */
  repeat?: boolean;
};

export type RunState = 'idle' | 'starting' | 'live' | 'reconnecting' | 'error';
export type PanelEvent =
  | { kind: 'state'; state: RunState; detail?: string }
  | { kind: 'partial'; text: string }
  | { kind: 'final'; text: string; at: number }
  | { kind: 'card'; card: Card }
  | { kind: 'chat'; cardId: string; status: ChatStatus; detail?: string }
  | { kind: 'notice'; level: 'info' | 'error'; message: string };

export type Msg =
  // side panel → background; reply StartReply. streamId null = microphone only (automated tests,
  // where tab capture needs a real toolbar click).
  | { type: 'mm.start'; tabId: number; streamId: string | null }
  | { type: 'mm.stop' }
  // background → offscreen; reply StartReply
  | { type: 'mm.offscreen.start'; streamId: string | null; blazeApiKey: string; exaApiKey: string; settings: Settings }
  | { type: 'mm.offscreen.stop' }
  | { type: 'mm.settings'; settings: Settings }
  // side panel → offscreen: the document library changed
  | { type: 'mm.docs.changed' }
  // offscreen → background
  | { type: 'mm.post'; cardId: string; messages: string[] }
  | { type: 'mm.event'; event: PanelEvent }
  // background → content script; reply PostReply
  | { type: 'mm.content.post'; text: string }
  // web console (bridge.ts content script) → background; reply ExtToWeb or nothing
  | { type: 'mm.web'; msg: WebToExt }
  // background → bridge.ts: an event for the web console
  | { type: 'mm.toweb'; event: ExtToWeb }
  // background → content script in the Meet tab: an event for the in-page panel
  | { type: 'mm.panel'; event: ExtToWeb }
  // content script → background: the user left the call (end-call button or the "you left" screen)
  | { type: 'mm.left' }
  // side panel → background: pick which web session the next meeting records (null = a new one
  // with a generated id); reply SelectReply
  | { type: 'mm.selectDraft'; id: string | null }
  // background → side panel: the list of sessions sent by the web changed
  | { type: 'mm.drafts.changed' };

export type StartReply = { ok: true } | { ok: false; error: string };
export type PostReply = { ok: true } | { ok: false; error: string };
export type SelectReply = { ok: true } | { ok: false; error: string };

export const STORAGE_KEYS = {
  blaze: 'blazeApiKey',
  exa: 'exaApiKey',
  settings: 'settings',
  view: 'view',
  // local storage: id of the web session the next meeting records (drafts.ts); absent/null = new session
  selectedDraft: 'selectedDraftId',
  // session storage: the web console tab that last talked to the bridge
  webTab: 'webTabId',
  // local storage: that tab's origin (e.g. http://localhost:3000), for the after-meeting redirect
  webOrigin: 'webOrigin',
  // session storage: the status line sent to the web console and the in-Meet panel
  status: 'status',
} as const;
