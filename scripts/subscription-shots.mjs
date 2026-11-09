// scripts/subscription-shots.mjs — chụp trang Gói dịch vụ ở ba chiều rộng, ra docs/screenshots/subscription/.
// Chạy khi `npm run dev` đang chạy:  node scripts/subscription-shots.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB = process.env.WEB ?? "http://localhost:3000";
const OUT = resolve("docs/screenshots/subscription");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["tablet", 900, 1000],
  ["mobile", 390, 844],
]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/dashboard/upgrade`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${name}-1-dau-trang.png`) });
  // trang cuộn bên trong khung nội dung nên fullPage không ăn thua: kéo cao khung nhìn rồi chụp
  await page.setViewportSize({ width, height: name === "mobile" ? 4200 : 2600 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${name}-toan-trang.png`) });
  console.log("  ✓", name);
  await ctx.close();
}
await browser.close();
