// The built extension in a real Chromium, end to end with the real Blaze APIs:
// web console session with documents (read by the backend's parser) → offscreen capture (fake microphone playing the scripted meeting)
// → AudioWorklet → Blaze STT → document checks with Blaze LLM → content script typing into
// a stand-in Meet chat. Tab capture needs a real toolbar click, so this drives the
// microphone-only path; everything after the audio source is the production code.
//
// Run: BLAZE_API_KEY=... npm run extension:e2e
// Needs extension/.cache/meeting.wav: BLAZE_API_KEY=... npx tsx scripts/simulate-meeting.ts --wav extension/.cache/meeting.wav --wav-only
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';
import { toSessionDocument } from '../../../../lib/documents';
import { buildDocument, readPdf } from '../../meetmate-server/documents';

const root = resolve(import.meta.dirname, '../..');
const dist = join(root, 'dist-extension');
const wav = join(root, 'extension/.cache/meeting.wav');
const key = process.env.BLAZE_API_KEY;

test.skip(!key, 'BLAZE_API_KEY is not set');
test.skip(!existsSync(wav), 'meeting.wav missing; see the header of this file');

let context: BrowserContext;
let panelPage: import('@playwright/test').Page | null = null;

test.beforeAll(async () => {
  // MEETMATE_BROWSER runs the same test in another Chromium browser, e.g. Cốc Cốc:
  // MEETMATE_BROWSER=/Applications/CocCoc.app/Contents/MacOS/CocCoc
  const executablePath = process.env.MEETMATE_BROWSER;
  context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'meetmate-')), {
    ...(executablePath ? { executablePath, headless: false } : { channel: 'chromium' }),
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

// On failure, show what MeetMate heard and reported, to tell STT misses from model misses.
test.afterEach(async ({}, info) => {
  if (info.status === info.expectedStatus || !panelPage) return;
  const heard = await panelPage.locator('#transcript li').allTextContents().catch(() => []);
  const cards = await panelPage.locator('.card').allTextContents().catch(() => []);
  console.log(`Transcript:\n  ${heard.join('\n  ')}\nCards:\n  ${cards.map(c => c.replace(/\s+/g, ' ').trim()).join('\n  ')}`);
});

test.afterAll(async () => {
  await context?.close();
});

test('records the meeting and answers keyword-invoked questions in the Meet chat', async () => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;
  // The APIs MeetMate relies on, as this browser exposes them to the extension.
  const apis = await worker.evaluate(() => ({
    sidePanel: typeof chrome.sidePanel?.setPanelBehavior, offscreen: typeof chrome.offscreen?.createDocument,
    tabCapture: typeof chrome.tabCapture?.getMediaStreamId, userAgent: navigator.userAgent,
  }));
  console.log('Extension APIs:', JSON.stringify(apis));
  expect(apis).toMatchObject({ sidePanel: 'function', offscreen: 'function', tabCapture: 'function' });

  const meet = await context.newPage();
  await meet.goto('https://meet.google.com/abc-defg-hij');

  const panel = await context.newPage();
  panelPage = panel;
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.locator('#blaze-key').fill(key!);
  await panel.locator('#blaze-key').dispatchEvent('change');
  await panel.locator('#web-research').uncheck();

  // Documents now come with the session the web console prepares: the backend reads the PDFs,
  // the web sends their chunks over the bridge (here straight to the background, as bridge.ts does).
  const documents = await Promise.all(['hop-dong.pdf', 'ke-hoach.pdf'].map(async name => {
    const data = new Uint8Array(readFileSync(join(root, 'extension/fixtures', name)));
    return toSessionDocument(buildDocument(name, 'PDF', data.byteLength, await readPdf(data, name)));
  }));
  await panel.evaluate(documents => chrome.runtime.sendMessage({
    type: 'mm.web',
    msg: { type: 'session.prepare', session: { id: 'e2e', title: 'E2E', kind: 'khac', sources: 4, autoPost: true, documents } },
  }), documents);
  await expect(panel.locator('#docs li:not(.empty)')).toHaveCount(2, { timeout: 30_000 });
  await expect(panel.locator('#docs')).toContainText('hop-dong.pdf');
  await expect(panel.locator('#docs-mode')).toContainText('Toàn bộ tài liệu');

  const reply = await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
    return chrome.runtime.sendMessage({ type: 'mm.start', tabId: tab.id, streamId: null });
  });
  expect(reply).toEqual({ ok: true });
  await expect(panel.locator('#pill')).toHaveText('Đang nghe', { timeout: 15_000 });

  // Regenerate meeting.wav from simulate-meeting.ts after changing the scripted requests.
  const chat = meet.locator('#messages li');
  await expect.poll(async () => (await chat.allTextContents()).join('\n'), { timeout: 120_000, intervals: [2_000] })
    .toMatch(/40%[\s\S]*VIAC|VIAC[\s\S]*40%/);
  // Keyword requests: one answered from the plan, one explicitly asks about missing file content.
  await expect.poll(async () => (await chat.allTextContents()).join('\n'), { timeout: 60_000, intervals: [2_000] })
    .toMatch(/ZaloPay[\s\S]*Tài liệu không đề cập/);
  // The last two requests come at the end of the recording: wait for their answers too.
  await expect.poll(async () => (await chat.allTextContents()).join('\n'), { timeout: 60_000, intervals: [2_000] })
    .toMatch(/12\.000\.000[\s\S]*React Native/);

  const messages = await chat.allTextContents();
  console.log(`Meet chat (${messages.length}):\n${messages.map(m => `  ${m.replace(/\n/g, ' ⏎ ')}`).join('\n')}`);
  expect(messages.every(m => m.startsWith('MeetMate: '))).toBe(true);
  expect(messages.join('\n')).toContain('12.000.000');
  expect(messages.join('\n')).toContain('React Native');
  // Only the six "trợ lý" answers reach the chat; automatic checks never do.
  expect(messages).toHaveLength(6);
  expect(messages.filter(t => t.includes('⚠️'))).toEqual([]);
  for (const m of messages.filter(t => !t.includes('Tài liệu không đề cập'))) {
    expect(m).toMatch(/📄 (hop-dong|ke-hoach)\.pdf, tr\. \d/);
  }
  await expect(panel.locator('.card .chat.sent').first()).toBeVisible();

  // Incorrect claims said without the keyword are caught on their own, shown only to the user.
  const auto = panel.locator('.card.contradiction', { hasText: 'tự kiểm' });
  await expect.poll(async () => (await auto.allTextContents()).join('\n'), { timeout: 30_000, intervals: [1_000] })
    .toMatch(/12\.000\.000[\s\S]*React Native|React Native[\s\S]*12\.000\.000/);
  await expect(auto.first()).toContainText('Chỉ bạn thấy');
  await expect(panel.locator('.card.supported', { hasText: 'tự kiểm' })).not.toHaveCount(0);
  console.log(`Automatic checks:\n${(await panel.locator('.card', { hasText: 'tự kiểm' }).allTextContents()).map(c => `  ${c.replace(/\s+/g, ' ').trim()}`).join('\n')}`);

  // Clicking a transcript line checks it against the documents, also only for the user.
  await panel.locator('details', { hasText: 'Transcript' }).locator('summary').click();
  const line = panel.locator('#transcript li', { hasText: /trời mưa/i }).first();
  await line.click();
  await expect(panel.locator('.card', { hasText: 'bạn bấm kiểm' })).toHaveCount(1, { timeout: 30_000 });
  console.log(`Clicked check: ${(await panel.locator('.card', { hasText: 'bạn bấm kiểm' }).innerText()).replace(/\s+/g, ' ')}`);
  expect(await chat.count()).toBe(6);

  await panel.locator('#toggle').click();
  await expect(panel.locator('#pill')).toHaveText('Chưa chạy', { timeout: 15_000 });
  await panel.screenshot({ path: join(root, 'extension/.cache/sidepanel.png'), fullPage: true });
});
