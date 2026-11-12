import { describe, expect, it } from 'vitest';
import { DocAssistant } from './assistant';
import { buildLibrary, type DocCheckInput, type Finding } from './doccheck';
import type { Chunk } from './docs/chunk';

const chunk: Chunk = { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 3, text: 'Phí bảo trì 12 triệu đồng.' };
const lib = buildLibrary([chunk]);
type Call = { input: DocCheckInput; signal: AbortSignal; resolve(f: Finding[]): void; reject(e: unknown): void };
const answer: Finding = { kind: 'answer', mode: 'ask', utterance: 'phí bao nhiêu', text: '12 triệu.', quote: chunk.text, chunk };
const flush = () => new Promise(r => setTimeout(r, 0));

function setup(library = true) {
  const calls: Call[] = [];
  const emitted: Finding[] = [];
  const errors: string[] = [];
  let time = 0;
  const a = new DocAssistant({
    library: () => library ? lib : null,
    check: (input, signal) => new Promise((resolve, reject) => calls.push({ input, signal, resolve, reject })),
    emit: f => emitted.push(f), onError: m => errors.push(m), now: () => time,
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
