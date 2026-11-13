import { describe, expect, it } from 'vitest';
import { DocAssistant } from './assistant';
import { buildLibrary, type DocCheckInput, type Finding } from './doccheck';
import type { Chunk } from './docs/chunk';

const chunk: Chunk = { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 3, text: 'Phí bảo trì 12 triệu đồng.' };
const lib = buildLibrary([chunk]);
type Call = { input: DocCheckInput; signal: AbortSignal; resolve(f: Finding[]): void; reject(e: unknown): void };
const answer: Finding = { kind: 'answer', mode: 'ask', utterance: 'phí bao nhiêu', text: '12 triệu.', quote: chunk.text, chunk };
const flush = () => new Promise(r => setTimeout(r, 0));

function setup(library = true, autoCheck = false) {
  const calls: Call[] = [];
  const emitted: Finding[] = [];
  const errors: string[] = [];
  let time = 0;
  const a = new DocAssistant({
    library: () => library ? lib : null,
    check: (input, signal) => new Promise((resolve, reject) => calls.push({ input, signal, resolve, reject })),
    emit: f => emitted.push(f), onError: m => errors.push(m), now: () => time,
    autoCheck: () => autoCheck,
  });
  return { a, calls, emitted, errors, tick: (ms: number) => { time += ms; } };
}

describe('DocAssistant keyword gate', () => {
  it('keeps ordinary statements and questions as context without checking documents', () => {
    const s = setup();
    s.a.onLine('Phí bảo trì là 15 triệu.');
    s.a.onLine('Phí bảo trì bao nhiêu?');
    s.a.onLine('MeetMate ơi, hạn chót ngày nào?');
    expect(s.calls).toEqual([]);
    expect(s.emitted).toEqual([]);
  });

  it('checks one keyword request with the recent conversation as context', async () => {
    const s = setup();
    s.a.onLine('Đang xem hợp đồng.');
    s.a.onLine('Trợ lý ơi, phí bảo trì bao nhiêu?');
    expect(s.calls[0].input).toEqual({ mode: 'ask', context: ['Đang xem hợp đồng.'], lines: ['phí bảo trì bao nhiêu?'] });
    s.calls[0].resolve([answer]);
    await flush();
    s.a.onLine('Còn hạn chót ngày nào?');
    expect(s.calls).toHaveLength(1);
    expect(s.emitted).toEqual([answer]);
  });

  it('consumes a standalone keyword for exactly one following line within 10 seconds', () => {
    const s = setup();
    s.a.onLine('Đang xem hợp đồng.');
    s.a.onLine('Trợ lý ơi.');
    expect(s.calls).toEqual([]);
    s.tick(4_000);
    s.a.onLine('Phí bảo trì bao nhiêu?');
    s.a.onLine('Hạn chót là ngày nào?');
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0].input.context).toEqual(['Đang xem hợp đồng.']);
  });

  it('does not search after the follow-up window expires', () => {
    const s = setup();
    s.a.onLine('Trợ lý.');
    s.tick(10_001);
    s.a.onLine('Hạn chót là ngày nào?');
    expect(s.calls).toEqual([]);
  });

  it('clears an earlier standalone wake when the next request contains its own keyword', async () => {
    const s = setup();
    s.a.onLine('Trợ lý.');
    s.a.onLine('Trợ lý ơi, phí bao nhiêu?');
    s.calls[0].resolve([answer]);
    await flush();
    s.a.onLine('Còn hạn chót ngày nào?');
    expect(s.calls).toHaveLength(1);
  });

  it('queues only keyword requests and keeps going after a failure', async () => {
    const s = setup();
    s.a.onLine('Trợ lý ơi, phí bảo trì bao nhiêu?');
    s.a.onLine('Hạn chót ngày nào?');
    s.a.onLine('Trợ lý ơi, hạn chót ngày nào?');
    s.calls[0].reject(new Error('HTTP 502'));
    await flush();
    expect(s.errors).toEqual(['HTTP 502']);
    expect(s.calls).toHaveLength(2);
    s.calls[1].resolve([answer]);
    await flush();
    expect(s.emitted).toEqual([answer]);
  });

  it('answers repeated explicit requests every time', async () => {
    const s = setup();
    for (let i = 0; i < 2; i++) {
      s.a.onLine('Trợ lý ơi phí bảo trì bao nhiêu?');
      s.calls.at(-1)!.resolve([answer]);
      await flush();
    }
    expect(s.emitted).toHaveLength(2);
  });

  it('reports missing documents only after a keyword request', () => {
    const s = setup(false);
    s.a.onLine('Phí bao nhiêu?');
    expect(s.emitted).toEqual([]);
    s.a.onLine('Trợ lý ơi, phí trong hợp đồng bao nhiêu?');
    expect(s.emitted[0]).toMatchObject({ kind: 'not_in_doc', mode: 'ask' });
  });

  it('stop aborts running work, drops queued requests and discards late results', async () => {
    const s = setup();
    s.a.onLine('Trợ lý ơi, phí bao nhiêu?');
    s.a.onLine('Trợ lý ơi, hạn chót ngày nào?');
    s.a.stop();
    expect(s.calls[0].signal.aborted).toBe(true);
    s.calls[0].resolve([answer]);
    await flush();
    s.a.onLine('Trợ lý ơi, đội có mấy người?');
    expect(s.emitted).toEqual([]);
    expect(s.calls).toHaveLength(1);
  });
});

