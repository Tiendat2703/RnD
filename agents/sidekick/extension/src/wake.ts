import { fold } from './docs/normalize';

export type Wake = { question: string };

const CALL = /^[\s,.:;!?…-]*(?:(?:ơi|oi|à|ạ|này)(?![\p{L}\d]))?[\s,.:;!?…-]*/iu;

/** Only the keyword "trợ lý" starts a request; preserve the original question text. */
export function detectWake(text: string): Wake | null {
  text = text.normalize('NFC');
  const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
  for (let i = 0; i + 1 < words.length; i++) {
    if (fold(words[i][0]) !== 'tro' || !['ly', 'li'].includes(fold(words[i + 1][0]))) continue;
    // "hỗ trợ lý thuyết" is ordinary speech, not an invocation.
    if (i > 0 && fold(words[i - 1][0]) === 'ho'
      && /^\s+$/.test(text.slice(words[i - 1].index! + words[i - 1][0].length, words[i].index))) continue;
    const firstEnd = words[i].index! + words[i][0].length;
    if (!/^\s+$/.test(text.slice(firstEnd, words[i + 1].index))) continue;
    const end = words[i + 1].index! + words[i + 1][0].length;
    return { question: text.slice(end).replace(CALL, '').trim() };
  }
  return null;
}
