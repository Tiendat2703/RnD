import { describe, expect, it } from 'vitest';
import type { Chunk } from './docs/chunk';
import { buildLibrary, checkDocs, docMessages, parseFindings, quoteIn } from './doccheck';
import type { ChatMessage } from './llm';

const chunks: Chunk[] = [
  { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 3, text: '5.2. Sau thời gian bảo hành, phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng, thanh toán trước ngày 05 hằng tháng.' },
  { id: 'kh#1', docId: 'kh', docName: 'ke-hoach.pdf', page: 1, pageEnd: 2, text: 'Đội phát triển gồm 7 người: 1 quản lý dự án, 2 lập trình viên backend.' },
];
const lib = buildLibrary(chunks);
const reply = (items: object[]) => JSON.stringify({ items });

describe('buildLibrary', () => {
  it('puts small document sets whole into a fixed prefix', () => {
    expect(lib.full).toBe(true);
    expect(lib.prefix).toContain('[hd#4] hop-dong.pdf, tr. 3');
    expect(lib.prefix).toContain('[kh#1] ke-hoach.pdf, tr. 1–2');
  });

  it('switches to retrieval above the size limit', () => {
    const big = buildLibrary(chunks, 10);
    expect(big.full).toBe(false);
    expect(big.prefix).toBe('');
  });
});

describe('docMessages', () => {
  it('judges by content, not by what the speaker calls the document, and never asks to skip repeats', () => {
    const system = docMessages(lib, { mode: 'auto', context: [], lines: ['x'] }).messages[0].content;
    expect(system).toContain('không theo cái tên họ gọi tài liệu');
    expect(system).toContain('vẫn báo contradiction');
  });

  it('keeps the system prompt identical across calls so the gateway can cache it', () => {
    const a = docMessages(lib, { mode: 'auto', context: [], lines: ['một'] }).messages;
    const b = docMessages(lib, { mode: 'ask', context: ['x'], lines: ['hai'] }).messages;
    expect(a[0]).toEqual(b[0]);
    expect(b[1].content).toContain('Câu hỏi gửi MeetMate:\n- hai');
    expect(b[1].content).toContain('Lời thoại trước đó:\n- x');
    expect(b[1].content).not.toContain('Đã báo');
  });

  it('sends only retrieved chunks, in the user message, for large sets', () => {
    const big = buildLibrary(chunks, 10);
    const { messages, candidates } = docMessages(big, { mode: 'auto', context: [], lines: ['phí bảo trì mỗi tháng'] });
    expect(candidates.map(c => c.id)).toEqual(['hd#4']);
    expect(messages[0].content).not.toContain('12.000.000');
    expect(messages[1].content).toContain('[hd#4]');
  });
});

describe('quoteIn', () => {
  it('accepts copies that differ only in spacing, case and quote marks', () => {
    expect(quoteIn(chunks[0].text, 'phí bảo trì  hệ thống là 12.000.000 đồng mỗi tháng')).toBe(true);
    expect(quoteIn('Gọi là “Dự án A” .', 'gọi là "dự án a".')).toBe(true);
  });

  it('accepts an elided quote only when every part is verbatim', () => {
    expect(quoteIn(chunks[0].text, 'phí bảo trì hệ thống … thanh toán trước ngày 05')).toBe(true);
    expect(quoteIn(chunks[0].text, 'phí bảo trì hệ thống … thanh toán sau ngày 10')).toBe(false);
  });

  it('rejects an altered number', () => {
    expect(quoteIn(chunks[0].text, 'phí bảo trì hệ thống là 15.000.000 đồng')).toBe(false);
  });
});

describe('parseFindings', () => {
  it('keeps a verified contradiction and takes the citation from the chunk', () => {
    const raw = reply([{ kind: 'contradiction', utterance: 'phí bảo trì 15 triệu', chunkId: 'hd#4', quote: 'phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng', text: 'Tài liệu ghi 12 triệu.' }]);
    const [f] = parseFindings(raw, lib, 'auto', chunks);
    expect(f).toMatchObject({ kind: 'contradiction', mode: 'auto', utterance: 'phí bảo trì 15 triệu', text: 'Tài liệu ghi 12 triệu.' });
    expect(f.chunk?.id).toBe('hd#4');
  });

  it('drops a quote that is not in any document', () => {
    const raw = reply([{ kind: 'contradiction', utterance: 'x', chunkId: 'hd#4', quote: 'phí bảo trì là 20.000.000 đồng', text: 'bịa' }]);
    expect(parseFindings(raw, lib, 'auto', chunks)).toEqual([]);
  });

  it('repairs a wrong chunkId when the quote is real', () => {
    const raw = reply([{ kind: 'answer', utterance: 'đội mấy người', chunkId: 'hd#4', quote: 'Đội phát triển gồm 7 người', text: '7 người.' }]);
    expect(parseFindings(raw, lib, 'auto', chunks)[0].chunk?.id).toBe('kh#1');
  });

  it('keeps not_in_doc without a quote, ignores unknown kinds, empty text and broken JSON', () => {
    const raw = '```json\n' + reply([
      { kind: 'not_in_doc', utterance: 'có ZaloPay không', text: 'Tài liệu không đề cập.' },
      { kind: 'opinion', text: 'x' },
      { kind: 'answer', quote: 'Đội phát triển gồm 7 người', text: '' },
    ]) + '\n```';
    expect(parseFindings(raw, lib, 'auto', chunks)).toEqual([
      { kind: 'not_in_doc', mode: 'auto', utterance: 'có ZaloPay không', text: 'Tài liệu không đề cập.', quote: '', chunk: null },
    ]);
    expect(parseFindings('xin lỗi, tôi không chắc', lib, 'auto', chunks)).toEqual([]);
  });
});

describe('checkDocs', () => {
  it('passes the signal through and returns verified findings', async () => {
    const signal = new AbortController().signal;
    let seen: { messages?: ChatMessage[]; signal?: AbortSignal } = {};
    const findings = await checkDocs(async (messages, s) => {
      seen = { messages, signal: s };
      return reply([{ kind: 'answer', utterance: 'q', chunkId: 'kh#1', quote: 'Đội phát triển gồm 7 người', text: '7 người.' }]);
    }, lib, { mode: 'auto', context: [], lines: ['đội mấy người'] }, signal);
    expect(seen.signal).toBe(signal);
    expect(findings).toHaveLength(1);
  });

  it('always answers a direct question exactly once', async () => {
    const input = { mode: 'ask' as const, context: [], lines: ['ai ký hợp đồng'] };
    const none = await checkDocs(async () => reply([]), lib, input, new AbortController().signal);
    expect(none).toHaveLength(1);
    expect(none[0]).toMatchObject({ kind: 'not_in_doc', mode: 'ask', utterance: 'ai ký hợp đồng' });
    const two = await checkDocs(async () => reply([
      { kind: 'answer', utterance: 'q', chunkId: 'kh#1', quote: 'Đội phát triển gồm 7 người', text: 'Bảy.' },
      { kind: 'answer', utterance: 'q', chunkId: 'hd#4', quote: 'phí bảo trì hệ thống là 12.000.000 đồng', text: 'Khác.' },
    ]), lib, input, new AbortController().signal);
    expect(two.map(f => f.text)).toEqual(['Bảy.']);
  });
});
