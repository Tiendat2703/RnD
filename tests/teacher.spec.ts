import { test, expect } from '@playwright/test';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const createdRooms: string[] = [];
test.afterEach(async () => {
  for (const id of createdRooms.splice(0)) {
    if (!/^[\da-f-]{36}$/.test(id)) throw new Error('Unexpected test room id');
    const file = resolve(process.cwd(), `agents/sidekick/.meetmate-data/teacher-rooms/${id}.json`);
    const stored = JSON.parse(await readFile(file, 'utf8'));
    if (!stored.title.startsWith('Teacher E2E ')) throw new Error('Refusing to remove a non-test room');
    await rm(file); // Only the explicitly created synthetic room, never real study data.
  }
});

test('offers Assistant and Teacher while preserving the meeting setup', async ({ page }) => {
  await page.goto('/dashboard/callSessions');
  await page.getByLabel('Cuộc họp mới', { exact: true }).click();
  const picker = page.getByRole('radiogroup', { name: 'Chọn assistant', exact: true });
  await expect(picker.getByRole('radio', { name: /Assistant/ })).toHaveAttribute('aria-checked', 'true');
  await expect(picker.getByRole('radio', { name: /Teacher/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tên cuộc họp').fill('Họp sản phẩm');
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu MeetMate', exact: true })).toBeVisible();
  await expect(page.getByText('Ngôn ngữ phiên âm', { exact: true })).toBeVisible();
});

test('creates a Teacher group, reads a file, syncs a second browser and preserves the room on reload', async ({ page, browser, request }, testInfo) => {
  await page.goto('/dashboard/teacher');
  await page.getByRole('button', { name: 'Tạo phòng học', exact: true }).click();
  await page.getByRole('radio', { name: /Teacher/ }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByLabel('Tên phòng học').fill(`Teacher E2E ${Date.now()}`);
  await page.getByLabel('Môn học / chủ đề').fill('Xác suất thống kê');
  await page.getByLabel('Bạn muốn đạt được điều gì?').fill('Hiểu xác suất có điều kiện và tự làm bài tập.');
  await page.getByLabel('Tên của bạn', { exact: true }).fill('Lan');
  await page.getByRole('radio', { name: 'Học theo nhóm', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo phòng học', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/teacher\/[\da-f-]{36}$/);
  const roomId = page.url().split('/').at(-1)!; createdRooms.push(roomId);
  await expect(page.getByRole('heading', { name: 'Hôm nay mình cùng học gì?' })).toBeVisible();
  const welcome = page.locator('.teacher-welcome');
  expect(await welcome.getByRole('heading').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(30);
  expect(await page.locator('.teacher-classroom--welcome .teacher-messages').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  const welcomeBounds = await welcome.boundingBox();
  const composerBounds = await page.locator('.teacher-composer').boundingBox();
  expect(welcomeBounds!.y + welcomeBounds!.height).toBeLessThanOrEqual(composerBounds!.y);
  await page.locator('input[type=file]').setInputFiles({ name: 'xac-suat.txt', mimeType: 'text/plain', buffer: Buffer.from('Xác suất nằm từ 0 đến 1.\n\nP(A|B) = P(A∩B) / P(B), khi P(B) > 0.') });
  await expect(page.getByRole('button', { name: /xac-suat.txt/ })).toBeVisible();
  await expect(page.locator('.teacher-document-preview')).toContainText('P(A|B)');
  await page.getByRole('button', { name: 'Mời bạn học', exact: true }).click();
  await expect(page.locator('.teacher-invite input')).toHaveValue(page.url());
  const stranger = await request.get(`/api/teacher/rooms/${roomId}`);
  expect(stranger.status()).toBe(403);

  const secondContext = await browser.newContext();
  try {
    const second = await secondContext.newPage();
    await second.goto(page.url());
    await second.getByLabel('Tên của bạn', { exact: true }).fill('Minh');
    await second.getByRole('button', { name: 'Vào phòng học', exact: true }).click();
    await expect(second.getByRole('button', { name: /xac-suat.txt/ })).toBeVisible();
    await expect(page.locator('.teacher-members')).toContainText('Minh', { timeout: 10_000 });
    await second.locator('input[type=file]').setInputFiles({ name: 'bai-tap.txt', mimeType: 'text/plain', buffer: Buffer.from('Tung một đồng xu hai lần. Tính xác suất được hai mặt ngửa.') });
    await expect(page.getByRole('button', { name: /bai-tap.txt/ })).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.locator('.teacher-members')).toContainText('Minh');
    await expect(page.getByRole('button', { name: /xac-suat.txt/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('teacher-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => {
      const bounds = await page.locator('.sidebar').boundingBox();
      return bounds ? bounds.x + bounds.width <= 1 : true;
    }).toBe(true);
    await expect(page.getByRole('button', { name: /xac-suat.txt/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.content__inner').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('teacher-mobile.png'), fullPage: true });
  } finally { await secondContext.close(); }
});
