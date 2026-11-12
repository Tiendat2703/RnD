import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TeacherAccess, TeacherQuestionRequest, TeacherVoiceFinal } from '../lib/teacher';

test.use({ permissions: ['microphone'], launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
const created: string[] = [];
test.afterEach(async () => {
  for (const id of created.splice(0)) {
    if (!/^[\da-f-]{36}$/.test(id)) throw new Error('Unexpected room id');
    const file = resolve(process.cwd(), `agents/sidekick/.meetmate-data/teacher-rooms/${id}.json`);
    const data = JSON.parse(await readFile(file, 'utf8'));
    if (!data.title.startsWith('Teacher E2E voice ')) throw new Error('Unexpected cleanup target');
    await rm(file);
  }
});

async function prepare(page: Page, request: APIRequestContext) {
  const response = await request.post('/api/teacher/rooms', { data: {
    title: `Teacher E2E voice ${Date.now()}`, subject: 'Xác suất', goal: 'Hiểu bài qua câu hỏi bằng giọng nói',
    name: 'Lan', level: 'Cơ bản', mode: 'solo',
  } });
  expect(response.ok()).toBe(true);
  const access = await response.json() as TeacherAccess;
  created.push(access.room.id);
  await page.addInitScript(({ id, token }) => {
    localStorage.setItem(`meetmate-teacher-member:${id}`, token);
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    (window as unknown as { teacherTracks: MediaStreamTrack[] }).teacherTracks = [];
    media.getUserMedia = async constraints => {
      const stream = await original(constraints);
      (window as unknown as { teacherTracks: MediaStreamTrack[] }).teacherTracks.push(...stream.getTracks());
      return stream;
    };
  }, { id: access.room.id, token: access.memberToken });
  // Only provider responses are simulated. Capture, worklet and browser lifecycle are real.
  await page.route('**/api/teacher/config', route => route.fulfill({ json: { ai: true, web: true, voice: true } }));
  return access;
}

test('microphone sends PCM, gates Teacher actions by keyword, deduplicates finals and stops on leave', async ({ page, request }) => {
  const access = await prepare(page, request);
  const path = `/api/teacher/rooms/${access.room.id}`;
  const voiceId = randomUUID();
  let packets = 0; let stops = 0;
  const finals: TeacherVoiceFinal[] = [];
  const questions: TeacherQuestionRequest[] = [];
  await page.route(url => url.pathname === path, route => route.fulfill({ json: access.room }));
  await page.route(url => url.pathname === `${path}/voice`, route => route.fulfill({ json: { id: voiceId, status: 'listening', partial: '', finals: [], error: null } }));
  await page.route(url => url.pathname === `${path}/voice/${voiceId}/audio`, async route => {
    expect(route.request().postDataBuffer()?.length).toBe(16_000);
    expect(Number(route.request().headers()['x-voice-sequence'])).toBeGreaterThanOrEqual(0);
    packets++;
    await route.fulfill({ json: { id: voiceId, status: 'listening', partial: '', finals, error: null } });
  });
  await page.route(url => url.pathname === `${path}/voice/${voiceId}/stop`, route => { stops++; return route.fulfill({ json: { ok: true } }); });
  await page.route(url => url.pathname === `${path}/messages`, async route => {
    const question = route.request().postDataJSON() as TeacherQuestionRequest;
    questions.push(question);
    const now = Date.now();
    access.room.updatedAt = now;
    access.room.messages.push({ ...question, id: randomUUID(), role: 'student', memberId: access.room.members[0].id, name: 'Lan', createdAt: now, status: 'complete' },
      { id: randomUUID(), requestId: question.requestId, role: 'teacher', name: 'Teacher', text: 'Mình cùng đi qua từng ý chính của slide nhé.', action: question.action, createdAt: now, status: 'complete' });
    await route.fulfill({ json: access.room });
  });
  await page.goto(`/dashboard/teacher/${access.room.id}`);
  await page.getByRole('button', { name: 'Bật micro', exact: true }).click();
  await expect(page.getByText('Teacher đang nghe bạn', { exact: true })).toBeVisible();
  await expect.poll(() => packets).toBeGreaterThanOrEqual(1);
  finals.push({ sequence: 1, text: 'Mình đang xem slide về phân phối chuẩn.' });
  await expect(page.getByText('Mình đang xem slide về phân phối chuẩn.', { exact: true })).toBeVisible();
  expect(questions).toHaveLength(0);
  finals.push({ sequence: 2, text: 'Trợ lý, giảng slide này cho mình.' });
  await expect(page.getByText('Mình cùng đi qua từng ý chính của slide nhé.', { exact: true })).toBeVisible();
  expect(questions[0]).toMatchObject({ action: 'teach', text: 'giảng slide này cho mình.', source: 'voice', context: ['Mình đang xem slide về phân phối chuẩn.'] });
  const afterReply = packets;
  await expect.poll(() => packets).toBeGreaterThan(afterReply + 1);
  expect(questions).toHaveLength(1); // The same sequenced finals were returned on every packet.
  await page.getByRole('button', { name: 'Dừng nghe', exact: true }).click();
  await expect.poll(() => stops).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { teacherTracks: MediaStreamTrack[] }).teacherTracks.every(track => track.readyState === 'ended'))).toBe(true);

  await page.getByRole('button', { name: 'Bật micro', exact: true }).click();
  await expect(page.getByText('Teacher đang nghe bạn', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Phòng học', exact: true }).click();
  await expect(page).toHaveURL('/dashboard/teacher');
  await expect.poll(() => stops).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { teacherTracks: MediaStreamTrack[] }).teacherTracks.every(track => track.readyState === 'ended'))).toBe(true);
});

test('denied microphone permission leaves chat usable and never opens a provider session', async ({ page, request }) => {
  const access = await prepare(page, request);
  let starts = 0;
  await page.route(`**/api/teacher/rooms/${access.room.id}/voice`, route => { starts++; return route.fulfill({ status: 500, json: {} }); });
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.goto(`/dashboard/teacher/${access.room.id}`);
  await page.getByRole('button', { name: 'Bật micro', exact: true }).click();
  await expect(page.locator('.teacher-voice').getByRole('alert')).toContainText('Chưa có quyền micro');
  expect(starts).toBe(0);
  await page.getByRole('textbox', { name: 'Câu hỏi cho Teacher' }).fill('Mình vẫn có thể hỏi bằng chữ.');
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi', exact: true })).toBeEnabled();
});
