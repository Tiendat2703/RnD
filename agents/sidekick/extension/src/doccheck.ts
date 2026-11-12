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
  /** The same fact was already reported this meeting: shown again, not re-posted to the chat. */
  repeat?: boolean;
};
export type DocCheckInput = {
  mode: DocMode;
  /** Lines said just before, for context only. */
  context: string[];
  /** New lines to judge (auto) or the question asked of MeetMate (ask). */
  lines: string[];
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
Chỉ dựa vào các đoạn tài liệu được cung cấp. Người nói có thể gọi tài liệu bằng tên khác (hợp đồng, hóa đơn, kế hoạch, báo cáo…): hãy đối chiếu theo NỘI DUNG họ nói, không theo cái tên họ gọi tài liệu.
Trả về đúng một object JSON:
{"items":[{"kind":"contradiction"|"answer"|"not_in_doc","utterance":string,"chunkId":string,"quote":string,"text":string}]}
Quy tắc:
- Phân biệt phạm vi: chỉ xét câu hỏi/thông tin thực sự liên quan đến nội dung tài liệu hoặc dữ kiện riêng của nhóm. Câu hỏi kiến thức công khai, địa điểm (Ngũ Hành Sơn, Đại học Duy Tân ở đâu), hướng dẫn chung hoặc yêu cầu tìm trên mạng KHÔNG phải câu hỏi tài liệu chỉ vì cuộc họp có file. Bỏ qua chúng, không tạo not_in_doc. Không lấy chủ đề cũ để ép câu hỏi mới vào tài liệu.
- contradiction: một câu MỚI khẳng định thông tin (con số, ngày, thời hạn, tên người, công nghệ, phạm vi, điều khoản, trách nhiệm) trái với tài liệu. text: một câu nói rõ tài liệu ghi gì và khác lời nói ở điểm nào. KHÔNG báo khi người nói chỉ đề xuất thay đổi, giả định, hỏi lại, nói về tương lai chưa chốt, hoặc nói đúng với tài liệu.
- answer: một câu MỚI hỏi về nội dung tài liệu có ghi. text: trả lời ngắn gọn tối đa 2 câu, dựa trên tài liệu.
- not_in_doc: chỉ khi tài liệu thật sự không có thông tin nào liên quan tới điều được hỏi. Nếu tài liệu có thông tin trái với lời nói thì dùng contradiction; có thông tin trả lời được thì dùng answer. text bắt đầu bằng "Tài liệu không đề cập".
- quote: chép NGUYÊN VĂN, không sửa chữ nào, một đoạn ngắn (tối đa 250 ký tự) trong đoạn tài liệu chunkId làm bằng chứng. Bắt buộc với contradiction và answer; để "" với not_in_doc.
- utterance: chép lại câu trong cuộc họp mà mục này nói tới.
- Câu mới nhắc lại một ý sai đã nói trước đó thì vẫn báo contradiction như bình thường (hệ thống tự tránh gửi trùng). Không có gì cần báo thì trả {"items":[]}.
- Chế độ "ask": câu hỏi đã được phân loại là hỏi tài liệu; trả đúng một mục answer hoặc not_in_doc. Không thêm hiểu biết chung hay đoán câu trả lời từ ngoài tài liệu. Tài liệu thiếu thông tin nội bộ không có nghĩa phải tìm thông tin đó trên mạng.
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
