import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingStore } from '../store';
import { MeetingWorker } from '../worker';
import { AmbiguousProvider } from '../providers/ambiguous';
import { SidekickSession, type SessionOutput } from './session';

const directories: string[] = [];
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});
function setup() {
  const path = mkdtempSync(join(tmpdir(), 'sidekick-livekit-test-'));
  directories.push(path);
  const store = new MeetingStore(path);
  const outputs: SessionOutput[] = [];
  const worker = { run: vi.fn(async (id: string) => {
    const meeting = store.get(id);
    meeting.summary = 'Processed meeting';
    meeting.processedRevision = meeting.revision;
    if (meeting.phase === 'closing') meeting.phase = 'ended';
    store.save(meeting);
  }) };
  const publish = vi.fn(async (output: SessionOutput) => { outputs.push(output); });
  const session = new SidekickSession(store, worker, publish);
  return { store, outputs, worker, publish, session };
}
describe('Sidekick LiveKit session', () => {
  it('deduplicates retransmissions by participant and stream, keeps sessions isolated', async () => {
    const a = setup();
    await a.session.submit('alice', 'stream-1', 'Prepare the pilot proposal.');
    await a.session.submit('alice', 'stream-1', 'Prepare the pilot proposal.');
    expect(a.worker.run).toHaveBeenCalledTimes(1);
    await a.session.submit('bob', 'stream-1', 'Add a budget comparison.');
    expect(a.session.snapshot().transcript).toHaveLength(2);
    const b = setup();
    expect(b.session.snapshot().transcript).toHaveLength(0);
    expect(b.session.meetingId).not.toBe(a.session.meetingId);
  });

  it('finalizes once after in-flight work, rejecting later input', async () => {
    const { session, worker, store } = setup();
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    worker.run.mockImplementationOnce(async () => { await blocked; });
    const first = session.submit('alice', 'first', 'Prepare the pilot proposal.');
    await Promise.resolve();
    const close = session.close();
    expect(session.close()).toBe(close);
    expect(() => session.submit('alice', 'late', 'Late message')).toThrow(/closing/);
    release();
    await Promise.all([first, close]);
    expect(worker.run).toHaveBeenCalledTimes(2);
    expect(store.get(session.meetingId).phase).toBe('ended');
  });

  it('does not call providers when an unused room closes', async () => {
    const { session, worker } = setup();
    await session.close();
    expect(worker.run).not.toHaveBeenCalled();
    expect(session.snapshot().phase).toBe('ended');
  });

  it('redacts internal provider/session data from room snapshots', async () => {
    const { session, store, outputs } = setup();
    const meeting = store.get(session.meetingId);
    meeting.agentSessionId = 'private-session';
    meeting.documentSnapshots = { private: {} as never };
    store.save(meeting);
    await session.sendState();
    expect(JSON.stringify(outputs)).not.toContain('private-session');
    expect(outputs[0].meeting).not.toHaveProperty('documentSnapshots');
  });

  it('rejects oversized and empty input without saving or running work', () => {
    const { session, worker } = setup();
    expect(() => session.submit('alice', 'empty', '  ')).toThrow();
    expect(() => session.submit('alice', 'large', 'x'.repeat(16001))).toThrow();
    expect(session.snapshot().transcript).toHaveLength(0);
    expect(worker.run).not.toHaveBeenCalled();
  });

  it('continues processing after a transport failure', async () => {
    const { session, publish, worker } = setup();
    publish.mockRejectedValueOnce(new Error('Room connection interrupted'));
    await expect(session.submit('alice', 'one', 'Prepare a proposal.')).rejects.toThrow();
    await session.submit('alice', 'two', 'Include these new constraints.');
    expect(worker.run).toHaveBeenCalledTimes(2);
  });

  it('runs the existing MeetingWorker and continues the managed provider session', async () => {
    const { store } = setup();
    const analyze = vi.fn(async (_input: { sessionId?: string }) => ({
      sessionId: 'managed-session',
      text: JSON.stringify({
        title: 'Pilot', summary: 'Prepare a pilot.', decisions: [], pending: [],
        ambiguities: [], followUps: [], researchQueries: [], spokenResponse: '',
        documents: [],
      }),
    }));
    const save = vi.fn(async (input: { title: string; content: string }) => ({
      id: 'record-123', title: input.title, content: input.content,
    }));
    const search = vi.fn(async () => []);
    const worker = new MeetingWorker(store, { agents: { analyze }, exa: { search }, workspace: { save } });
    const session = new SidekickSession(store, worker, async () => {});
    await session.submit('alice', 'one', 'Please prepare a pilot proposal.');
    await session.submit('alice', 'two', 'The pilot should last two weeks.');
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(analyze.mock.calls[1]?.[0]).toMatchObject({ sessionId: 'managed-session' });
    expect(session.snapshot().summary).toBe('Prepare a pilot.');
    expect(save).toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('returns the meeting record save failure reason to the room', async () => {
    const { store, outputs } = setup();
    const analyze = vi.fn(async () => ({
      sessionId: 'managed-session',
      text: JSON.stringify({
        title: 'Pilot', summary: 'Prepare a pilot.', decisions: [], pending: [],
        ambiguities: [], followUps: [], researchQueries: [], spokenResponse: '',
        documents: [],
      }),
    }));
    const worker = new MeetingWorker(store, {
      agents: { analyze },
      exa: { search: vi.fn(async () => []) },
      workspace: new AmbiguousProvider(''),
    });
    const session = new SidekickSession(store, worker, async output => { outputs.push(output); });

    await session.submit('alice', 'one', 'Please prepare a pilot proposal.');

    expect(session.snapshot().recordSaveStatus).toBe('failed');
    expect(outputs.at(-1)?.text).toContain(
      'Ambiguous AI is not configured. Add AMBIGUOUS_API_KEY to .env.local.',
    );
  });
});
