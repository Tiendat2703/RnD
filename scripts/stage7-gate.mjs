// scripts/stage7-gate.mjs — cổng Stage 7: trang "/" đã về đúng MeetMate chưa.
//
// Ba điều gate §5 Stage 7 đòi, cộng những gì bản cũ từng làm sai và rất dễ
// quay lại:
//   1. 12 dòng transcript phải render được khi KHÔNG có roster. Bản cũ tra
//      participants.get(speakerId) và return null -> bảng trống không.
//   2. Không còn chữ của sản phẩm khác trên surface.
//   3. tsc 0 lỗi (chạy riêng: npm run lint).
//   4. Không có control giả: mọi nút phải đổi được trạng thái thật.
//   5. Ngân sách tin chat: không tin nào vượt 450 ký tự, không URL nào bị cắt.
//
// Replay chạy x8 nên phiên bản phát lại dài ~30 giây; script chờ tới dấu hiệu
// "complete" (nút đổi nhãn thành "Phát lại từ đầu") thay vì chờ một số giây cố
// định — máy chậm sẽ không làm gate đỏ giả.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
// Trần ký tự lấy từ khai báo duy nhất, không chép tay: đổi ở `lib/types.ts` thì
// gate đổi theo. Một hằng số 450 viết lại ở đây là một gate sẽ âm thầm xanh khi
// sản phẩm đã sang 600.
const CHAT_MAX = Number(
  readFileSync(new URL("../lib/types.ts", import.meta.url), "utf8").match(
    /chatMaxChars:\s*(\d+)/
  )?.[1]
);
if (!Number.isFinite(CHAT_MAX)) throw new Error("không đọc được LIMITS.chatMaxChars từ lib/types.ts");

let fails = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) fails++;
}

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const badResponses = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("response", (r) => {
  if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

// 1. Chữ phải biến mất ----------------------------------------------
const text = await page.evaluate(() => document.body.innerText);
for (const banned of [
  "Sidekick",
  "Product weekly",
  "Bảo mật",
  "Kết nối tốt",
  "Đang ghi bản họp",
  "Ghi chú",
  "Interview",
  "Mock",
  "Rejoin",
]) {
  check(`không còn chữ "${banned}"`, !text.includes(banned));
}

// 2. Không còn roster -----------------------------------------------
const roster = await page.evaluate(
  () => document.querySelectorAll(".participant-grid, .participant-tile, .participant-grid__empty").length
);
check("không còn phần tử roster", roster === 0, `found ${roster}`);

// 3. Một đồng hồ duy nhất ------------------------------------------
const clocks = await page.evaluate(() => document.querySelectorAll(".meeting-clock").length);
check("một đồng hồ duy nhất", clocks === 1, `found ${clocks}`);

// 4. Control thật: hai nút, và nó đổi trạng thái --------------------
const controls = await page.evaluate(
  () => document.querySelectorAll(".meeting-control").length
);
check("điều khiển đúng 2 nút", controls === 2, `found ${controls}`);
const pauseBtn = page.locator('.meeting-control[aria-label="Tạm dừng bản ghi"]');
check("nút tạm dừng có nhãn tiếng Việt", (await pauseBtn.count()) === 1);
await pauseBtn.click();
await page.waitForTimeout(120);
check(
  "tạm dừng đổi nhãn thật",
  (await page.locator('.meeting-control[aria-label="Tiếp tục bản ghi"]').count()) === 1
);
await page.locator('.meeting-control[aria-label="Tiếp tục bản ghi"]').click();
await page.waitForTimeout(120);
check(
  "phát lại khôi phục nhãn",
  (await page.locator('.meeting-control[aria-label="Tạm dừng bản ghi"]').count()) === 1
);

// 5. Chờ replay chạy hết, rồi đếm dòng -----------------------------
await page
  .locator('.meeting-control[aria-label="Phát lại từ đầu"]')
  .waitFor({ state: "attached", timeout: 90_000 });

const tabTranscript = page.getByRole("tab", { name: /^Bản ghi$/ });
const tabSources = page.getByRole("tab", { name: /Nguồn/ });
await tabTranscript.click();
await page.waitForTimeout(150);

const lineCount = await page.evaluate(
  () => document.querySelectorAll(".transcript-entry").length
);
check("12 dòng render được khi không có roster", lineCount === 12, `found ${lineCount}`);

const whoLabels = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".transcript-entry__who")).map((n) => n.textContent?.trim())
);
check(
  "mỗi dòng ghi kênh âm, không ghi tên người",
  whoLabels.every((w) => w === "Âm thanh tab Meet" || w === "Micro của bạn"),
  [...new Set(whoLabels)].join(" / ")
);

