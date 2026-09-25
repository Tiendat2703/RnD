import { defineConfig } from "@playwright/test";

const localBrowserLibraries = `${process.env.HOME}/.local/playwright-deps/usr/lib/x86_64-linux-gnu`;
const browserEnvironment = {
  ...process.env,
  LD_LIBRARY_PATH: [localBrowserLibraries, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
} as Record<string, string>;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30_000,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    launchOptions: {
      env: browserEnvironment,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
