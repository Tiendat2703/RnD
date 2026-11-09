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
  | { type: 'mm.content.post'; text: string };

export type StartReply = { ok: true } | { ok: false; error: string };
export type PostReply = { ok: true } | { ok: false; error: string };

export const STORAGE_KEYS = { blaze: 'blazeApiKey', exa: 'exaApiKey', settings: 'settings', view: 'view' } as const;
