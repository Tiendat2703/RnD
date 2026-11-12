/** Shared contract for the Teacher study room; credentials stay on the backend. */
export const TEACHER_LIMITS = { fileBytes: 10 * 1024 * 1024, documents: 12, documentChars: 80_000, roomChars: 240_000, messageChars: 6_000 } as const;
export type TeacherAction = 'ask' | 'teach' | 'exercises' | 'solve' | 'research';
export const TEACHER_ACTIONS: Record<TeacherAction, { label: string; hint: string }> = {
  ask: { label: 'Hỏi & giải thích', hint: 'Bạn chưa hiểu phần nào? Hãy hỏi Teacher…' },
  teach: { label: 'Giảng bài', hint: 'Bạn muốn học chủ đề, slide hoặc chương nào?' },
  exercises: { label: 'Ra bài tập', hint: 'Chủ đề và mức độ bài tập bạn muốn luyện…' },
  solve: { label: 'Giải bài tập', hint: 'Nhập đề bài hoặc bài làm để Teacher hướng dẫn từng bước…' },
  research: { label: 'Tìm tài liệu', hint: 'Nhập chủ đề cần tìm tài liệu trên web…' },
};
export interface TeacherSection { locator: string; text: string }
export interface TeacherDocument { id: string; name: string; format: string; addedAt: number; sections: TeacherSection[] }
export interface TeacherMember { id: string; name: string; joinedAt: number }
export interface TeacherCitation { documentId: string; documentName: string; locator: string; quote: string }
export interface TeacherSource { title: string; url: string }
export interface TeacherMessage {
  id: string; requestId: string; role: 'student' | 'teacher'; memberId?: string; name: string;
  text: string; action: TeacherAction; createdAt: number; status: 'complete' | 'pending' | 'error';
  citations?: TeacherCitation[]; sources?: TeacherSource[];
  documentId?: string;
  source?: 'text' | 'voice';
  context?: string[];
}
export interface TeacherRoomSummary {
  id: string; title: string; subject: string; goal: string; level: string; mode: 'solo' | 'group';
  createdAt: number; updatedAt: number; memberCount: number; documentCount: number;
}
export interface TeacherRoom extends TeacherRoomSummary {
  members: TeacherMember[]; documents: TeacherDocument[]; messages: TeacherMessage[]; busy: boolean;
}
export interface CreateTeacherRoom {
  title: string; subject: string; goal: string; level: string; mode: 'solo' | 'group'; name: string;
}
export interface TeacherAccess { room: TeacherRoom; memberToken: string }
export interface TeacherQuestionRequest {
  requestId: string; text: string; action: TeacherAction; documentId?: string; source?: 'text' | 'voice'; context?: string[];
}
export interface TeacherConfig { ai: boolean; web: boolean; voice: boolean }
export interface TeacherVoiceFinal { sequence: number; text: string }
export interface TeacherVoiceSnapshot {
  id: string; status: 'connecting' | 'listening' | 'reconnecting' | 'closed' | 'error';
  partial: string; finals: TeacherVoiceFinal[]; error: string | null;
}
