import { describe, expect, it } from 'vitest';
import { DocAssistant, isQuestion, worthChecking } from './assistant';
import { buildLibrary, type DocCheckInput, type Finding } from './doccheck';
import type { Chunk } from './docs/chunk';

const chunk: Chunk = { id: 'hd#4', docId: 'hd', docName: 'hop-dong.pdf', page: 3, pageEnd: 3, text: 'phí bảo trì hệ thống là 12.000.000 đồng mỗi tháng' };
const lib = buildLibrary([chunk]);

type Call = { input: DocCheckInput; signal: AbortSignal; resolve(f: Finding[]): void; reject(e: unknown): void };

function setup(opts: { library?: boolean } = {}) {
  const calls: Call[] = [];
  const emitted: Finding[] = [];
  const errors: string[] = [];
  let t = 0;
  const a = new DocAssistant({
    library: () => (opts.library === false ? null : lib),
    check: (input, signal) => new Promise((resolve, reject) => calls.push({ input, signal, resolve, reject })),
    emit: f => emitted.push(f),
    onError: m => errors.push(m),
    now: () => t,
  });
  return { a, calls, emitted, errors, tick: (ms: number) => { t += ms; } };
}

const flush = () => new Promise(r => setTimeout(r, 0));
const contradiction = (quote = 'phí bảo trì hệ thống là 12.000.000 đồng'): Finding =>
  ({ kind: 'contradiction', mode: 'auto', utterance: 'phí 15 triệu', text: 'Tài liệu ghi 12 triệu.', quote, chunk });

describe('worthChecking and isQuestion', () => {
  it('skips small talk and keeps claims, numbers and questions', () => {
    expect(worthChecking('Ok vậy mình bắt đầu nhé.')).toBe(false);
    expect(worthChecking('Nghe rõ không?')).toBe(false);
    expect(worthChecking('Đội mình có 6 người thôi.')).toBe(true);
    expect(worthChecking('Mình dùng Flutter cho app di động')).toBe(true);
    expect(worthChecking('Bảo hành bao lâu?')).toBe(true);
  });

  it('spots Vietnamese questions with or without a question mark', () => {
    expect(isQuestion('hạn chót là ngày nào')).toBe(true);
    expect(isQuestion('phí bảo trì là 12 triệu đúng không')).toBe(true);
    expect(isQuestion('phí bảo trì là 12 triệu')).toBe(false);
  });
});