// caption chỉ tồn tại ở một chỗ: lane đang nói. Không còn lower-third thứ hai.
const captionNodes = await page.evaluate(() => document.querySelectorAll(".live-caption").length);
check("không có caption trùng lặp ngoài lane", captionNodes === 0, `found ${captionNodes}`);
const newest = await page.evaluate(() => {
  const on = document.querySelector('.mmk-src[data-on="yes"]');
  return {
    channel: on?.querySelector(".mmk-src__label")?.textContent?.trim() ?? "",
    line: on?.querySelector(".mmk-src__line.is-newest")?.textContent?.trim() ?? "",
  };
});
check(
  "lane đang nói ghi kênh, không ghi tên người",
  newest.channel === "Âm thanh tab Meet" || newest.channel === "Micro của bạn",
  newest.channel
);
check("lane đang nói có dòng mới nhất", newest.line.length > 0, newest.line.slice(0, 40));

// 6. Tab "Nguồn" và ngân sách tin chat -----------------------------
const sourcesBadge = await tabSources.innerText();
check("tab Nguồn hiện số nguồn thật", /Nguồn/.test(sourcesBadge) && !/\b0\b/.test(sourcesBadge), sourcesBadge.replace(/\s+/g, " "));
await tabSources.click();
await page.waitForTimeout(150);

const posts = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".mmk-post")).map((el) => {
    const foot = el.querySelector(".mmk-post__foot")?.textContent ?? "";
    const m = foot.match(/(\d+)\/(\d+)/);
    const link = el.querySelector("a.mmk-post__url");
    return {
      chars: m ? Number(m[1]) : NaN,
      limit: m ? Number(m[2]) : NaN,
      url: link?.getAttribute("href") ?? "",
      urlText: link?.textContent?.trim() ?? "",
      target: link?.getAttribute("target") ?? "",
      rel: link?.getAttribute("rel") ?? "",
      hasLink: Boolean(link),
    };
  })
);
const linked = posts.filter((p) => p.hasLink);
check("có tin nguồn được vẽ", posts.length > 0, `${posts.length} tin`);
check("tin có link", linked.length > 0, `${linked.length}/${posts.length}`);
check(
  "mỗi tin ≤ 450 ký tự",
  posts.every((p) => Number.isFinite(p.chars) && p.chars <= CHAT_MAX),
  posts.map((p) => p.chars).join(",")
);
check(
  "số ký tự khớp trần in trên tin",
  posts.every((p) => p.limit === CHAT_MAX),
  [...new Set(posts.map((p) => p.limit))].join(",")
);
check(
  "URL không bị cắt",
  linked.every((p) => /^https?:\/\/\S+$/.test(p.url) && !p.urlText.endsWith("…")),
  linked.filter((p) => !/^https?:\/\/\S+$/.test(p.url) || p.urlText.endsWith("…")).map((p) => p.urlText).join(" | ")
);
check(
  "link mở tab mới, rel an toàn",
  linked.every((p) => p.target === "_blank" && p.rel.includes("noreferrer")),
  linked.map((p) => `${p.target || "∅"} ${p.rel || "∅"}`)[0] ?? ""
);

// 7. Nguồn âm và pipeline ------------------------------------------
const srcRows = await page.evaluate(() => document.querySelectorAll(".mmk-src").length);
check("dải nguồn âm có 2 kênh", srcRows === 2, `found ${srcRows}`);
// lưới avatar từng chiếm giữa sân khấu; dải lane phải chiếm lại chỗ đó, nếu
// không trang lại thành một khoảng trống lớn như bản vừa sửa
const fill = await page.evaluate(() => {
  const s = document.querySelector(".mmk-sources")?.getBoundingClientRect().height ?? 0;
  const sT = document.querySelector(".meeting-stage")?.getBoundingClientRect().height ?? 1;
  return s / sT;
});
check("lane chiếm phần giữa sân khấu (> 35%)", fill > 0.35, `${Math.round(fill * 100)}%`);
const listening = await page.evaluate(() => document.body.innerText.includes("Đang lắng nghe"));
check("trạng thái là \"Đang lắng nghe\"", listening);

// 8. Ảnh hiện trường -----------------------------------------------
await page.screenshot({ path: "artifacts/stage7-room-complete.png", fullPage: false });

check(
  "không có request lỗi",
  badResponses.length === 0,
  badResponses.slice(0, 4).join(" | ")
);
check("không có lỗi console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(fails === 0 ? "\nSTAGE 7 GATE: XANH" : `\nSTAGE 7 GATE: ${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
