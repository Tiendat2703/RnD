// scripts/prototype-shots.mjs — chụp ảnh prototype cho mục III.3.3 của bản mô tả.
//
// Chạy:  1) npm run dev            (web console, cổng 3000)
//        2) cd agents/sidekick && npm run extension:build
//        3) node scripts/prototype-shots.mjs
// Ảnh ra thư mục docs/screenshots/. Xem docs/screenshots/README.md để biết ảnh nào
// là chụp thật, ảnh nào dựng trên trang giả (không phải Meet thật).
//
// Popup và panel của extension chạy bằng `chrome.*` nên không mở thẳng được ngoài
// extension. Script phục vụ chính các file đã build trong agents/sidekick/dist-extension
// trên một server cục bộ và thay `chrome` bằng một bản giả tối thiểu: giao diện là
// thật, còn dữ liệu và nền Meet là mô phỏng.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const SCENARIO = JSON.parse(readFileSync(resolve("mocks/meeting-claims.json"), "utf8"));
const WEB = process.env.WEB ?? "http://localhost:3000";
const EXT = resolve("agents/sidekick/dist-extension");
const OUT = resolve("docs/screenshots");
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".woff2": "font/woff2", ".json": "application/json" };

const POPUP_STATES = {
  idle: {},
  running: { session: { id: "s1", title: "Họp làm rõ yêu cầu — tính năng thanh toán" }, status: "Đang chạy", stage: "searching", active: true },
  warn: { session: { id: "s1", title: "Họp làm rõ yêu cầu — tính năng thanh toán" }, status: "Không dùng được micro — chỉ nghe âm thanh từ người khác", stage: "listening", active: true },
  error: { status: "Thiếu khóa Blaze hoặc Exa" },
};

function popupPage(state) {
  const html = readFileSync(join(EXT, "popup.html"), "utf8");
  const stub = `<script>window.chrome={runtime:{getURL:p=>'/'+p,sendMessage:async()=>{}},storage:{local:{get:()=>Promise.resolve({}),set:async()=>{}},session:{get:()=>Promise.resolve(${JSON.stringify(POPUP_STATES[state])})},onChanged:{addListener(){}}},tabs:{query:async()=>[],create:async()=>{}},permissions:{}};</script>`;
  return html.replace('<script src="popup.js"></script>', stub + '<script src="popup.js"></script>');
}

// Nền tối với một ô video mờ, chỉ để panel có chỗ nổi lên như trên Meet. Không phải ảnh Meet.
const PANEL_PAGE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>mô phỏng</title>
<style>html,body{margin:0;height:100%;background:#202124}
.tile{position:fixed;inset:24px 24px 96px 420px;border-radius:16px;background:linear-gradient(135deg,#2b2f36,#1a1d21);display:grid;place-items:center}
.avatar{width:112px;height:112px;border-radius:50%;background:#5b3b1f}
.bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;gap:12px}
.bar i{width:48px;height:48px;border-radius:50%;background:#3c4043}.bar i.end{background:#d93025;width:64px;border-radius:24px}</style></head>
<body><div class="tile"><div class="avatar"></div></div><div class="bar"><i></i><i></i><i></i><i class="end"></i></div>
<script>
window.__h=null;
window.chrome={runtime:{getURL:p=>'/'+p,sendMessage:async()=>{},onMessage:{addListener:fn=>{window.__h=fn}}}};
window.emit=e=>window.__h({type:'meetmate.panel',event:e},{},()=>{});
</script><script src="/content.js"></script></body></html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__popup") {
    res.writeHead(200, { "content-type": TYPES[".html"] });
    return res.end(popupPage(url.searchParams.get("state") ?? "idle"));
  }
  if (url.pathname === "/__panel") {
    res.writeHead(200, { "content-type": TYPES[".html"] });
    return res.end(PANEL_PAGE);
  }
  const file = normalize(join(EXT, url.pathname));
  if (!file.startsWith(EXT) || !existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const LOCAL = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: "chrome" });
const shots = [];
const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: join(OUT, name), ...opts });
  shots.push(name);
  console.log("  ✓", name);
};
const settle = (page, ms = 600) => page.waitForTimeout(ms);

