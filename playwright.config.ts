import { defineConfig } from "@playwright/test";

const localBrowserLibraries = `${process.env.HOME}/.local/playwright-deps/usr/lib/x86_64-linux-gnu`;
const browserEnvironment = {
  ...process.env,
  LD_LIBRARY_PATH: [localBrowserLibraries, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
} as Record<string, string>;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Một worker, dù `fullyParallel` vẫn bật: cả suite cùng bấm vào MỘT dev server
  // và mỗi trang `/` chạy một bản phát lại có timer riêng. Để Playwright mở đủ
  // số cửa sổ theo số nhân thì `page.goto(...)` chờ "load" quá 30s và cả suite
  // đỏ mà app không có lỗi nào. Chạy một lượt hết suite trong ~10s, nên đây là
  // chuyện độ tin cậy, không phải tốc độ.
  workers: 1,
  timeout: 30_000,
  reporter: "line",
  use: {
    // `localhost`, không phải `127.0.0.1`: bản dev này hydrate chậm hơn mức
    // 127.0.0.1 trả trang, và một trang chưa hydrate thì không có nút nào để bấm.
    // `channel: "chrome"` vì máy này chỉ có Chrome hệ thống, không có chromium
    // tải kèm của Playwright.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    launchOptions: {
      env: browserEnvironment,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
