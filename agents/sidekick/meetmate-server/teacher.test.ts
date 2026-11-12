import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Chat } from './llm';
import { TeacherService } from './teacher';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    if (dirname(resolve(dir)) !== resolve(tmpdir()) || !basename(dir).startsWith('meetmate-teacher-test-')) throw new Error('Unexpected cleanup target');
    await rm(dir, { recursive: true, force: true });
  }
});
const roomInput = { title: 'Ôn xác suất', subject: 'Xác suất', goal: 'Hiểu xác suất có điều kiện', level: 'Đại học', mode: 'group' as const, name: 'Lan' };
const response = JSON.stringify({ text: 'Hãy thử giải từng bước.', citations: [], webUrls: [] });
async function setup(chat: Chat | null = async () => response, search = vi.fn(async (_q: string, _s: AbortSignal) => [{ title: 'Đại học', url: 'https://university.example/lesson', text: 'Giáo trình xác suất' }])) {
  const dir = await mkdtemp(join(tmpdir(), 'meetmate-teacher-test-')); dirs.push(dir);
  const service = new TeacherService(dir, chat, search);
  const access = await service.create(roomInput);
  return { service, access, dir, search };
}

describe('Teacher rooms', () => {
  it('persists a group room, shared files and members without exposing membership tokens', async () => {
    const { service, access, dir } = await setup();
    const second = await service.join(access.room.id, 'Minh');
    await service.upload(access.room.id, access.memberToken, 'Bài học.txt', Buffer.from('P(A|B) = P(A∩B) / P(B).'));
    const reloaded = new TeacherService(dir, null, null);
    const room = await reloaded.get(access.room.id, second.memberToken);
    expect(room.members.map(member => member.name)).toEqual(['Lan', 'Minh']);
    expect(room.documents[0].sections[0].text).toContain('P(A|B)');
    expect(JSON.stringify(room)).not.toContain(access.memberToken);
    expect(JSON.stringify(await reloaded.list())).not.toContain(second.memberToken);
    expect(JSON.parse(await readFile(join(dir, 'teacher-rooms', `${room.id}.json`), 'utf8')).members).toHaveLength(2);
  });

  it('requires membership and prevents joining a solo room', async () => {
    const { service, access } = await setup();
    await expect(service.get(access.room.id, 'wrong-token')).rejects.toMatchObject({ status: 403 });
    await expect(service.upload(access.room.id, 'wrong-token', 'test.txt', Buffer.from('private'))).rejects.toMatchObject({ status: 403 });
    const solo = await service.create({ ...roomInput, mode: 'solo' });
    await expect(service.join(solo.room.id, 'Other')).rejects.toMatchObject({ status: 403 });
    await expect(service.info('../outside')).rejects.toMatchObject({ status: 400 });
  });

  it('keeps rooms and files available without AI, but never returns a fabricated answer', async () => {
    const { service, access } = await setup(null);
    expect(service.config().ai).toBe(false);
    await service.upload(access.room.id, access.memberToken, 'lesson.txt', Buffer.from('Bài học thật.'));
    await expect(service.message(access.room.id, access.memberToken, { requestId: randomUUID(), text: 'Giảng bài này', action: 'teach' })).rejects.toMatchObject({ status: 503 });
    expect((await service.get(access.room.id, access.memberToken)).messages).toEqual([]);
  });

  it('grounds each teaching action in the selected file and validates source quotations', async () => {
    const chat = vi.fn<Chat>(async messages => {
      const payload = JSON.parse(messages[1].content);
      const passage = payload.documents[0];
      return JSON.stringify({ text: `Đang ${payload.action}`, citations: [
        { documentId: passage.documentId, locator: passage.locator, quote: 'Xác suất nằm từ 0 đến 1.' },
        { documentId: passage.documentId, locator: passage.locator, quote: 'Câu trích không tồn tại' },
      ], webUrls: ['https://invented.example'] });
    });
    const { service, access, search } = await setup(chat);
    const room = await service.upload(access.room.id, access.memberToken, 'lesson.txt', Buffer.from('Xác suất nằm từ 0 đến 1.'));
    for (const action of ['ask', 'teach', 'exercises', 'solve'] as const) {
      const next = await service.message(room.id, access.memberToken, { requestId: randomUUID(), action, text: 'Giúp mình học', documentId: room.documents[0].id });
      const reply = next.messages.at(-1)!;
      expect(reply.status).toBe('complete');
      expect(reply.citations).toHaveLength(1);
      expect(reply.citations![0].documentName).toBe('lesson.txt');
      expect(reply.sources).toEqual([]);
    }
    expect(search).not.toHaveBeenCalled();
    expect(chat).toHaveBeenCalledTimes(4);
  });

  it('searches only on an explicit research action and rejects invented URLs', async () => {
    const { service, access, search } = await setup(async () => JSON.stringify({ text: 'Giáo trình cho nhóm.', citations: [], webUrls: ['https://university.example/lesson', 'https://fake.example'] }));
    const room = await service.message(access.room.id, access.memberToken, { requestId: randomUUID(), action: 'research', text: 'Giáo trình xác suất' });
    expect(search).toHaveBeenCalledWith('Giáo trình xác suất', expect.any(AbortSignal));
    expect(room.messages.at(-1)?.sources).toEqual([{ title: 'Đại học', url: 'https://university.example/lesson' }]);
  });

  it('uses spoken context and keeps the speaker identity for a microphone question', async () => {
    const chat = vi.fn<Chat>(async () => response);
    const { service, access } = await setup(chat);
    const room = await service.message(access.room.id, access.memberToken, {
      requestId: randomUUID(), text: 'Giảng phần này', action: 'teach', source: 'voice', context: ['Đang học xác suất có điều kiện.'],
    });
    expect(room.messages[0]).toMatchObject({ source: 'voice', name: 'Lan', action: 'teach' });
    expect(JSON.parse(chat.mock.calls[0][0][1].content).spokenContext).toEqual(['Đang học xác suất có điều kiện.']);
  });

  it('serializes concurrent group questions and makes repeated requests idempotent', async () => {
    const chat = vi.fn<Chat>(async () => response);
    const { service, access } = await setup(chat);
    const second = await service.join(access.room.id, 'Minh');
    const requestId = randomUUID();
    await Promise.all([
      service.message(access.room.id, access.memberToken, { requestId, action: 'ask', text: 'Câu hỏi Lan' }),
      service.message(access.room.id, second.memberToken, { requestId: randomUUID(), action: 'ask', text: 'Câu hỏi Minh' }),
      service.message(access.room.id, access.memberToken, { requestId, action: 'ask', text: 'Câu hỏi Lan' }),
    ]);
    const room = await service.get(access.room.id, access.memberToken);
    expect(room.messages.map(message => message.name)).toEqual(['Lan', 'Teacher', 'Minh', 'Teacher']);
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed question and retries it without duplicating conversation', async () => {
    let fail = true;
    const { service, access } = await setup(async () => { if (fail) throw new Error('HTTP 503'); return response; });
    const input = { requestId: randomUUID(), action: 'solve' as const, text: 'Hãy giải bài tập này' };
    const failed = await service.message(access.room.id, access.memberToken, input);
    expect(failed.messages.at(-1)?.status).toBe('error');
    expect(failed.busy).toBe(false);
    fail = false;
    const retried = await service.message(access.room.id, access.memberToken, input);
    expect(retried.messages).toHaveLength(2);
    expect(retried.messages.at(-1)?.status).toBe('complete');
  });
});