/* ---- extension: popup 360×520, bốn trạng thái ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 520 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [state, name] of [
    ["idle", "08-extension-popup-san-sang.png"],
    ["running", "09-extension-popup-dang-nghe.png"],
    ["warn", "10-extension-popup-canh-bao-micro.png"],
    ["error", "11-extension-popup-thieu-khoa.png"],
  ]) {
    await page.goto(`${LOCAL}/__popup?state=${state}`);
    await settle(page, 700);
    await shot(page, name);
  }
  await ctx.close();
}

/* ---- extension: panel trong trang họp với thẻ đối chiếu (nền Meet dựng, dữ liệu mẫu) ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${LOCAL}/__panel`);
  await page.evaluate((sc) => {
    const e = window.emit;
    e({ type: "status", status: "Đang chạy", running: true, active: true, mock: true, sessionId: "s1" });
    for (const l of sc.lines.slice(5, 9)) e({ type: "line", line: { id: l.id, text: l.text, atMs: l.atMs, source: "mixed" } });
    for (const c of sc.cards) e({ type: "card", card: c });
    e({ type: "stage", stage: "writing" });
  }, SCENARIO);
  await settle(page, 900);
  await shot(page, "12-extension-panel-the-doi-chieu-mo-phong.png");
  // cuộn tới cuối để thấy thẻ "mâu thuẫn" và câu hỏi
  await page.evaluate(() => {
    const body = document.getElementById("meetmate-panel").shadowRoot.querySelector(".panel__body");
    body.scrollTop = body.scrollHeight;
  });
  await settle(page, 400);
  await shot(page, "13-extension-panel-the-mau-thuan-mo-phong.png");
  await ctx.close();
}

/* ---- web console (dữ liệu mẫu) ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  await page.goto(`${WEB}/dashboard/callSessions`, { waitUntil: "networkidle" });
  await settle(page, 800);
  await shot(page, "01-web-danh-sach-cuoc-hop.png");

  // cuộc họp mẫu có thẻ đối chiếu: thẻ đầu tiên trong danh sách
  const openSample = async () => {
    await page.goto(`${WEB}/dashboard/callSessions`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Xem bản ghi/ }).first().click();
    await settle(page, 700);
  };
  await openSample();
  await page.getByRole("tab", { name: "Nhận định" }).click();
  await settle(page, 600);
  await shot(page, "02-web-the-doi-chieu-nhan-dinh.png");

  await page.getByRole("tab", { name: "Bối cảnh" }).click();
  await settle(page, 500);
  await shot(page, "03-web-boi-canh-phien.png");

  await page.getByRole("tab", { name: "Bản ghi" }).click();
  await settle(page, 500);
  await shot(page, "04-web-ban-ghi.png");

  await page.getByRole("tab", { name: "Artifact" }).click();
  await settle(page, 400);
  await page.getByRole("button", { name: /Báo cáo cuộc họp/ }).dispatchEvent("click");
  await settle(page, 6500); // đợi toast "Đã tạo…" tự tắt để ảnh không bị che
  await shot(page, "05-web-artifact-bao-cao.png");
  await page.keyboard.press("Escape");

  // kho tài liệu + kiểm tra truy xuất
  await page.goto(`${WEB}/dashboard/documents`, { waitUntil: "networkidle" });
  await settle(page, 600);
  await page.getByRole("button", { name: "Truy xuất" }).click();
  await settle(page, 1200);
  await shot(page, "06-web-tai-lieu-truy-xuat.png");

  // luồng tạo phiên: hộp thoại kiểm tra extension (không có extension nên chưa tick được)
  await page.goto(`${WEB}/dashboard/callSessions`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cuộc họp mới" }).click();
  await settle(page, 400);
  await page.getByRole("button", { name: "Tiếp" }).click();
  await settle(page, 400);
  await page.getByRole("button", { name: "Bắt đầu MeetMate" }).click();
  await settle(page, 1500);
  await shot(page, "07-web-cuoc-hop-moi-kiem-tra-extension.png");
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${shots.length} ảnh trong ${OUT}`);
