// lib/documents.ts — tài liệu đối chiếu, dùng chung cho web, backend MeetMate và extension.
//
// Tài liệu được tải lên ở web, backend đọc và chia đoạn (cùng bộ đọc PDF và cách chia của
// extension: agents/sidekick/extension/src/docs/), rồi khi bắt đầu cuộc họp web gửi các đoạn
// của tài liệu đã chọn kèm `session.prepare`. Extension chỉ dùng tài liệu của phiên đó.

/** Một đoạn tài liệu; trùng hình dạng với `Chunk` của extension để trích dẫn "file, trang" giữ nguyên. */
export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  /** trang bắt đầu và kết thúc (một câu vắt qua hai trang giữ cả hai) */
  page: number;
  pageEnd: number;
  text: string;
}

export type DocumentFormat = "PDF" | "DOCX" | "PPTX" | "TEXT";

/** Thông tin hiển thị trong thư viện, không kèm nội dung. */
export interface DocumentMeta {
  id: string;
  name: string;
  format: DocumentFormat;
  /** byte của file gốc */
  size: number;
  pageCount: number;
  chars: number;
  chunkCount: number;
  /** epoch ms */
  addedAt: number;
  /** vài trăm ký tự đầu, để nhận ra tài liệu */
  excerpt: string;
}

export interface StoredDocument extends DocumentMeta {
  chunks: DocumentChunk[];
}

/** Tài liệu gửi sang extension kèm phiên. */
export interface SessionDocument {
  id: string;
  name: string;
  pageCount: number;
  chunks: DocumentChunk[];
}

/** Id tài liệu: ngắn, vì id đoạn (và prompt) được ghép từ nó. Cũng là điều kiện ghép đường dẫn tệp an toàn. */
export const DOCUMENT_ID = /^d[a-z0-9]{3,16}$/;

export const DOC_LIMITS = {
  /** PDF lớn nhất backend nhận */
  maxPdfBytes: 40 * 1024 * 1024,
  /** số tài liệu tối đa trong một phiên */
  maxPerSession: 20,
  /** tổng ký tự tối đa gửi sang extension cho một phiên */
  maxSessionChars: 2_000_000,
} as const;

export const toSessionDocument = (d: StoredDocument): SessionDocument => ({
  id: d.id,
  name: d.name,
  pageCount: d.pageCount,
  chunks: d.chunks,
});
