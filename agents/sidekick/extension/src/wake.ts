import { fold } from './docs/normalize';

// Measured: Blaze STT hears "MeetMate ơi" as "Mít mết ơi". People say it many ways, so both
// halves accept the common spellings once tone marks are folded away.
const FIRST = new Set(['meet', 'mit', 'mitt', 'mich', 'mic', 'mick', 'miet', 'mid', 'my']);
const SECOND = new Set(['mate', 'met', 'meth', 'mech', 'mat', 'mete', 'mait', 'meat', 'mep']);
const JOINED = new Set(['meetmate', 'mitmet', 'mitmat', 'mitmate', 'meetmet']);
const CLIPPED = new Set(['meet', 'mit']);
// Looser spellings heard live ("Mate make ơi"); accepted only when "ơi" follows, so ordinary
// speech such as "mẹ mình" or "mất mát" never wakes MeetMate.
const LOOSE_FIRST = new Set([...FIRST, 'mate', 'mai', 'mi', 'mei', 'me', 'met', 'mix']);
const LOOSE_SECOND = new Set([...SECOND, 'make', 'mek', 'mac', 'mai', 'may', 'mes', 'men', 'meet']);
const CALL = /^[\s,.:;!?…-]*(?:(?:ơi|oi|à|ạ|này)(?![\p{L}\d]))?[\s,.:;!?…-]*/iu;

export type Wake = { question: string };

// Before "ơi", any one word or pair shaped like "m…m…" is the name: STT spells it differently
// every time ("Mít mết", "Mate make", "Matemix" were all heard live). Ordinary phrases with the
// same shape are excluded.
const NAME_SHAPE = /^m[aeiouy][a-z]{0,4}m[aeiouy][a-z]{0,4}$/;
const NOT_NAME = new Set(['minh', 'moi', 'mot', 'muon', 'mua', 'mat', 'mau', 'mong', 'mai', 'muoi']);
const nameShaped = (one: string, two?: string) =>
  two === undefined ? NAME_SHAPE.test(one) : !NOT_NAME.has(two) && NAME_SHAPE.test(one + two);

const callsAfter = (text: string, at: number) => /^[\s,]*(?:ơi|oi)(?![\p{L}\d])/iu.test(text.slice(at));

/** Finds "MeetMate ơi" anywhere in a line and returns what was said after it. */
export function detectWake(text: string): Wake | null {
  const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ folded: fold(m[0]), end: m.index! + m[0].length }));
  for (let i = 0; i < words.length; i++) {
    let end = -1;
    if (JOINED.has(words[i].folded)) end = words[i].end;
    else if (FIRST.has(words[i].folded) && SECOND.has(words[i + 1]?.folded ?? '')) end = words[i + 1].end;
    // Measured too: STT sometimes keeps only the first half, "Mít ơi". The call word is required then.
    else if (CLIPPED.has(words[i].folded) && callsAfter(text, words[i].end)) end = words[i].end;
    else if (LOOSE_FIRST.has(words[i].folded) && LOOSE_SECOND.has(words[i + 1]?.folded ?? '') && callsAfter(text, words[i + 1].end)) end = words[i + 1].end;
    else if (words[i + 1] && nameShaped(words[i].folded, words[i + 1].folded) && callsAfter(text, words[i + 1].end)) end = words[i + 1].end;
    else if (nameShaped(words[i].folded) && callsAfter(text, words[i].end)) end = words[i].end;
    if (end < 0) continue;
    // "my mate" alone is ordinary English; require the call word when the first half is "my".
    const rest = text.slice(end);
    if (words[i].folded === 'my' && !callsAfter(text, end)) continue;
    return { question: rest.replace(CALL, '').trim() };
  }
  return null;
}
