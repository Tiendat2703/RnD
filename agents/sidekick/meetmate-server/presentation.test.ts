import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sessionSchema } from './schema';
import { SessionService } from './service';
import { SessionStore } from './store';
import { parsePresentation } from '../../../lib/presentation';
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
it('persists presentation with deterministic report and no provider call; validates transcript evidence', async () => {
  const chunk = {
    id: 'd1234#1',
    docId: 'd1234',
    docName: 'demo.txt',
    page: 1,
    pageEnd: 1,
    text: 'Tốc độ là 1,8 giây.',
  };
  const p = parsePresentation({
    version: 1,
    revision: 'r1',
    sequence: 1,
    confirmed: true,
    paused: false,
    autoRemind: true,
    hint: '',
    error: null,
    documents: [{ id: 'd1234', name: 'demo.txt', pageCount: 1, chunks: [chunk] }],
    items: [
      {
        id: 'speed',
        text: chunk.text,
        required: true,
        citation: chunk,
        coverage: 'covered',
        correctness: 'supported',
        manual: false,
        evidence: { lineId: 'l1', text: 'Tốc độ là 1,8 giây.', atMs: 100, source: 'mic' },
      },
    ],
  });
  const raw = {
    id: 'synthetic-presentation',
    title: 'Presentation unit',
    kind: 'khac',
    mode: 'presentation',
    startedAt: 1,
    endedAt: 2,
    topics: [],
    lines: [{ id: 'l1', text: 'Tốc độ là 1,8 giây.', atMs: 100, source: 'mic' }],
    presentation: p,
  };
  const incoming = sessionSchema.parse(raw);
  expect(sessionSchema.safeParse({ ...raw, lines: [] }).success).toBe(false);
  const dir = await mkdtemp(join(tmpdir(), 'presentation-test-'));
  dirs.push(dir);
  const service = new SessionService(new SessionStore(dir), async () => {
    throw Error('Must not call LLM for checklist statistics');
  });
  expect(await service.save(incoming)).toMatchObject({
    reportStatus: 'ok',
    report: { summary: expect.stringContaining('1/1') },
  });
  const stored = await new SessionStore(dir).getSession(raw.id);
  expect(stored?.session.presentation).toEqual(p);
  expect(await service.get(raw.id)).toMatchObject({ reportStatus: 'ok' });
});
