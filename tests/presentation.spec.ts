import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { PresentationSnapshot } from '../lib/presentation';
const snapshot: PresentationSnapshot = {
  version: 1,
  revision: 'test-revision',
  sequence: 0,
  confirmed: false,
  paused: false,
  autoRemind: true,
  hint: '',
  error: null,
  documents: [
    {
      id: 'd1234',
      name: 'Presentation E2E.txt',
      pageCount: 1,
      chunks: [
        {
          id: 'd1234#1',
          docId: 'd1234',
          docName: 'Presentation E2E.txt',
          page: 1,
          pageEnd: 1,
          text: 'Tốc độ phản hồi trung bình 1,8 giây.',
        },
      ],
    },
  ],
  items: [
    {
      id: 'speed',
      text: 'Tốc độ phản hồi trung bình 1,8 giây.',
      required: true,
      citation: {
        id: 'd1234#1',
        docId: 'd1234',
        docName: 'Presentation E2E.txt',
        page: 1,
        pageEnd: 1,
        text: 'Tốc độ phản hồi trung bình 1,8 giây.',
      },
      coverage: 'pending',
      correctness: 'unchecked',
      manual: false,
    },
  ],
};

test('presentation setup confirms, starts privately, accepts manual updates and downloads real PDF', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/documents', (r) =>
    r.fulfill({
      json: [
        {
          id: 'd1234',
          name: 'Presentation E2E.txt',
          format: 'TEXT',
          size: 100,
          pageCount: 1,
          chars: 45,
          chunkCount: 1,
          addedAt: 1,
          excerpt: 'Tốc độ phản hồi',
        },
      ],
    }),
  );
  await page.route('**/api/presentation/checklist', (r) => r.fulfill({ json: snapshot }));
  await page.addInitScript(() => {
    let sessions: any[] = JSON.parse(localStorage.getItem('presentation-e2e-sessions') ?? '[]');
    const send = (payload: any) =>
      window.postMessage({ source: 'meetmate-ext', payload }, location.origin);
    const save = () => localStorage.setItem('presentation-e2e-sessions', JSON.stringify(sessions));
    window.addEventListener('message', (e) => {
      if (e.source !== window || e.data?.source !== 'meetmate-web') return;
      const m = e.data.payload;
      if (m.type === 'ping')
        send({
          type: 'pong',
          info: {
            version: '0.4.0',
            presentation: true,
            keysSet: true,
            meetTabs: 1,
            running: false,
            status: '',
            sessionId: null,
          },
        });
      if (m.type === 'sessions.list') send({ type: 'sessions', sessions });
      if (m.type === 'session.prepare') {
        if (m.session.autoPost !== false) throw Error('Presentation must not post to chat');
        sessions = [
          {
            ...m.session,
            startedAt: Date.now(),
            endedAt: null,
            lines: [],
            topics: [],
            cards: [],
            syncedAt: null,
          },
        ];
        save();
        setTimeout(() => {
          send({ type: 'sessions', sessions });
          send({
            type: 'status',
            running: true,
            active: true,
            status: 'Đang chạy',
            sessionId: m.session.id,
          });
        }, 200);
      }
      if (m.type === 'presentation.action') {
        const p = sessions[0].presentation;
        p.sequence++;
        if (m.action.kind === 'item')
          p.items[0] = { ...p.items[0], manual: true, coverage: m.action.coverage };
        if (m.action.kind === 'missing') p.hint = 'Bạn có thể bổ sung: tốc độ phản hồi';
        if (m.action.kind === 'pause') p.paused = m.action.paused;
        save();
        send({ type: 'presentation', id: sessions[0].id, snapshot: p });
        send({ type: 'sessions', sessions });
      }
      if (m.type === 'session.stop') {
        sessions[0].endedAt = Date.now();
        save();
        send({ type: 'ended', reason: 'stopped' });
        send({ type: 'sessions', sessions });
      }
    });
  });
  await page.goto('/dashboard/callSessions');
  await page.getByLabel('Cuộc họp mới', { exact: true }).click();
  await page.getByRole('radio', { name: /Thuyết trình/ }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tên cuộc họp').fill('Presentation E2E');
  await page.getByLabel(/Presentation E2E.txt/).check();
  await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu MeetMate', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tạo checklist từ tài liệu', exact: true }).click();
  await expect(page.getByLabel('Ý 1', { exact: true })).toHaveValue(
    'Tốc độ phản hồi trung bình 1,8 giây.',
  );
  await page.getByLabel('Tôi đã kiểm tra và xác nhận checklist').check();
  await page.getByRole('button', { name: 'Bắt đầu MeetMate', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi phiên cho MeetMate', exact: true }).click();
  const view = page.getByRole('region', { name: 'Theo dõi thuyết trình' });
  await expect(view).toBeVisible();
  await view.getByLabel('Trạng thái ý 1').selectOption('covered');
  await expect(view).toContainText('1/1');
  await view.getByRole('button', { name: 'Còn thiếu gì?', exact: true }).click();
  await expect(view).toContainText('Bạn có thể bổ sung');
  await view.getByRole('button', { name: 'Tạm dừng theo dõi' }).click();
  await expect(view.getByRole('button', { name: 'Tiếp tục theo dõi' })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await view.getByRole('button', { name: 'Tải báo cáo thuyết trình PDF' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  await download.saveAs(testInfo.outputPath('presentation.pdf'));
  expect((await readFile(testInfo.outputPath('presentation.pdf'))).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
  await page.screenshot({ path: testInfo.outputPath('presentation-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await view.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('presentation-mobile.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Mở lại phiên', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Theo dõi thuyết trình' })).toContainText('1/1');
  await expect(page.getByRole('button', { name: 'Tiếp tục theo dõi' })).toBeVisible();
  expect(errors).toEqual([]);
});
