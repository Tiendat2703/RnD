import { FULL_DOC_MAX_CHARS, RETRIEVE_TOP_K } from './config';
import { Bm25Index } from './docs/bm25';
import { pageLabel, type Chunk } from './docs/chunk';
import { extractJson, type Chat, type ChatMessage } from './llm';

export type DocMode = 'auto' | 'ask';
export type FindingKind = 'contradiction' | 'answer' | 'not_in_doc';
export type Finding = {
  kind: FindingKind;
  mode: DocMode;
  utterance: string;
  text: string;
  /** Verbatim from `chunk`, checked in code; empty for not_in_doc. */
  quote: string;
  chunk: Chunk | null;
};
export type DocCheckInput = {
  mode: DocMode;
  /** Lines said just before, for context only. */
  context: string[];
  /** New lines to judge (auto) or the question asked of MeetMate (ask). */
  lines: string[];
  /** Findings already reported, so the model does not repeat them. */
  reported: string[];
};

/**
 * The documents prepared for one meeting. When they fit, all chunks go in the system prompt as
 * an unchanging prefix the gateway caches; otherwise each call carries the BM25 top-K.
 */
export type DocLibrary = { chunks: Chunk[]; full: boolean; index: Bm25Index; prefix: string };

const render = (c: Chunk) => `[${c.id}] ${c.docName}, ${pageLabel(c)}\n${c.text}`;

export function buildLibrary(chunks: Chunk[], maxChars = FULL_DOC_MAX_CHARS): DocLibrary {
  const total = chunks.reduce((sum, c) => sum + c.text.length, 0);
  const full = total <= maxChars;
  return { chunks, full, index: new Bm25Index(chunks), prefix: full ? chunks.map(render).join('\n\n') : '' };
}

const INSTRUCTIONS = `Bạn là MeetMate, trợ lý theo dõi một cuộc họp tiếng Việt và đối chiếu với tài liệu của nhóm.
Lời thoại đến từ nhận dạng giọng nói nên có thể sai chính tả hoặc viết số khác tài liệu ("15.000.000" và "15 triệu" là một; "05" và "5" là một). Tên "MeetMate" thường bị nghe thành "Mít mết".
Chỉ dựa vào các đoạn tài liệu được cung cấp. Trả về đúng một object JSON:
{"items":[{"kind":"contradiction"|"answer"|"not_in_doc","utterance":string,"chunkId":string,"quote":string,"text":string}]}
Quy tắc:
- contradiction: một câu MỚI khẳng định thông tin (con số, ngày, thời hạn, tên người, công nghệ, phạm vi, điều khoản, trách nhiệm) trái với tài liệu. text: một câu nói rõ tài liệu ghi gì và khác lời nói ở điểm nào. KHÔNG báo khi người nói chỉ đề xuất thay đổi, giả định, hỏi lại, nói về tương lai chưa chốt, hoặc nói đúng với tài liệu.
- answer: một câu MỚI hỏi về nội dung tài liệu có ghi. text: trả lời ngắn gọn tối đa 2 câu, dựa trên tài liệu.
- not_in_doc: câu hỏi về tài liệu mà tài liệu không có thông tin. text bắt đầu bằng "Tài liệu không đề cập".
- quote: chép NGUYÊN VĂN, không sửa chữ nào, một đoạn ngắn (tối đa 250 ký tự) trong đoạn tài liệu chunkId làm bằng chứng. Bắt buộc với contradiction và answer; để "" với not_in_doc.
- utterance: chép lại câu trong cuộc họp mà mục này nói tới.
- Không lặp lại các mục đã báo. Không có gì cần báo thì trả {"items":[]}.
- Chế độ "ask": có người gọi MeetMate và hỏi trực tiếp; luôn trả đúng một mục answer hoặc not_in_doc cho câu hỏi đó. Với not_in_doc ở chế độ này, sau câu "Tài liệu không đề cập…" có thể thêm tối đa một câu hiểu biết chung, mở đầu bằng "Ngoài tài liệu:".
Viết text bằng tiếng Việt, ngắn gọn, trung lập, không kết luận thay nhóm.`;

