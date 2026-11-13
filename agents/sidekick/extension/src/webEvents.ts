// Translates the meeting pipeline's side-panel events (messages.ts PanelEvent) into the events
// the web console, the session store and the in-Meet panel share (lib/bridgeProtocol.ts ExtToWeb).
// Pure, so the mapping is tested without chrome.* (webEvents.test.ts).
import type { ExtToWeb } from '../../../../lib/bridgeProtocol';
import type { Citation, KnowledgeCard } from '../../../../lib/evidence';
import type { ResearchResult, Topic } from '../../../../lib/types';
import type { Card, PanelEvent } from './messages';

export type WebContext = {
  /** epoch ms when listening started; line and card times are relative to it */
  startedAt: number;
  /** most sources kept per topic (the web's meeting setting); the pipeline may find more */
  maxSources: number;
};

/** "hop-dong.pdf, tr. 3" → doc + locator. The source comes from the chunk, never the model. */
export function citationOf(card: Card): Citation[] {
  if (!card.source && !card.quote) return [];
  const source = card.source ?? '';
  const cut = source.lastIndexOf(', ');
  return [{
    doc: cut > 0 ? source.slice(0, cut) : source || 'Tài liệu',
    locator: cut > 0 ? source.slice(cut + 2) : '',
    excerpt: card.quote ?? '',
  }];
}

/**
 * A document finding as a Knowledge Card. Only the two statuses the check can actually decide
 * are used: a contradiction found in the documents, or nothing in them about the claim.
 * Answers to questions carry no status (lib/evidence.ts: only claims have one).
 */
export function knowledgeCardOf(card: Card, ctx: WebContext): KnowledgeCard | null {
  if (card.kind === 'research') return null;
  const atMs = Math.max(0, card.at - ctx.startedAt);
  const base = { id: card.id, quote: card.utterance ?? '', atMs, summary: card.text, citations: citationOf(card) };
  if (card.kind === 'contradiction') return { ...base, kind: 'claim', status: 'contradicted' };
  if (card.kind === 'not_in_doc') return { ...base, kind: card.mode === 'ask' ? 'question' : 'claim', status: card.mode === 'ask' ? null : 'insufficient' };
  return { ...base, kind: 'question', status: null };
}

export function researchOf(card: Card, ctx: WebContext): { topic: Topic; result: ResearchResult } | null {
  if (card.kind !== 'research' || !card.title) return null;
  return {
    topic: { topic: card.title, keywords: [], query: card.title },
    result: {
      topic: card.title,
      summary: card.text,
      sources: (card.links ?? []).slice(0, Math.max(1, ctx.maxSources)),
    },
  };
}

/**
 * The content events of one panel event. Run state (start, stop, errors) is handled by the
 * background, which owns the session lifecycle; `partial` is live-only and never stored.
 */
export function webEventsOf(event: PanelEvent, ctx: WebContext, lineId: () => string): ExtToWeb[] {
  switch (event.kind) {
    case 'final':
      return [{
        type: 'line',
        // tab audio and microphone are mixed before STT, so the speaker is unknown
        line: { id: lineId(), text: event.text, atMs: Math.max(0, event.at - ctx.startedAt), source: 'mixed' },
      }];
    case 'card': {
      const found = researchOf(event.card, ctx);
      if (found) return [{ type: 'topic', topic: found.topic }, { type: 'research', result: found.result }];
      const card = knowledgeCardOf(event.card, ctx);
      return card ? [{ type: 'card', card }] : [];
    }
    case 'notice':
      return event.level === 'error' ? [{ type: 'error', message: event.message }] : [];
    case 'progress':
      // the six-step row: looking things up, then writing the web summary; done = back to listening
      return [{ type: 'stage', stage: event.step === null ? null : event.step === 'writing' ? 'writing' : 'searching' }];
    default:
      return [];
  }
}
