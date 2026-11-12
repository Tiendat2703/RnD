import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { MeetingReport } from '../../../lib/report';
import { createApp } from './app';
import type { IncomingSession } from './schema';
import { SessionService, type Generate } from './service';
import { SessionStore } from './store';

const WEB = 'http://localhost:3000';
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0)) await fn();
});

const fakeReport = (s: IncomingSession): MeetingReport => ({
  sessionId: s.id,
  title: s.title,
  generatedAt: 1,
  model: 'fake',
  summary: `Tóm tắt ${s.lines.length} dòng`,
  happenings: [],
  assignments: [],
  nextSteps: [],
  openQuestions: [],
  sources: [],
  droppedUnverified: 0,
  transcriptTruncated: false,
});

async function setup(generate: Generate = async (s) => fakeReport(s)) {
  const dir = mkdtempSync(join(tmpdir(), 'meetmate-api-'));
  const gen = vi.fn(generate);
  const app = createApp({ service: new SessionService(new SessionStore(dir), gen), allowedOrigins: [WEB] });
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (error?: Error) => (error ? reject(error) : resolve(s)));
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  cleanup.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  });
  const call = async (method: string, path: string, body?: unknown, origin = WEB) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json(), headers: res.headers };
  };
  return { call, gen, dir };
}

const session = (over: Partial<IncomingSession> = {}): IncomingSession => ({
  id: 'm-1',
  title: 'Họp',
  kind: 'khac',
  startedAt: 1000,
  endedAt: 2000,
  lines: [{ id: 'l1', text: 'Lan sẽ gửi báo giá', atMs: 0, source: 'mixed' }],
  topics: [],
  cards: [],
  syncedAt: null,
  ...over,
});

describe('MeetMate backend', () => {
  it('saves a session, generates a report and reads it back', async () => {
    const { call, dir } = await setup();
    const saved = await call('POST', '/sessions', session());
    expect(saved.status).toBe(200);
    expect(saved.body.reportStatus).toBe('ok');
    expect(saved.body.report.summary).toBe('Tóm tắt 1 dòng');
    expect(saved.headers.get('access-control-allow-origin')).toBe(WEB);

    expect((await call('GET', '/sessions/m-1')).body.report.summary).toBe('Tóm tắt 1 dòng');
    const list = await call('GET', '/sessions');
    expect(list.body).toEqual([expect.objectContaining({ id: 'm-1', title: 'Họp', reportStatus: 'ok' })]);
    // không để lại tệp tạm
    expect(readdirSync(join(dir, 'sessions'))).toEqual(['m-1.json']);
  });

  it('does not call the LLM again for the same content, but does after new lines', async () => {
    const { call, gen } = await setup();
    await call('POST', '/sessions', session());
    await call('POST', '/sessions', session({ syncedAt: 5 })); // syncedAt không phải nội dung
    expect(gen).toHaveBeenCalledTimes(1);
    const more = session({ lines: [...session().lines, { id: 'l2', text: 'Thêm', atMs: 1, source: 'mixed' }] });
    expect((await call('POST', '/sessions', more)).body.report.summary).toBe('Tóm tắt 2 dòng');
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it('runs concurrent saves of one session one after another', async () => {
    const { call, gen } = await setup(async (s) => {
      await new Promise((r) => setTimeout(r, 30));
      return fakeReport(s);
    });
    const [a, b] = await Promise.all([call('POST', '/sessions', session()), call('POST', '/sessions', session())]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the report fails, then retries', async () => {
    let fail = true;
    const { call } = await setup(async (s) => {
      if (fail) throw new Error('Blaze LLM lỗi HTTP 500');
      return fakeReport(s);
    });
    const saved = await call('POST', '/sessions', session());
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ reportStatus: 'error', report: null, error: 'Blaze LLM lỗi HTTP 500' });
    fail = false;
    const retried = await call('POST', '/sessions/m-1/report/retry');
    expect(retried.body.reportStatus).toBe('ok');
  });

  it('retries the report when the same content is saved again after a failure', async () => {
    let fail = true;
    const { call, gen } = await setup(async (s) => {
      if (fail) throw new Error('x');
      return fakeReport(s);
    });
    await call('POST', '/sessions', session());
    fail = false;
    expect((await call('POST', '/sessions', session())).body.reportStatus).toBe('ok');
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it('rejects a running session, a bad payload, a bad id and a foreign origin', async () => {
    const { call, gen } = await setup();
    expect((await call('POST', '/sessions', session({ endedAt: null }))).status).toBe(409);
    expect((await call('POST', '/sessions', { id: '../etc' })).status).toBe(400);
    expect((await call('POST', '/sessions', session({ id: '../x' }))).status).toBe(400);
    expect((await call('GET', '/sessions/..%2Fx')).status).toBe(400);
    expect((await call('GET', '/sessions/missing')).status).toBe(404);
    expect((await call('POST', '/sessions/missing/report/retry')).status).toBe(404);
    expect((await call('GET', '/sessions', undefined, 'https://evil.example')).status).toBe(403);
    expect(gen).not.toHaveBeenCalled();
  });
});
