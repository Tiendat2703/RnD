const MULTIPLIER: Record<string, number> = { nghìn: 1e3, ngàn: 1e3, k: 1e3, triệu: 1e6, tỷ: 1e9, tỉ: 1e9 };

/**
 * Writes numbers one way so speech and documents meet: STT says "15.000.000" where a document
 * says "15 triệu", and "ngày 5" where it says "ngày 05".
 */
export function normalizeNumbers(text: string): string {
  return text
    // Vietnamese thousands use dots: 1.200.000.000 → 1200000000.
    .replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, m => m.replace(/\./g, ''))
    // Two or more comma groups can only be thousands: 1,200,000 → 1200000.
    .replace(/\d{1,3}(?:,\d{3}){2,}(?!\d)/g, m => m.replace(/,/g, ''))
    .replace(/(\d+(?:[.,]\d+)?)\s*(nghìn|ngàn|triệu|tỷ|tỉ|k)(?![\p{L}\d])/giu, (_, n: string, unit: string) => {
      const value = Number(n.replace(',', '.')) * MULTIPLIER[unit.toLowerCase()];
      return Number.isFinite(value) ? String(Math.round(value)) : `${n} ${unit}`;
    })
    .replace(/(?<![\d.,])0+(\d)/g, '$1');
}

/** Lowercase, no diacritics, đ → d: survives STT spelling slips such as a missing tone mark. */
export function fold(text: string): string {
  return normalizeNumbers(text.normalize('NFC').toLowerCase())
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Folded function words; they carry no meaning for finding the right passage.
const STOP = new Set(`
a ah ai anh ba ban bi boi cac cai can cho chu chua chung chi co con cua cung da dang day de den deu di do duoc gi gio
ha hay ho hoac hoi khi khong kia la lai lam len luc ma minh mot nao nay neu nen nhe nhi nhieu nho nhu nhung no noi
o oi phai qua ra rang rat roi sao se ta tai thi the thoi theo tren trong tu va van vao ve vi voi vay xem
ok oke okay vang u um uh nha ha hi
`.trim().split(/\s+/));

export const isStopword = (token: string) => STOP.has(token);

/**
 * Search terms: meaningful syllables plus adjacent-syllable pairs, since most Vietnamese words
 * are two syllables ("hợp đồng", "bảo trì") and a pair pins the word down.
 */
export function terms(text: string): string[] {
  const syllables = fold(text).split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < syllables.length; i++) {
    const s = syllables[i];
    if (!STOP.has(s)) out.push(s);
    const next = syllables[i + 1];
    if (next && !(STOP.has(s) && STOP.has(next))) out.push(`${s}_${next}`);
  }
  return out;
}
