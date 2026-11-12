// lib/backendApi.ts — lời gọi duy nhất từ web tới backend MeetMate
// (agents/sidekick/meetmate-server, chạy local ở cổng 3001).
//
// Web gửi phiên đã kết thúc khi người dùng bấm "Lưu phiên" và đọc lại báo cáo; quản lý tài
// liệu đối chiếu (backend đọc PDF và chia đoạn, web gửi các đoạn cho extension kèm phiên).
// Không có khóa nào ở đây: khóa LLM nằm trong .env.local của backend.
import type { SavedSession } from "./bridgeProtocol";
import type { DocumentMeta, StoredDocument } from "./documents";
import type { SavedSessionResponse } from "./report";

const BASE = (process.env.NEXT_PUBLIC_MEETMATE_API ?? "http://localhost:3001").replace(/\/$/, "");

const OFFLINE =
  "Không kết nối được backend MeetMate. Chạy `npm run meetmate:server` trong agents/sidekick rồi thử lại.";

async function call(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(OFFLINE);
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(body?.error ?? `Backend trả lỗi HTTP ${res.status}.`);
  if (body === null) throw new Error("Backend trả về dữ liệu không đọc được.");
  return body;
}

/** Gửi phiên và chờ backend tạo xong báo cáo (có thể tới một phút). */
export async function saveSessionToBackend(session: SavedSession): Promise<SavedSessionResponse> {
  return json(await call("/sessions", { method: "POST", body: JSON.stringify(session) }));
}

/** Đọc phiên đã lưu; `null` nếu backend chưa có phiên này. */
export async function getSavedSession(id: string): Promise<SavedSessionResponse | null> {
  const res = await call(`/sessions/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  return json(res);
}

export async function retryReport(id: string): Promise<SavedSessionResponse> {
  return json(await call(`/sessions/${encodeURIComponent(id)}/report/retry`, { method: "POST" }));
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  return json(await call("/documents"));
}

/** Tài liệu kèm toàn bộ đoạn: thứ được gửi sang extension khi bắt đầu cuộc họp. */
export async function getDocument(id: string): Promise<StoredDocument> {
  return json(await call(`/documents/${encodeURIComponent(id)}`));
}

/** PDF gửi nguyên byte; backend đọc lớp chữ và chia đoạn theo trang. */
export async function uploadPdf(file: File): Promise<DocumentMeta> {
  return json(
    await call("/documents/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(file.name) },
      body: file,
    }),
  );
}

/** .docx (đã đọc trên trình duyệt) hoặc văn bản dán: gửi các trang chữ. */
export async function uploadTextDocument(doc: {
  name: string;
  format: "DOCX" | "TEXT";
  size: number;
  pages: string[];
}): Promise<DocumentMeta> {
  return json(await call("/documents/text", { method: "POST", body: JSON.stringify(doc) }));
}

export async function deleteDocument(id: string): Promise<void> {
  await json(await call(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
