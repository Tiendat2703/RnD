// tests/meeting-layout.spec.ts — cổng hình học cho trang `/`.
//
// Ba điều giữ lại từ bản test cũ vì chúng là thứ mắt không nhìn ra: một bản ghi
// dài phải cuộn trong bảng chứ không được đẩy trang tràn khỏi màn hình; trên
// phone bảng đó là bottom sheet có trần; và hai nút điều khiển phải thật sự
// dừng/phát lại dòng thời gian.
//
// Nhãn đổi theo Stage 7: MeetMate không "hội thoại", nó phiên âm bản ghi của tab
// Meet, nên nút là "Tạm dừng bản ghi"/"Tiếp tục bản ghi". Trên desktop mỗi nhãn
// có hai nút cùng mang — dải điều khiển dưới sân khấu và đầu bảng bản ghi. Ở
// ≤760px thì chỉ còn một: sheet 72vh phủ lên sân khấu, nên dải nút ẩn đi khi
// bảng mở (globals.css, `:has(.transcript-panel)`) và hoàn lại 108px cho sân
// khấu. Test nào bấm theo nhãn vì vậy vẫn cần `.first()` trên desktop, còn test
// chạy ở cả ba chiều thì đo vào nút trong bảng.
//
// Một thay đổi thật về hành vi phải được test tính tới: bảng tự nhảy sang tab
// "Nguồn" ngay khi nguồn đầu tiên về (TranscriptPanel.tsx:64), và khi ở tab Nguồn
// thì `.transcript-list` không tồn tại. Test nào cần đo bản ghi vì vậy phải bấm
// tab "Bản ghi" sau khi đã tạm dừng — `userPicked` sẽ không giành lại tab nữa.
import { expect, test, type Page } from "@playwright/test";

/** Dừng dòng thời gian rồi về tab bản ghi: mọi phép đo bên dưới cần `.transcript-list` đang hiển thị. */
async function openTranscript(page: Page) {
  await page.goto("/");
  // Nút bấm lấy trong bảng, không lấy `.first()` của nhãn: trên phone dải nút
  // của sân khấu không tồn tại khi bảng đang mở, còn bảng thì luôn mang bản sao
  // Tạm dừng/Đóng của riêng nó. Đo vào nút trong bảng thì test chạy được ở cả
  // ba chiều desktop lẫn phone.
  await page.locator(".transcript-panel").getByRole("button", { name: "Tạm dừng bản ghi" }).click();
  await page.getByRole("tab", { name: /Bản ghi/ }).click();
  await expect(page.locator(".transcript-list")).toBeVisible();
}

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
  test(`bản ghi dài ở desktop vẫn cuộn trong bảng, không đẩy trang tràn khỏi ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openTranscript(page);
    await fillTranscript(page);

    const layout = await readLayout(page);
    expect(layout.documentScrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
    expect(layout.listOverflowY).toBe("auto");
  });
}

test("bản ghi trên phone là bottom sheet có trần", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTranscript(page);
  await fillTranscript(page);

  const layout = await readLayout(page);
  expect(layout.documentScrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.panelTop).toBeGreaterThanOrEqual(0);
  expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.panelHeight).toBeLessThanOrEqual(layout.viewportHeight * 0.73);
  expect(layout.listScrollHeight).toBeGreaterThan(layout.listClientHeight);
});

test("ở phone, dải nút sân khấu ẩn khi bảng mở và bấm lại được khi đóng", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".transcript-panel").waitFor();

  const wrap = page.locator(".meeting-controls__wrap");
  // Sheet 72vh phủ đúng chỗ dải nút ngồi. Hai cặp nút cùng làm một việc mà một
  // cặp chỉ bị che thì người dùng vẫn bấm vào đó và nhận lại khoảng không — nên
  // dải nút phải biến mất thật, không phải nằm dưới sheet.
  await expect(wrap).toBeHidden();
  await expect(page.getByRole("button", { name: /^Tạm dừng bản ghi$/ })).toHaveCount(1);

  // Ẩn dải nút chỉ an toàn khi bảng tự mang đường ra.
  await page.getByRole("button", { name: "Đóng bảng bản ghi" }).click();
  await expect(page.locator(".transcript-panel")).toHaveCount(0);

  // Playwright từ chối click vào phần tử bị che, nên mở lại được bằng chính dải
  // nút vừa hiện là bằng chứng không còn gì chắn ở đó — và là chứng cứ người
  // dùng không bị nhốt: đóng được thì mở lại được.
  const reopen = page.getByRole("button", { name: /^Mở bảng bản ghi$/ });
  await expect(reopen).toHaveCount(1);
  await reopen.click();
  await expect(page.locator(".transcript-panel")).toBeVisible();
  await expect(wrap).toBeHidden();
});

test("bản phát lại tạm dừng rồi chạy tiếp mà không âm thầm thêm dòng", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const pause = page.getByRole("button", { name: "Tạm dừng bản ghi" }).first();
  await pause.click();
  await expect(page.getByRole("button", { name: "Tiếp tục bản ghi" }).first()).toBeVisible();
  const pausedCount = await page.locator(".transcript-entry").count();

  await page.waitForTimeout(4_000);
  await expect(page.locator(".transcript-entry")).toHaveCount(pausedCount);

  await page.getByRole("button", { name: "Tiếp tục bản ghi" }).first().click();
  await expect
    .poll(() => page.locator(".transcript-entry").count(), { timeout: 7_000 })
    .toBeGreaterThan(pausedCount);
});
