// Nhận phiên, ghi JSON, tạo báo cáo. Mọi thao tác trên cùng một id chạy nối tiếp,
// nên bấm "Lưu phiên" hai lần liền chỉ gọi LLM một lần: lượt sau thấy nội dung y hệt
// và báo cáo đã có thì trả lại bản cũ.
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import type { MeetingReport, SavedSessionResponse } from '../../../lib/report';
import type { IncomingSession } from './schema';
import type { SessionStore, StoredReport, StoredSession } from './store';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Generate = (session: IncomingSession) => Promise<MeetingReport>;

function hashOf(session: IncomingSession): string {
  // syncedAt do extension đặt sau khi lưu xong, không phải nội dung phiên
  const { syncedAt: _ignored, ...content } = session;
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

function userMessage(error: unknown): string {
  if (error instanceof ZodError || error instanceof SyntaxError) return 'LLM trả về báo cáo sai định dạng. Thử lại.';
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
    return 'LLM trả lời quá lâu. Thử lại.';
  return error instanceof Error ? error.message : String(error);
}

function toResponse(s: StoredSession, r: StoredReport | null): SavedSessionResponse {
  return {
    id: s.session.id,
    savedAt: s.savedAt,
    reportStatus: r?.status ?? 'error',
    report: r?.report ?? null,
    error: r ? r.error : 'Chưa có báo cáo.',
  };
}

export class SessionService {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly store: SessionStore,
    private readonly generate: Generate,
    private readonly now: () => number = Date.now,
  ) {}

  private serial<T>(id: string, task: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(id) ?? Promise.resolve();
    const next = prev.then(task, task);
    const tail = next.catch(() => undefined);
    this.queues.set(id, tail);
    void tail.then(() => {
      if (this.queues.get(id) === tail) this.queues.delete(id);
    });
    return next;
  }

  private async build(stored: StoredSession): Promise<SavedSessionResponse> {
    let record: StoredReport;
    try {
      const report = await this.generate(stored.session);
      record = { status: 'ok', report, error: null, updatedAt: this.now() };
    } catch (error) {
      console.error(`[meetmate] report failed for ${stored.session.id}:`, error);
      record = { status: 'error', report: null, error: userMessage(error), updatedAt: this.now() };
    }
    await this.store.saveReport(stored.session.id, record);
    return toResponse(stored, record);
  }

  save(session: IncomingSession): Promise<SavedSessionResponse> {
    if (session.endedAt === null) throw new HttpError(409, 'Phiên vẫn đang chạy. Kết thúc cuộc họp rồi mới lưu.');
    return this.serial(session.id, async () => {
      const hash = hashOf(session);
      const existing = await this.store.getSession(session.id);
      if (existing?.hash === hash) {
        const report = await this.store.getReport(session.id);
        if (report?.status === 'ok') return toResponse(existing, report);
      }
      const stored: StoredSession = { savedAt: this.now(), hash, session };
      await this.store.saveSession(stored);
      return this.build(stored);
    });
  }

  retry(id: string): Promise<SavedSessionResponse> {
    return this.serial(id, async () => {
      const stored = await this.store.getSession(id);
      if (!stored) throw new HttpError(404, 'Backend chưa có phiên này. Bấm "Lưu phiên" để gửi lại.');
      return this.build(stored);
    });
  }

  async get(id: string): Promise<SavedSessionResponse> {
    const stored = await this.store.getSession(id);
    if (!stored) throw new HttpError(404, 'Backend chưa có phiên này.');
    return toResponse(stored, await this.store.getReport(id));
  }

  list() {
    return this.store.list();
  }
}
