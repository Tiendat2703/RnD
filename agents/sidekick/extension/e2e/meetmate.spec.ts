// The built extension in a real Chromium, end to end with the real Blaze APIs:
// side panel → PDF upload → offscreen capture (fake microphone playing the scripted meeting)
// → AudioWorklet → Blaze STT → document checks with Blaze LLM → content script typing into
// a stand-in Meet chat. Tab capture needs a real toolbar click, so this drives the
// microphone-only path; everything after the audio source is the production code.
//
// Run: BLAZE_API_KEY=... npm run extension:e2e
// Needs extension/.cache/meeting.wav: BLAZE_API_KEY=... npx tsx scripts/simulate-meeting.ts --wav extension/.cache/meeting.wav --wav-only
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const dist = join(root, 'dist-extension');
const wav = join(root, 'extension/.cache/meeting.wav');
const key = process.env.BLAZE_API_KEY;

test.skip(!key, 'BLAZE_API_KEY is not set');
test.skip(!existsSync(wav), 'meeting.wav missing; see the header of this file');

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'meetmate-')), {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${wav}%noloop`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  await context.route('https://meet.google.com/**', route => route.fulfill({ path: join(import.meta.dirname, 'fake-meet.html') }));
});

test.afterAll(async () => {
  await context?.close();
});

test('listens to a meeting, flags contradictions and answers questions in the Meet chat', async () => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;

  const meet = await context.newPage();
  await meet.goto('https://meet.google.com/abc-defg-hij');

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.locator('#blaze-key').fill(key!);
  await panel.locator('#blaze-key').dispatchEvent('change');
  await panel.locator('#web-research').uncheck();

  await panel.locator('#file').setInputFiles([join(root, 'extension/fixtures/hop-dong.pdf'), join(root, 'extension/fixtures/ke-hoach.pdf')]);
  await expect(panel.locator('#docs li:not(.busy)')).toHaveCount(2, { timeout: 30_000 });
  await expect(panel.locator('#docs')).toContainText('hop-dong.pdf');
  await expect(panel.locator('#docs-mode')).toContainText('Toàn bộ tài liệu');

  const reply = await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
    return chrome.runtime.sendMessage({ type: 'mm.start', tabId: tab.id, streamId: null });
  });
  expect(reply).toEqual({ ok: true });
  await expect(panel.locator('#pill')).toHaveText('Đang nghe', { timeout: 15_000 });

  // The scripted meeting is 56 s of audio; MeetMate answers within seconds of each line.
  const chat = meet.locator('#messages li');
  await expect.poll(async () => (await chat.allTextContents()).filter(t => t.includes('⚠️')).length, { timeout: 120_000, intervals: [2_000] })
    .toBeGreaterThanOrEqual(4);
  await expect.poll(async () => (await chat.allTextContents()).join('\n'), { timeout: 60_000, intervals: [2_000] })
    .toMatch(/40%[\s\S]*VIAC|VIAC[\s\S]*40%/);
  // The last two lines ask MeetMate by name: one answered from the plan, one outside the documents.
  await expect.poll(async () => (await chat.allTextContents()).join('\n'), { timeout: 60_000, intervals: [2_000] })
    .toMatch(/ZaloPay[\s\S]*Tài liệu không đề cập/);

  const messages = await chat.allTextContents();
  console.log(`Meet chat (${messages.length}):\n${messages.map(m => `  ${m.replace(/\n/g, ' ⏎ ')}`).join('\n')}`);
  expect(messages.every(m => m.startsWith('MeetMate: '))).toBe(true);
  expect(messages.join('\n')).toContain('12.000.000');
  expect(messages.join('\n')).toContain('React Native');
  // Every chat line about a contradiction cites a page of a real document.
  for (const m of messages.filter(t => t.includes('⚠️'))) expect(m).toMatch(/📄 (hop-dong|ke-hoach)\.pdf, tr\. \d/);

  await expect(panel.locator('.card.contradiction')).toHaveCount(messages.filter(t => t.includes('⚠️')).length);
  await expect(panel.locator('.card .chat.sent').first()).toBeVisible();
  await expect(panel.locator('#transcript li')).not.toHaveCount(0);

  await panel.locator('#toggle').click();
  await expect(panel.locator('#pill')).toHaveText('Chưa chạy', { timeout: 15_000 });
  await panel.screenshot({ path: join(root, 'extension/.cache/sidepanel.png'), fullPage: true });
});
