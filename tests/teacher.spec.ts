import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Assistant keeps its meeting and extension setup', async ({ page }) => {
  await page.goto('/dashboard/callSessions');
  await page.getByLabel('Cuộc họp mới', { exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Chọn assistant' }).getByRole('radio', { name: /Assistant/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tên cuộc họp').fill('Họp sản phẩm');
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu MeetMate', exact: true })).toBeVisible();
});

test('a real 2 MB PDF uploads and Teacher sends the session with documents to the extension', async ({ page, request }) => {
  const pdf = readFileSync(resolve('agents/sidekick/extension/fixtures/hop-dong.pdf'));
  const xref = pdf.toString('latin1').match(/startxref\s+(\d+)\s+%%EOF/)![1];
  const tail = Buffer.from(`\nstartxref\n${xref}\n%%EOF\n`);
  const file = Buffer.concat([pdf, Buffer.from('\n%'), Buffer.alloc(2 * 1024 * 1024 - pdf.length - tail.length - 2, 32), tail]);
  expect(file.length).toBe(2 * 1024 * 1024);
  const name = `Teacher E2E PDF ${Date.now()}.pdf`;
  const uploaded = await request.post('/api/documents/pdf', { headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(name) }, data: file });
  expect(uploaded.status(), await uploaded.text()).toBe(200);
  const document = await uploaded.json();
  try {
    expect(document.size).toBe(file.length); expect(document.chunkCount).toBeGreaterThan(0);
    await page.addInitScript(() => {
      window.addEventListener('message', event => {
        if (event.data?.source !== 'meetmate-web') return;
        if (event.data.payload?.type === 'ping') window.postMessage({ source: 'meetmate-ext', payload: { type: 'pong', info: {
          version: '0.4.0', supportsTeacher: true, keysSet: true, meetTabs: 1, running: false, status: 'Sẵn sàng', sessionId: null,
        } } }, window.location.origin);
        if (event.data.payload?.type === 'session.prepare') (window as unknown as { prepared: unknown }).prepared = event.data.payload.session;
      });
    });
    await page.goto('/dashboard/callSessions');
    await expect(page.locator('.sidebar').getByRole('link', { name: 'Phòng học Teacher' })).toHaveCount(0);
    await page.getByLabel('Cuộc họp mới', { exact: true }).click();
    await page.getByRole('radio', { name: /Teacher/ }).click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Trình độ', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('Bạn muốn đạt được điều gì?', { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('radio', { name: /Học cá nhân|Học theo nhóm/ })).toHaveCount(0);
    await dialog.getByLabel('Môn học / chủ đề').fill('OOP');
    await dialog.getByLabel(name).check();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
    await page.getByRole('button', { name: 'Bắt đầu MeetMate', exact: true }).click();
    await page.getByRole('button', { name: 'Gửi phiên cho MeetMate', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { prepared?: { assistantType: string } }).prepared?.assistantType)).toBe('teacher');
    const draft = await page.evaluate(() => (window as unknown as { prepared: { title: string; documents: { id: string; chunks: unknown[] }[] } }).prepared);
    expect(draft.title).toBe('OOP'); expect(draft.documents[0].id).toBe(document.id); expect(draft.documents[0].chunks.length).toBeGreaterThan(0);
  } finally {
    const current = await (await request.get(`/api/documents/${document.id}`)).json();
    if (current.name === name) await request.delete(`/api/documents/${document.id}`);
  }
});

test('old classroom links return to the meeting sessions', async ({ page }) => {
  await page.goto('/dashboard/teacher'); await expect(page).toHaveURL('/dashboard/callSessions');
});
