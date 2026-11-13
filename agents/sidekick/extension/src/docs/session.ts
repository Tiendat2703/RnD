// Tài liệu đi kèm phiên do web console gửi (lib/documents.ts SessionDocument) → bản ghi của kho
// tài liệu extension. Dữ liệu đến từ một trang web qua cầu nối nên được kiểm tra từng trường
// và giới hạn kích thước, không tin nguyên văn.
import { DOC_LIMITS, DOCUMENT_ID } from '../../../../../lib/documents';
import type { Chunk } from './chunk';
import type { StoredDoc } from './store';

const MAX_NAME = 160;
const isInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

function chunkOf(raw: unknown, doc: { id: string; name: string }): Chunk | null {
  const c = raw as Partial<Chunk> | null;
  if (!c || typeof c.id !== 'string' || typeof c.text !== 'string' || !isInt(c.page) || !isInt(c.pageEnd)) return null;
  if (!c.id.startsWith(`${doc.id}#`) || !c.text.trim()) return null;
  // docId/docName lấy từ tài liệu, không từ đoạn: trích dẫn luôn khớp tên file đang hiển thị
  return { id: c.id, docId: doc.id, docName: doc.name, page: c.page, pageEnd: Math.max(c.page, c.pageEnd), text: c.text };
}

export function storedDocsOf(raw: unknown, now = Date.now()): StoredDoc[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredDoc[] = [];
  let total = 0;
  for (const item of raw.slice(0, DOC_LIMITS.maxPerSession)) {
    const d = item as { id?: unknown; name?: unknown; pageCount?: unknown; chunks?: unknown } | null;
    if (!d || typeof d.id !== 'string' || !DOCUMENT_ID.test(d.id) || typeof d.name !== 'string') continue;
    if (out.some(o => o.id === d.id) || !Array.isArray(d.chunks)) continue;
    const doc = { id: d.id, name: d.name.slice(0, MAX_NAME) || 'Tài liệu' };
    const chunks = d.chunks.map(c => chunkOf(c, doc)).filter((c): c is Chunk => c !== null);
    const chars = chunks.reduce((n, c) => n + c.text.length, 0);
    if (!chunks.length || total + chars > DOC_LIMITS.maxSessionChars) continue;
    total += chars;
    out.push({
      ...doc,
      size: 0,
      pageCount: isInt(d.pageCount) ? d.pageCount : Math.max(...chunks.map(c => c.pageEnd)),
      chars,
      chunks,
      addedAt: now,
    });
  }
  return out;
}

/**
 * Thêm tài liệu mới vào kho đang có của một phiên. Tài liệu trùng id thì bỏ qua (web gửi lại cùng
 * tài liệu không nhân đôi); vượt giới hạn số tài liệu hoặc tổng ký tự của phiên thì bỏ phần thừa.
 */
export function mergeDocs(existing: StoredDoc[], incoming: StoredDoc[]): { docs: StoredDoc[]; added: number } {
  const docs = [...existing];
  let total = docs.reduce((n, d) => n + d.chars, 0);
  let added = 0;
  for (const d of incoming) {
    if (docs.some(o => o.id === d.id)) continue;
    if (docs.length >= DOC_LIMITS.maxPerSession || total + d.chars > DOC_LIMITS.maxSessionChars) continue;
    total += d.chars;
    docs.push(d);
    added++;
  }
  return { docs, added };
}
