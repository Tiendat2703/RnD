import { expect, test, type Page } from "@playwright/test";

async function fillTranscript(page: Page, copies = 35) {
  await page.locator(".transcript-entry").first().waitFor();
  await page.evaluate((count) => {
    const list = document.querySelector<HTMLElement>(".transcript-list");
    const entry = document.querySelector<HTMLElement>(".transcript-entry");

    if (!list || !entry) throw new Error("Transcript UI not found");
    for (let index = 0; index < count; index += 1) {
      list.append(entry.cloneNode(true));
    }
  }, copies);
}

async function readLayout(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(".transcript-panel");
    const list = document.querySelector<HTMLElement>(".transcript-list");

    if (!panel || !list) throw new Error("Transcript UI not found");
    const panelRect = panel.getBoundingClientRect();

    return {
      viewportHeight: window.innerHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      panelTop: panelRect.top,
      panelBottom: panelRect.bottom,
      panelHeight: panelRect.height,
      listClientHeight: list.clientHeight,
      listScrollHeight: list.scrollHeight,
      listOverflowY: getComputedStyle(list).overflowY,
    };
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 600 },
]) {
  test(`desktop keeps a long transcript inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await fillTranscript(page);

    const layout = await readLayout(page);
    expect(layout.documentScrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
    expect(layout.listOverflowY).toBe("auto");
  });
}

test("mobile transcript remains a bounded bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await fillTranscript(page);

  const layout = await readLayout(page);
  expect(layout.documentScrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.panelTop).toBeGreaterThanOrEqual(0);
  expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.panelHeight).toBeLessThanOrEqual(layout.viewportHeight * 0.73);
  expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
});

test("conversation can pause and continue without adding hidden entries", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const pauseButton = page.getByRole("button", { name: "Tạm dừng hội thoại" });
  await pauseButton.click();
  await expect(page.getByRole("button", { name: "Tiếp tục hội thoại" }).first()).toBeVisible();
  const pausedCount = await page.locator(".transcript-entry").count();

  await page.waitForTimeout(4_000);
  await expect(page.locator(".transcript-entry")).toHaveCount(pausedCount);

  await page.getByRole("button", { name: "Tiếp tục hội thoại" }).first().click();
  await expect.poll(() => page.locator(".transcript-entry").count(), { timeout: 7_000 }).toBeGreaterThan(pausedCount);
});