describe('DocAssistant', () => {
  it('checks a worthwhile line with the lines before it as context', async () => {
    const s = setup();
    s.a.onLine('Ok bắt đầu nhé.');
    s.a.onLine('Theo hợp đồng thì phí bảo trì là 15.000.000 một tháng.');
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0].input).toMatchObject({ mode: 'auto', context: ['Ok bắt đầu nhé.'], lines: ['Theo hợp đồng thì phí bảo trì là 15.000.000 một tháng.'] });
    s.calls[0].resolve([contradiction()]);
    await flush();
    expect(s.emitted).toHaveLength(1);
  });

  it('batches lines that arrive while a check runs into one next check', async () => {
    const s = setup();
    s.a.onLine('Đội mình có 6 người thôi.');
    s.a.onLine('Ngân sách marketing là 500 triệu.');
    s.a.onLine('Ra mắt vào tháng 5 năm sau.');
    expect(s.calls).toHaveLength(1);
    s.calls[0].resolve([]);
    await flush();
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1].input.lines).toEqual(['Ngân sách marketing là 500 triệu.', 'Ra mắt vào tháng 5 năm sau.']);
  });

  it('answers "MeetMate ơi" at once, even while an automatic check is running', async () => {
    const s = setup();
    s.a.onLine('Đội mình có 6 người thôi.');
    s.a.onLine('Mít mết ơi, phí bảo trì mỗi tháng bao nhiêu?');
    expect(s.calls.map(c => c.input.mode)).toEqual(['auto', 'ask']);
    expect(s.calls[1].input.lines).toEqual(['phí bảo trì mỗi tháng bao nhiêu?']);
    expect(s.calls[1].input.context).toEqual(['Đội mình có 6 người thôi.']);
  });

  it('takes the next line as the question when the name is said alone', async () => {
    const s = setup();
    s.a.onLine('Mít mết ơi.');
    expect(s.calls).toHaveLength(0);
    s.tick(4_000);
    s.a.onLine('Hạn chót bàn giao là ngày nào?');
    expect(s.calls.map(c => c.input.mode)).toEqual(['ask']);
    expect(s.calls[0].input.lines).toEqual(['Hạn chót bàn giao là ngày nào?']);
  });

  it('treats a late line after the name as ordinary speech', () => {
    const s = setup();
    s.a.onLine('Mít mết ơi.');
    s.tick(11_000);
    s.a.onLine('Hạn chót bàn giao là ngày nào?');
    expect(s.calls.map(c => c.input.mode)).toEqual(['auto']);
  });

  it('reports one document fact once, and lists it for the model', async () => {
    const s = setup();
    s.a.onLine('Phí bảo trì 15 triệu một tháng.');
    s.calls[0].resolve([contradiction()]);
    await flush();
    s.a.onLine('Như mình nói phí bảo trì 15 triệu nhé.');
    expect(s.calls[1].input.reported).toEqual(['sai lệch: "phí bảo trì hệ thống là 12.000.000 đồng"']);
    s.calls[1].resolve([contradiction('phí bảo trì  hệ thống là 12.000.000 đồng')]);
    await flush();
    expect(s.emitted).toHaveLength(1);
  });

  it('reports the same fact again after the report window', async () => {
    const s = setup();
    s.a.onLine('Phí bảo trì 15 triệu một tháng.');
    s.calls[0].resolve([contradiction()]);
    await flush();
    s.tick(11 * 60_000);
    s.a.onLine('Phí bảo trì 15 triệu một tháng.');
    s.calls[1].resolve([contradiction()]);
    await flush();
    expect(s.emitted).toHaveLength(2);
  });

  it('always delivers direct answers, even repeated ones', async () => {
    const s = setup();
    const answer: Finding = { kind: 'answer', mode: 'ask', utterance: 'phí bao nhiêu', text: '12 triệu.', quote: 'phí bảo trì hệ thống là 12.000.000 đồng', chunk };
    for (let i = 0; i < 2; i++) {
      s.a.onLine('Mít mết ơi phí bảo trì bao nhiêu?');
      s.calls.at(-1)!.resolve([answer]);
      await flush();
    }
    expect(s.emitted).toHaveLength(2);
  });

  it('reports errors, ignores aborts, and keeps going after a failure', async () => {
    const s = setup();
    s.a.onLine('Đội mình có 6 người thôi.');
    s.a.onLine('Ngân sách marketing là 500 triệu.');
    s.calls[0].reject(new Error('Blaze LLM lỗi HTTP 502'));
    await flush();
    expect(s.errors).toEqual(['Blaze LLM lỗi HTTP 502']);
    expect(s.calls).toHaveLength(2);
    s.calls[1].reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await flush();
    expect(s.errors).toHaveLength(1);
  });

  it('says so when asked before any document is loaded, and skips automatic checks', async () => {
    const s = setup({ library: false });
    s.a.onLine('Đội mình có 6 người thôi.');
    s.a.onLine('Mít mết ơi đội có mấy người?');
    await flush();
    expect(s.calls).toHaveLength(0);
    expect(s.emitted[0]).toMatchObject({ kind: 'not_in_doc', mode: 'ask', text: 'Chưa có tài liệu nào được tải lên MeetMate.' });
  });

  it('stop aborts running checks and ignores later lines and results', async () => {
    const s = setup();
    s.a.onLine('Đội mình có 6 người thôi.');
    s.a.stop();
    expect(s.calls[0].signal.aborted).toBe(true);
    s.calls[0].resolve([contradiction()]);
    await flush();
    s.a.onLine('Ngân sách marketing là 500 triệu.');
    expect(s.emitted).toEqual([]);
    expect(s.calls).toHaveLength(1);
  });
});
