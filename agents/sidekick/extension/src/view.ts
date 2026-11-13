import type { PresentationSnapshot } from '../../../../lib/presentation';
import type { AskStep } from './assistant';
import type { Card, PanelEvent, RunState } from './messages';

/** What the side panel shows; the background keeps it in chrome.storage.session. */
export type View = {
  presentation?: PresentationSnapshot;
  presentationId?: string;
  assistantType?: import('../../../../lib/types').AssistantType;
  state: RunState;
  detail?: string;
  tabId?: number;
  startedAt?: number;
  transcript: { text: string; at: number }[];
  cards: Card[];
  notice?: { level: 'info' | 'error'; message: string; at: number };
  /** the "trợ lý" request MeetMate is working on right now */
  progress?: { step: AskStep; question: string; at: number } | null;
};

export const EMPTY_VIEW: View = { state: 'idle', transcript: [], cards: [] };
const MAX_LINES = 300;
const MAX_CARDS = 100;

export function reduce(view: View, event: PanelEvent, now = Date.now()): View {
  switch (event.kind) {
    case 'presentation':
      return { ...view, presentation: event.snapshot, presentationId: event.id };
    case 'state':
      return { ...view, state: event.state, detail: event.detail, progress: event.state === 'live' || event.state === 'reconnecting' ? view.progress : null };
    case 'final':
      return { ...view, transcript: [...view.transcript, { text: event.text, at: event.at }].slice(-MAX_LINES) };
    case 'card':
      return { ...view, cards: [event.card, ...view.cards].slice(0, MAX_CARDS) };
    case 'chat':
      return {
        ...view,
        cards: view.cards.map(c => (c.id === event.cardId ? { ...c, chat: event.status, chatError: event.detail } : c)),
      };
    case 'notice':
      return { ...view, notice: { level: event.level, message: event.message, at: now } };
    case 'progress':
      return {
        ...view,
        // the clock keeps running across steps of one request
        progress: event.step
          ? { step: event.step, question: event.question, at: view.progress?.question === event.question ? view.progress.at : now }
          : null,
      };
    case 'partial':
      return view; // live only; never persisted
  }
}

/** A new meeting starts from a clean view but keeps nothing from the last one. */
export const startView = (tabId: number, now = Date.now()): View => ({ ...EMPTY_VIEW, state: 'starting', tabId, startedAt: now });
