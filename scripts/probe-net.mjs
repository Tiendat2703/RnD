// scripts/probe-net.mjs — list every failing request on the dashboard routes
import { chromium } from "@playwright/test";

const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext()).newPage();
const bad = [];
p.on("requestfailed", (r) => bad.push("FAILED " + r.url() + " :: " + r.failure()?.errorText));
p.on("response", (r) => {
  if (r.status() >= 400) bad.push(r.status() + " " + r.url());
});
// routes thật của sản phẩm, không phải routes của bản clone đối thủ: `/dashboard/cv`
// đã bị xóa, `/dashboard/upgrade` và `/dashboard/profile` là hai trang mới.
for (const path of [
  "/",
  "/dashboard/callSessions",
  "/dashboard/upgrade",
  "/dashboard/profile",
  "/dashboard/documents",
  "/dashboard/settings",
]) {
  await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
}
console.log(bad.length ? [...new Set(bad)].join("\n") : "no failing requests");
await b.close();
