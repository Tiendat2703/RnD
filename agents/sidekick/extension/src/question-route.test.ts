import { describe, expect, it } from 'vitest';
import { buildLibrary } from './doccheck';
import type { ChatMessage } from './llm';
import { routeQuestion } from './question-route';

const input = { mode: 'ask' as const, context: ['Đang xem hợp đồng của nhóm.'], lines: ['Phí bảo trì bao nhiêu?'] };

describe('routeQuestion', () => {
  it('provides the question, context and relevant document passages to choose a source', async () => {
    let sent: ChatMessage[] = [];
    const lib = buildLibrary([{
      id: 'contract#1', docId: 'contract', docName: 'contract.pdf', page: 1, pageEnd: 1,
      text: 'Phí bảo trì là 12 triệu đồng.',
    }]);
    const signal = new AbortController().signal;
    const route = await routeQuestion(async (messages, s) => {
      sent = messages;
      expect(s).toBe(signal);
      return '{"source":"docs","query":""}';
    }, lib, input, signal);
    expect(route).toEqual({ source: 'docs' });
    expect(JSON.parse(sent[1].content)).toMatchObject({
      question: input.lines[0], context: input.context, documents: ['contract.pdf'],
      relevantPassages: [{ document: 'contract.pdf', text: 'Phí bảo trì là 12 triệu đồng.' }],
    });
  });

  it('accepts a web query without requiring uploaded documents', async () => {
    expect(await routeQuestion(async () => '```json\n{"source":"web","query":" Ngũ Hành Sơn ở đâu "}\n```',
      null, input, new AbortController().signal)).toEqual({ source: 'web', query: 'Ngũ Hành Sơn ở đâu' });
  });

  it.each(['{}', 'not json', '{"source":"web","query":""}', '{"source":"unknown"}', '{"source":"clarify"}'])(
    'asks for clarification for uncertain or invalid routing: %s', async raw => {
      expect(await routeQuestion(async () => raw, null, input, new AbortController().signal))
        .toEqual({ source: 'clarify' });
    },
  );
});
