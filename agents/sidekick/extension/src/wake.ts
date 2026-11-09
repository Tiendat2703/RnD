import { fold } from './docs/normalize';

// Measured: Blaze STT hears "MeetMate ơi" as "Mít mết ơi". People say it many ways, so both
// halves accept the common spellings once tone marks are folded away.
const FIRST = new Set(['meet', 'mit', 'mitt', 'mich', 'mic', 'mick', 'miet', 'mid', 'my']);
const SECOND = new Set(['mate', 'met', 'meth', 'mech', 'mat', 'mete', 'mait', 'meat', 'mep']);
const JOINED = new Set(['meetmate', 'mitmet', 'mitmat', 'mitmate', 'meetmet']);
const CLIPPED = new Set(['meet', 'mit']);
const CALL = /^[\s,.:;!?…-]*(?:(?:ơi|oi|à|ạ|này)(?![\p{L}\d]))?[\s,.:;!?…-]*/iu;

export type Wake = { question: string };

/** Finds "MeetMate ơi" anywhere in a line and returns what was said after it. */
export function detectWake(text: string): Wake | null {
  const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ folded: fold(m[0]), end: m.index! + m[0].length }));
  for (let i = 0; i < words.length; i++) {
    let end = -1;
    if (JOINED.has(words[i].folded)) end = words[i].end;
    else if (FIRST.has(words[i].folded) && SECOND.has(words[i + 1]?.folded ?? '')) end = words[i + 1].end;
    // Measured too: STT sometimes keeps only the first half, "Mít ơi". The call word is required then.
    else if (CLIPPED.has(words[i].folded) && /^[\s,]*(?:ơi|oi)(?![\p{L}\d])/iu.test(text.slice(words[i].end))) end = words[i].end;
    if (end < 0) continue;
    // "my mate" alone is ordinary English; require the call word when the first half is "my".
    const rest = text.slice(end);
    if (words[i].folded === 'my' && !/^[\s,]*(?:ơi|oi)(?![\p{L}\d])/iu.test(rest)) continue;
    return { question: rest.replace(CALL, '').trim() };
  }
  return null;
}
