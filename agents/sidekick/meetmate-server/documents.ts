// Tài liệu đối chiếu: web tải lên, backend đọc, chia đoạn và lưu thành <dir>/documents/<id>.json.
// Bộ đọc PDF và cách chia đoạn là của extension (extension/src/docs/), nên trích dẫn "file, trang"
// trong cuộc họp giống hệt lúc extension tự đọc file.
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  DOC_LIMITS,
  DOCUMENT_ID,
  type DocumentFormat,
  type DocumentMeta,
  type StoredDocument,
} from '../../../lib/documents';
import { chunkPages, type Chunk } from '../extension/src/docs/chunk';
import { extractPdfPages, looksScanned, type PdfJsLike } from '../extension/src/docs/pdf';
import { HttpError } from './service';
import { listJson, readJson, writeJson } from './store';

// `Chunk` của extension và `DocumentChunk` dùng chung phải cùng hình dạng.
const _sameShape: [Chunk] extends [StoredDocument['chunks'][number]] ? true : never = true;
void _sameShape;

const EXCERPT_CHARS = 220;
const MAX_NAME = 160;

const newId = () => `d${Date.now().toString(36).slice(-5)}${randomBytes(2).toString('hex')}`;

export function cleanName(raw: string): string {
  const name = raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, MAX_NAME);
  return name || 'Tài liệu';
}

/** Chia các trang đã đọc thành đoạn và dựng bản ghi tài liệu. */
export function buildDocument(name: string, format: DocumentFormat, size: number, pages: string[]): StoredDocument {
  const id = newId();
  const chunks = chunkPages({ id, name }, pages);
  if (!chunks.length) throw new HttpError(422, `${name}: không đọc được chữ nào trong tài liệu.`);
  return {
    id,
    name,
    format,
    size,
    pageCount: pages.length,
    chars: chunks.reduce((n, c) => n + c.text.length, 0),
    chunkCount: chunks.length,
    addedAt: Date.now(),
    excerpt: pages.join(' ').replace(/\s+/g, ' ').trim().slice(0, EXCERPT_CHARS),
    chunks,
  };
}

export async function readPdf(data: Uint8Array, name: string): Promise<string[]> {
  if (data.byteLength > DOC_LIMITS.maxPdfBytes) throw new HttpError(413, `${name}: file lớn hơn 40 MB.`);
  let pages: string[];
  try {
    pages = await extractPdfPages(data, pdfjs as unknown as PdfJsLike, { verbosity: 0 });
  } catch {
    throw new HttpError(422, `${name}: không mở được file PDF này (file hỏng hoặc có mật khẩu).`);
  }
  if (looksScanned(pages)) {
    throw new HttpError(422, `${name}: PDF không có lớp chữ (có thể là bản scan), MeetMate chưa đọc được loại này.`);
  }
  return pages;
}

const metaOf = ({ chunks: _chunks, ...meta }: StoredDocument): DocumentMeta => meta;

export class DocumentStore {
  constructor(private readonly dir: string) {}

  private path(id: string): string {
    if (!DOCUMENT_ID.test(id)) throw new HttpError(400, 'Mã tài liệu không hợp lệ.');
    return join(this.dir, 'documents', `${id}.json`);
  }

  async save(doc: StoredDocument): Promise<DocumentMeta> {
    await writeJson(this.path(doc.id), doc);
    return metaOf(doc);
  }

  async get(id: string): Promise<StoredDocument> {
    const doc = await readJson<StoredDocument>(this.path(id));
    if (!doc) throw new HttpError(404, 'Không tìm thấy tài liệu.');
    return doc;
  }

  async list(): Promise<DocumentMeta[]> {
    const ids = (await listJson(join(this.dir, 'documents'))).filter((id) => DOCUMENT_ID.test(id));
    const docs = await Promise.all(ids.map((id) => readJson<StoredDocument>(this.path(id))));
    return docs
      .filter((d): d is StoredDocument => d !== null)
      .map(metaOf)
      .sort((a, b) => b.addedAt - a.addedAt);
  }

  async remove(id: string): Promise<void> {
    await rm(this.path(id), { force: true });
  }
}