export function docMessages(lib: DocLibrary, input: DocCheckInput): { messages: ChatMessage[]; candidates: Chunk[] } {
  const candidates = lib.full
    ? lib.chunks
    : lib.index.search([...input.context.slice(-1), ...input.lines].join(' '), RETRIEVE_TOP_K).map(h => h.chunk);
  const system = lib.full ? `${INSTRUCTIONS}\n\nTÀI LIỆU:\n${lib.prefix}` : INSTRUCTIONS;
  const parts = [`Chế độ: ${input.mode}`];
  if (!lib.full) parts.push(`Các đoạn tài liệu liên quan:\n${candidates.map(render).join('\n\n') || '(không có)'}`);
  if (input.context.length) parts.push(`Lời thoại trước đó:\n${input.context.map(l => `- ${l}`).join('\n')}`);
  parts.push(input.mode === 'ask'
    ? `Câu hỏi gửi MeetMate:\n- ${input.lines.join(' ')}`
    : `Câu MỚI cần xét:\n${input.lines.map(l => `- ${l}`).join('\n')}`);
  if (input.reported.length) parts.push(`Đã báo trước đó:\n${input.reported.map(r => `- ${r}`).join('\n')}`);
  return { messages: [{ role: 'system', content: system }, { role: 'user', content: parts.join('\n\n') }], candidates };
}

/** Whitespace, quote marks and case differ between a PDF text layer and a model's copy. */
const loose = (s: string) => s.normalize('NFC').toLowerCase()
  .replace(/[“”„"]/g, '"').replace(/[‘’']/g, "'").replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').trim();

export function quoteIn(text: string, quote: string): boolean {
  const haystack = loose(text);
  // A model may elide the middle of a long passage with "…"; every kept part must be verbatim.
  const parts = quote.split(/…|\.\.\./).map(loose).filter(p => p.length >= 6);
  return parts.length > 0 && parts.every(p => haystack.includes(p));
}

const KINDS = new Set<FindingKind>(['contradiction', 'answer', 'not_in_doc']);

/**
 * Trust boundary: a contradiction or answer reaches the meeting only with a quote that really
 * is in the documents. The citation (file, page) comes from the chunk, never from the model.
 */
export function parseFindings(raw: string, lib: DocLibrary, mode: DocMode, candidates: Chunk[]): Finding[] {
  const value = extractJson(raw) as { items?: unknown } | null;
  if (!value || !Array.isArray(value.items)) return [];
  const byId = new Map(lib.chunks.map(c => [c.id, c]));
  const out: Finding[] = [];
  for (const item of value.items as Record<string, unknown>[]) {
    const kind = item?.kind as FindingKind;
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!KINDS.has(kind) || !text) continue;
    const utterance = typeof item.utterance === 'string' ? item.utterance.trim() : '';
    if (kind === 'not_in_doc') {
      out.push({ kind, mode, utterance, text, quote: '', chunk: null });
      continue;
    }
    const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
    if (!quote) continue;
    const named = typeof item.chunkId === 'string' ? byId.get(item.chunkId) : undefined;
    // A wrong chunkId with a real quote is a citation slip, not an invention: find the real chunk.
    const chunk = named && quoteIn(named.text, quote) ? named : [...candidates, ...lib.chunks].find(c => quoteIn(c.text, quote));
    if (chunk) out.push({ kind, mode, utterance, text, quote, chunk });
  }
  return out;
}

export async function checkDocs(chat: Chat, lib: DocLibrary, input: DocCheckInput, signal: AbortSignal): Promise<Finding[]> {
  const { messages, candidates } = docMessages(lib, input);
  const findings = parseFindings(await chat(messages, signal), lib, input.mode, candidates);
  if (input.mode !== 'ask') return findings;
  // Someone asked MeetMate directly: they always get exactly one reply.
  const reply = findings.find(f => f.kind !== 'contradiction');
  return [reply ?? {
    kind: 'not_in_doc', mode: 'ask', utterance: input.lines.join(' '), quote: '', chunk: null,
    text: 'Tài liệu không đề cập rõ thông tin này, hoặc MeetMate không tìm được đoạn trích khớp để trả lời chắc chắn.',
  }];
}
