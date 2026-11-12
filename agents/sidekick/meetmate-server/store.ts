// Lưu phiên và báo cáo thành tệp JSON: <dir>/sessions/<id>.json, <dir>/reports/<id>.json.
// Ghi ra tệp tạm rồi đổi tên (rename là nguyên tử trên cùng ổ đĩa), nên tắt đột ngột
// giữa lúc ghi không để lại tệp nửa vời.
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import type { MeetingReport, ReportStatus } from '../../../lib/report';
import { SESSION_ID, type IncomingSession } from './schema';

export interface StoredSession {
  savedAt: number;
  /** băm nội dung phiên: gửi lại y hệt thì không tạo lại báo cáo */
  hash: string;
  session: IncomingSession;
}

export interface StoredReport {
  status: ReportStatus;
  report: MeetingReport | null;
  error: string | null;
  updatedAt: number;
}

export interface SessionMeta {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number | null;
  savedAt: number;
  reportStatus: ReportStatus | null;
}

export class SessionStore {
  constructor(private readonly dir: string) {}

  private path(kind: 'sessions' | 'reports', id: string): string {
    if (!SESSION_ID.test(id)) throw new Error(`invalid session id: ${id}`);
    return join(this.dir, kind, `${id}.json`);
  }

  private async write(file: string, data: unknown): Promise<void> {
    await mkdir(join(file, '..'), { recursive: true });
    const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await rename(tmp, file);
    } catch (error) {
      await rm(tmp, { force: true });
      throw error;
    }
  }

  private async read<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  saveSession(record: StoredSession): Promise<void> {
    return this.write(this.path('sessions', record.session.id), record);
  }

  getSession(id: string): Promise<StoredSession | null> {
    return this.read<StoredSession>(this.path('sessions', id));
  }

  saveReport(id: string, record: StoredReport): Promise<void> {
    return this.write(this.path('reports', id), record);
  }

  getReport(id: string): Promise<StoredReport | null> {
    return this.read<StoredReport>(this.path('reports', id));
  }

  async list(): Promise<SessionMeta[]> {
    let names: string[];
    try {
      names = await readdir(join(this.dir, 'sessions'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const ids = names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)).filter((id) => SESSION_ID.test(id));
    const metas = await Promise.all(
      ids.map(async (id): Promise<SessionMeta | null> => {
        const s = await this.getSession(id);
        if (!s) return null;
        const r = await this.getReport(id);
        const { title, startedAt, endedAt } = s.session;
        return { id, title, startedAt, endedAt, savedAt: s.savedAt, reportStatus: r?.status ?? null };
      }),
    );
    return metas.filter((m): m is SessionMeta => m !== null).sort((a, b) => b.startedAt - a.startedAt);
  }
}
