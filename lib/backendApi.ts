// lib/backendApi.ts — lời gọi duy nhất từ web tới backend MeetMate
// (agents/sidekick/meetmate-server, chạy local ở cổng 3001).
//
// Web gửi phiên đã kết thúc khi người dùng bấm "Lưu phiên" và đọc lại báo cáo; quản lý tài
// liệu đối chiếu (backend đọc PDF và chia đoạn, web gửi các đoạn cho extension kèm phiên).
// Không có khóa nào ở đây: khóa LLM nằm trong .env.local của backend.
import type { SavedSession } from "./bridgeProtocol";
import type { DocumentMeta, StoredDocument } from "./documents";
import type { SavedSessionResponse } from "./report";
import type { CreateTeacherRoom, TeacherAccess, TeacherAction, TeacherConfig, TeacherRoom, TeacherRoomSummary, TeacherVoiceSnapshot } from "./teacher";

const BASE = (process.env.NEXT_PUBLIC_MEETMATE_API ?? "http://localhost:3001").replace(/\/$/, "");

const OFFLINE =
  "Không kết nối được backend MeetMate. Chạy `npm run meetmate:server` trong agents/sidekick rồi thử lại.";

async function call(path: string, init?: RequestInit, base = BASE): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${base}/api${path}`, {
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
/** Teacher rooms use the same configured backend as meeting reports. */
const teacherCall = (path: string, init?: RequestInit) => call(path, init, '');
export const teacherApi = {
  config: async () => json<TeacherConfig>(await teacherCall('/teacher/config')),
  list: async () => json<TeacherRoomSummary[]>(await teacherCall('/teacher/rooms')),
  create: async (body: CreateTeacherRoom) => json<TeacherAccess>(await teacherCall('/teacher/rooms', { method: 'POST', body: JSON.stringify(body) })),
  info: async (id: string) => json<TeacherRoomSummary>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/info`)),
  room: async (id: string, token: string) => json<TeacherRoom>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}`, { headers: { 'X-Teacher-Member': token } })),
  join: async (id: string, name: string) => json<TeacherAccess>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/join`, { method: 'POST', body: JSON.stringify({ name }) })),
  upload: async (id: string, token: string, file: File) => json<TeacherRoom>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/documents`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Teacher-Member': token, 'X-File-Name': encodeURIComponent(file.name) }, body: file,
  })),
  startVoice: async (id: string, token: string, signal?: AbortSignal) => json<TeacherVoiceSnapshot>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/voice`, {
    method: 'POST', headers: { 'X-Teacher-Member': token }, signal,
  })),
  voiceAudio: async (id: string, token: string, voiceId: string, sequence: number, audio: ArrayBuffer, signal?: AbortSignal) => json<TeacherVoiceSnapshot>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/voice/${encodeURIComponent(voiceId)}/audio`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Teacher-Member': token, 'X-Voice-Sequence': String(sequence) }, body: audio, signal,
  })),
  stopVoice: async (id: string, token: string, voiceId: string, keepalive = false) => json<{ ok: true }>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/voice/${encodeURIComponent(voiceId)}/stop`, {
    method: 'POST', headers: { 'X-Teacher-Member': token }, keepalive,
  })),
  message: async (id: string, token: string, body: { requestId: string; text: string; action: TeacherAction; documentId?: string; source?: 'text' | 'voice'; context?: string[] }) =>
    json<TeacherRoom>(await teacherCall(`/teacher/rooms/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: { 'X-Teacher-Member': token }, body: JSON.stringify(body) })),
};

export async function generatePresentationChecklist(documentIds: string[]): Promise<import('./presentation').PresentationSnapshot> {
  return json(await call('/presentation/checklist', {method:'POST', body:JSON.stringify({documentIds})}));
}
