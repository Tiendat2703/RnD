import { beforeAll, describe, expect, it } from 'vitest';
import { Bm25Index } from './bm25';
import { chunkPages, pageLabel, type Chunk } from './chunk';
import { fixtureChunks, fixturePages } from './fixtures';
import { fold, normalizeNumbers, terms } from './normalize';
import { itemsToText, looksScanned } from './pdf';

describe('normalizeNumbers', () => {
  it('writes amounts the same way in speech and documents', () => {
    expect(normalizeNumbers('15.000.000 đồng')).toBe('15000000 đồng');
    expect(normalizeNumbers('15 triệu')).toBe('15000000');
    expect(normalizeNumbers('1,2 tỷ')).toBe('1200000000');
    expect(normalizeNumbers('500 nghìn')).toBe('500000');
    expect(normalizeNumbers('1,200,000')).toBe('1200000');
  });

  it('drops leading zeros in dates without touching decimals', () => {
    expect(normalizeNumbers('ngày 05 tháng 01')).toBe('ngày 5 tháng 1');
    expect(normalizeNumbers('0,05% mỗi ngày')).toBe('0,05% mỗi ngày');
  });
});

describe('fold and terms', () => {
  it('removes tone marks and đ', () => {
    expect(fold('Hợp ĐỒNG bảo trì')).toBe('hop dong bao tri');
  });

  it('keeps meaningful syllables and syllable pairs, not function words', () => {
    expect(terms('phí bảo trì là')).toEqual(['phi', 'phi_bao', 'bao', 'bao_tri', 'tri', 'tri_la']);
    expect(terms('là của')).toEqual([]);
  });
});

describe('itemsToText', () => {
  const item = (str: string, x: number, y: number, width: number, hasEOL = false) =>
    ({ str, transform: [12, 0, 0, 12, x, y], width, height: 12, hasEOL });

  it('joins runs on a line, spaces gaps and breaks on a new baseline', () => {
    expect(itemsToText([item('Phí', 0, 100, 20), item('bảo trì', 30, 100, 40), item('12 triệu', 0, 80, 50)]))
      .toBe('Phí bảo trì\n12 triệu');
  });

  it('honours hasEOL and skips non-text items', () => {
    expect(itemsToText([item('A', 0, 100, 5, true), { type: 'beginMarkedContent' }, item('B', 6, 100, 5)])).toBe('A\nB');
  });
});

describe('looksScanned', () => {
  it('flags pages without a text layer', () => {
    expect(looksScanned(['', ' ', '\n'])).toBe(true);
    expect(looksScanned(['Điều 1. Phạm vi công việc gồm ứng dụng di động và trang quản trị.'])).toBe(false);
  });
});

describe('chunkPages', () => {
  it('packs lines up to the size, overlaps neighbours and labels pages', () => {
    const pages = ['Câu một dài. Câu hai dài.', 'Câu ba dài. Câu bốn dài.'];
    const chunks = chunkPages({ id: 'd', name: 'd.pdf' }, pages, 26, 12);
    expect(chunks.map(c => c.text)).toEqual(['Câu một dài. Câu hai dài.', 'Câu hai dài. Câu ba dài.', 'Câu ba dài. Câu bốn dài.']);
    expect(chunks.map(c => pageLabel(c))).toEqual(['tr. 1', 'tr. 1–2', 'tr. 2']);
    expect(chunks.map(c => c.id)).toEqual(['d#1', 'd#2', 'd#3']);
  });

  it('cuts a sentence longer than a chunk at word boundaries', () => {
    const chunks = chunkPages({ id: 'd', name: 'd' }, ['một hai ba bốn năm sáu bảy tám'], 10, 0);
    expect(chunks.every(c => c.text.length <= 10)).toBe(true);
    expect(chunks.map(c => c.text).join(' ')).toBe('một hai ba bốn năm sáu bảy tám');
  });

  it('skips empty pages', () => {
    expect(chunkPages({ id: 'd', name: 'd' }, ['', '  '])).toEqual([]);
  });
});

describe('fixture PDFs (real pdf.js extraction)', () => {
  let chunks: Chunk[];
  beforeAll(async () => {
    chunks = await fixtureChunks();
  });

  it('reads Vietnamese text with tone marks intact', async () => {
    const pages = await fixturePages('hop-dong.pdf');
    expect(pages.length).toBeGreaterThan(2);
    expect(pages.join(' ').replace(/\s+/g, ' ')).toContain('phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng');
    expect(looksScanned(pages)).toBe(false);
  });

  it('keeps a sentence that runs over a page break whole in one chunk', () => {
    const deadline = chunks.find(c => /Hạn chót bàn giao toàn bộ hệ thống là ngày 31 tháng 03 năm 2027/.test(c.text));
    expect(deadline).toBeDefined();
  });

  it('finds the right passage for questions phrased like speech', () => {
    const index = new Bm25Index(chunks);
    const top = (q: string) => index.search(q, 3).map(h => h.chunk.text).join('\n');
    expect(top('phí bảo trì là 15.000.000 một tháng')).toContain('12.000.000 đồng mỗi tháng');
    expect(top('ngân sách marketing 500 triệu')).toContain('350.000.000 đồng');
    expect(top('tranh chấp giải quyết ở đâu')).toContain('VIAC');
    // Without tone marks (an STT slip) the same passage still ranks first.
    expect(top('phi bao tri moi thang')).toContain('12.000.000 đồng mỗi tháng');
  });
});
