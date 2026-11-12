import { CHAT_PREFIX, MEET_CHAT_MAX_CHARS } from './config';
import type { Finding } from './doccheck';
import { pageLabel } from './docs/chunk';

export const citation = (f: Finding) => (f.chunk ? `${f.chunk.docName}, ${pageLabel(f.chunk)}` : '');

/**
 * Everyone in the meeting reads the chat. Unprompted "the document doesn't say" notes stay in
 * the side panel; contradictions, answers and anything asked of MeetMate directly are posted.
 */
export const shouldPost = (f: Finding) => f.kind !== 'not_in_doc' || f.mode === 'ask';

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return max <= 1 ? '' : `${text.slice(0, max - 1).trimEnd()}…`;
}

function build(f: Finding, utterance: string, text: string, quote: string): string {
  const source = f.chunk ? `\n📄 ${citation(f)}: “${quote}”` : '';
  if (f.kind === 'contradiction') return `${CHAT_PREFIX}⚠️ Có thể chưa khớp tài liệu: “${utterance}”\n${text}${source}`;
  return `${CHAT_PREFIX}${text}${source}`;
}

/** One chat message per finding; the quote shrinks first, then the utterance, then the text. */
export function formatFinding(f: Finding, max = MEET_CHAT_MAX_CHARS): string {
  let { utterance, text, quote } = f;
  const over = () => build(f, utterance, text, quote).length - max;
  if (over() > 0) quote = clip(quote, Math.max(40, quote.length - over()));
  if (over() > 0) utterance = clip(utterance, Math.max(30, utterance.length - over()));
  if (over() > 0) text = clip(text, Math.max(0, text.length - over()));
  if (over() > 0) quote = clip(quote, Math.max(0, quote.length - over()));
  return build(f, utterance, text, quote);
}
