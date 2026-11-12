import { describe, expect, it } from 'vitest';
import { reportToMarkdown } from '../../../lib/report';
import { MAX_TRANSCRIPT_CHARS, extractJson, generateReport, transcriptText } from './report';
import type { IncomingSession } from './schema';

const session = (lines: string[], extra: Partial<IncomingSession> = {}): IncomingSession => ({
  id: 'm-1',
  title: 'Họp sản phẩm',
  kind: 'san-pham',
  startedAt: 0,
  endedAt: 1000,
  lines: lines.map((text, i) => ({ id: `l${i}`, text, atMs: i * 5000, source: 'mixed' })),
  topics: [],
  ...extra,
});

const reply = (body: object) => async () => '```json\n' + JSON.stringify(body) + '\n```';

describe('generateReport', () => {
  const s = session([
    'Chào mọi người, hôm nay chốt giá gói Pro.',
    'Lan sẽ gửi bảng giá mới trước thứ Sáu.',
    'Còn phần tích hợp Zalo thì để tuần sau bàn tiếp.',
  ]);

  it('keeps assignments whose evidence is in the transcript, ignoring punctuation and case', async () => {
    const r = await generateReport(s, {
      model: 'm',
      now: () => 42,
      chat: reply({
        summary: 'Chốt giá gói Pro.',
        happenings: ['Bàn giá gói Pro'],
        assignments: [{ task: 'Gửi bảng giá mới', owner: 'Lan', evidence: 'lan sẽ gửi bảng giá mới trước thứ sáu' }],
        nextSteps: [{ item: 'Bàn tích hợp Zalo', due: 'tuần sau' }],
        openQuestions: [],
      }),
    });
    expect(r.assignments).toEqual([
      { task: 'Gửi bảng giá mới', owner: 'Lan', evidence: 'lan sẽ gửi bảng giá mới trước thứ sáu' },
    ]);
    expect(r.droppedUnverified).toBe(0);
    expect(r.generatedAt).toBe(42);
    expect(r.nextSteps[0]).toEqual({ item: 'Bàn tích hợp Zalo', due: 'tuần sau' });
  });

  it('drops an assignment whose evidence was invented', async () => {
    const r = await generateReport(s, {
      model: 'm',
      chat: reply({
        summary: '',
        assignments: [{ task: 'Viết hợp đồng', owner: 'Minh', evidence: 'Minh sẽ viết hợp đồng' }],
      }),
    });
    expect(r.assignments).toEqual([]);
    expect(r.droppedUnverified).toBe(1);
  });

  it('clears an owner whose name is not in the evidence', async () => {
    const r = await generateReport(s, {
      model: 'm',
      chat: reply({
        assignments: [{ task: 'Bàn Zalo', owner: 'Hùng', evidence: 'tích hợp Zalo thì để tuần sau bàn tiếp' }],
      }),
    });
    expect(r.assignments[0].owner).toBeNull();
  });

  it('treats the string "null" as no owner and fills missing arrays', async () => {
    const r = await generateReport(s, {
      model: 'm',
      chat: reply({ summary: 'x', assignments: [{ task: 'Gửi giá', owner: 'null', evidence: 'Lan sẽ gửi bảng giá mới' }] }),
    });
    expect(r.assignments[0].owner).toBeNull();
    expect(r.happenings).toEqual([]);
    expect(r.openQuestions).toEqual([]);
  });

  it('takes sources from the session, not from the model', async () => {
    const withTopics = session(['a b c d e f'], {
      topics: [
        {
          topic: { topic: 'Giá', keywords: [], query: 'q' },
          result: { topic: 'Giá', summary: '', sources: [{ title: 'A', url: 'https://a.example', reason: 'r' }] },
          posted: 1,
        },
      ],
    });
    const r = await generateReport(withTopics, { model: 'm', chat: reply({ summary: 's' }) });
    expect(r.sources).toEqual([{ topic: 'Giá', title: 'A', url: 'https://a.example' }]);
  });

  it('refuses an empty transcript without calling the model', async () => {
    let called = false;
    await expect(
      generateReport(session(['  ']), {
        model: 'm',
        chat: async () => {
          called = true;
          return '{}';
        },
      }),
    ).rejects.toThrow(/không có câu nào/);
    expect(called).toBe(false);
  });

  it('fails on a reply that is not JSON', async () => {
    await expect(generateReport(s, { model: 'm', chat: async () => 'xin lỗi' })).rejects.toThrow();
  });
});

describe('transcriptText', () => {
  it('stamps lines and flags truncation', () => {
    expect(transcriptText(session(['xin chào'])).text).toBe('[00:00] xin chào');
    const long = session(Array.from({ length: 100 }, () => 'x'.repeat(MAX_TRANSCRIPT_CHARS / 50)));
    const t = transcriptText(long);
    expect(t.truncated).toBe(true);
    expect(t.text.length).toBeLessThanOrEqual(MAX_TRANSCRIPT_CHARS);
  });
});

describe('extractJson', () => {
  it('reads an object wrapped in prose', () => {
    expect(extractJson('Đây: {"a":1} xong')).toEqual({ a: 1 });
  });
});

describe('reportToMarkdown', () => {
  it('writes the three sections and an unknown owner', () => {
    const md = reportToMarkdown({
      sessionId: 'm',
      title: 'Họp',
      generatedAt: 0,
      model: 'x',
      summary: 'Tóm tắt',
      happenings: ['Một'],
      assignments: [{ task: 'Việc', owner: null, evidence: 'câu' }],
      nextSteps: [{ item: 'Bước', due: 'thứ Sáu' }],
      openQuestions: [],
      sources: [],
      droppedUnverified: 0,
      transcriptTruncated: false,
    });
    expect(md).toContain('## Những gì đã diễn ra');
    expect(md).toContain('**Chưa rõ người nhận**: Việc');
    expect(md).toContain('- Bước (hạn: thứ Sáu)');
  });
});