describe('DocAssistant automatic and clicked checks', () => {
  // the library holds "Phí bảo trì 12 triệu đồng." (hd#4)
  const claim = 'Phí bảo trì là 15 triệu đồng một tháng.';
  const verdict = (over: Partial<Finding> = {}): Finding => ({ kind: 'contradiction', mode: 'auto', utterance: claim, text: 'Hợp đồng ghi 12 triệu.', quote: chunk.text, chunk, ...over });

  it('checks a claim with a fact about the documents on its own, without a keyword', async () => {
    const s = setup(true, true);
    s.a.onLine('Ok bắt đầu nhé.');
    s.a.onLine(claim);
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0].input).toEqual({ mode: 'auto', context: ['Ok bắt đầu nhé.'], lines: [claim] });
    s.calls[0].resolve([verdict()]);
    await flush();
    expect(s.emitted).toEqual([verdict()]);
  });

  it('does nothing automatic when the setting is off, or for lines the filter skips', () => {
    const off = setup(true, false);
    off.a.onLine(claim);
    expect(off.calls).toEqual([]);
    const on = setup(true, true);
    on.a.onLine('Hôm nay trời mưa to quá.');
    on.a.onLine('Hay là mình tăng phí bảo trì lên 15 triệu?');
    expect(on.calls).toEqual([]);
  });

  it('batches claims heard while a check runs into the next one', async () => {
    const s = setup(true, true);
    s.a.onLine(claim);
    s.a.onLine('Phí bảo trì 13 triệu đồng.');
    s.a.onLine('Phí bảo trì 14 triệu đồng.');
    expect(s.calls).toHaveLength(1);
    s.calls[0].resolve([]);
    await flush();
    expect(s.calls[1].input.lines).toEqual(['Phí bảo trì 13 triệu đồng.', 'Phí bảo trì 14 triệu đồng.']);
  });

  it('reports the same document fact once per window, but always answers a clicked line', async () => {
    const s = setup(true, true);
    s.a.onLine(claim);
    s.calls[0].resolve([verdict()]);
    await flush();
    s.a.onLine(claim);
    s.calls[1].resolve([verdict()]);
    await flush();
    expect(s.emitted).toHaveLength(1);
    s.a.verify(claim);
    expect(s.calls[2].input.mode).toBe('verify');
    s.calls[2].resolve([verdict({ mode: 'verify' })]);
    await flush();
    expect(s.emitted).toHaveLength(2);
  });

  it('checks a clicked line whatever the filter says, with the lines said before it', () => {
    const s = setup(true, false);
    s.a.onLine('Mình đang xem hợp đồng.');
    s.a.onLine('Cái đó để sau.');
    s.a.verify('Cái đó để sau.');
    expect(s.calls[0].input).toEqual({ mode: 'verify', context: ['Mình đang xem hợp đồng.'], lines: ['Cái đó để sau.'] });
  });

  it('says there is nothing to check against when a line is clicked without documents', () => {
    const s = setup(false, true);
    s.a.verify(claim);
    expect(s.calls).toEqual([]);
    expect(s.emitted).toMatchObject([{ kind: 'not_in_doc', mode: 'verify' }]);
  });

  it('runs automatic checks beside a keyword request, not behind it', () => {
    const s = setup(true, true);
    s.a.onLine('Trợ lý ơi, phí bảo trì bao nhiêu?');
    s.a.onLine(claim);
    expect(s.calls.map(c => c.input.mode)).toEqual(['ask', 'auto']);
  });
});

