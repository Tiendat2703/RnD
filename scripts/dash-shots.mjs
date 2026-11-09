// scripts/dash-shots.mjs — đi hết các surface của MeetMate và chụp lại từng
// trạng thái, kèm hai cửa kiểm chứng hình mà mắt dễ lướt qua: thanh cuộn ngang
// ảo và khối chồng/lệch hộp.
//
// Suite này thay hai suite chụp cũ. Bản cũ đi theo flow của đối thủ (review
// banner, split create, nền tảng gọi, STAR/filler, gói tín dụng USD, chat hỗ trợ)
// và những tên chuẩn bị tiếng Anh. Surface đó không tồn tại trong sản phẩm này,
// nên chụp lại là chụp một thứ người dùng không bao giờ thấy. Đi lại theo flow
// của MeetMate: danh sách → chi tiết → wizard → cài extension → monitor trực tiếp
// → tùy chọn nghiên cứu → rời/kết thúc → gói → tài khoản → tài liệu → cài đặt →
// "/" → mobile.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = "shots/flow";
mkdirSync(OUT, { recursive: true });

const problems = [];
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.setDefaultTimeout(9000);

page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|Failed to load resource|React DevTools/i.test(m.text()))
    problems.push(`console: ${m.text().slice(0, 240)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 240)}`));

let n = 0;
// Toast xếp trên mọi dialog (z-index cao nhất), bốn cái là đủ để chôn chân một
// dialog. Tắt bằng stylesheet chứ không bấm nút đóng: một cú click là một
// mousedown thật ở chỗ khác, sẽ làm đóng ngay menu kebab mà shot sắp chụp.
let toastGuard = null;
const hideToasts = async (on) => {
  if (on) {
    toastGuard = await page.addStyleTag({ content: ".toast-host{visibility:hidden}" });
  } else if (toastGuard) {
    await toastGuard.evaluate((el) => el.remove());
    toastGuard = null;
  }
};
// `overflow-y: auto` âm thầm đổi `overflow-x: visible` thành `auto`, nên một phần
// tử rỉ vài pixel là raises một thanh cuộn ngang không ai thiết kế.
const phantomBars = () =>
  page.evaluate(() => {
    if (window.innerWidth < 900) return [];
    const bad = new Set();
    const roots = document.querySelectorAll(
      ".dcard, .ovl, .dp, .menu, .dmenu, .settings-section, .upgrade, .wiz, .doc-card, .meeting-room"
    );
    for (const root of roots) {
      if (!root.getClientRects().length) continue;
      for (const el of [root, ...root.querySelectorAll("*")]) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "auto" && cs.overflowX !== "scroll") continue;
        const over = el.scrollWidth - el.clientWidth;
        if (over > 1)
          bad.add(
            `${el.tagName.toLowerCase()}.${String(el.className || "").trim().split(/\s+/)[0]} +${over}px`
          );
      }
    }
    return [...bad];
  });

const shot = async (name, opts = {}) => {
  if (!opts.withToasts) await hideToasts(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${name}.png` });
  if (!opts.withToasts) {
    let bars = [];
    try {
      bars = await phantomBars();
    } catch (e) {
      problems.push(`${name}: cửa kiểm chứng thanh cuộn hỏng: ${String(e).split("\n")[0].slice(0, 120)}`);
    }
    if (bars.length) problems.push(`${name}: thanh cuộn ngang ảo -> ${bars.join(", ")}`);
  }
  if (!opts.withToasts) await hideToasts(false);
  console.log(`  ✓ ${String(n).padStart(2, "0")}-${name}`);
};

const btn = (re) => page.getByRole("button", { name: re }).first();
// Một nút bên trong hộp thoại đang mở. Không phải tiện ích: ở tiếng Việt, tên
// nút khớp kiểu substring của Playwright dễ đụng nhau hơn tưởng — "ở lại phiên"
// nằm trong "Mở lại phiên" của thẻ cuộc họp, nên `btn("Ở lại phiên")` thật ra
// bấm trúng nút nằm *sau* scrim và chết timeout. Scoping vào dialog là cách
// người dùng đang nhìn, và là cách duy nhất không đụng tên.
const dlgBtn = (re) => page.locator('[role="dialog"]').last().getByRole("button", { name: re });
// Hai lựa chọn rời/kết thúc là `<button role="radio">`: tag là button nhưng ARIA
// role là radio, và getByRole đi theo role. Nhầm một cái là timeout 9 giây.
const dlgRadio = (re) => page.locator('[role="dialog"]').last().getByRole("radio", { name: re });
const radio = (re) => page.getByRole("radio", { name: re }).first();
const item = (re) => page.getByRole("menuitem", { name: re }).first();
const tab = (re) => page.getByRole("tab", { name: re }).first();
const sw = (re) => page.getByRole("switch", { name: re }).first();
const dlg = (re) => page.getByRole("dialog", { name: re });
const close = async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
};
/** Chờ một điều kiện DOM — replay phiên chạy 8x, đoán số giây sẽ chụp nhầm lúc. */
const until = async (fn, timeout = 60_000) => {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return true;
    if (Date.now() - t0 > timeout) throw new Error(`hết ${timeout}ms mà điều kiện không xảy ra`);
    await page.waitForTimeout(300);
  }
};

const safe = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    // Playwright đặt locator đang chờ ở dòng thứ hai của message; cắt mất nó thì
    // mỗi lỗi thành "Timeout exceeded" vô nghĩa như nhau hết.
    const msg = String(e)
      .split("\n")
      .filter((l) => /Error|waiting for|locator|element|elementFromPoint/.test(l))
      .slice(0, 3)
      .join(" | ")
      .slice(0, 300);
    problems.push(`bước "${label}": ${msg}`);
    console.log(`  ✗ ${label}: ${msg}`);
  }
};

/* Hình học: một lưới sập có thể cho hai khối vẽ chồng lên nhau, hoặc dồn chân
   dialog ra ngoài hộp đã clamp. Shot rất dễ lướt qua, nên đo hộp thay vì tin mắt. */
const box = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  }, sel);

const stacked = async (label, upper, lower) => {
  const a = await box(upper);
  const b = await box(lower);
  if (!a || !b) throw new Error(`${label}: thiếu hộp ${!a ? upper : lower}`);
  if (a.bottom > b.top + 1)
    throw new Error(`${label}: ${upper} chồng lên ${lower} (${a.bottom.toFixed(0)} > ${b.top.toFixed(0)})`);
};
const beside = async (label, left, right) => {
  const a = await box(left);
  const b = await box(right);
  if (!a || !b) throw new Error(`${label}: thiếu hộp ${!a ? left : right}`);
  if (a.right > b.left + 1)
    throw new Error(`${label}: ${left} chồng sang ${right} (${a.right.toFixed(0)} > ${b.left.toFixed(0)})`);
};
const hasHeight = async (label, sel, min) => {
  const a = await box(sel);
  if (!a) throw new Error(`${label}: thiếu hộp ${sel}`);
  if (a.bottom - a.top < min)
    throw new Error(`${label}: ${sel} chỉ cao ${(a.bottom - a.top).toFixed(0)}px (cần >= ${min})`);
};
const inside = async (label, inner, outer) => {
  const a = await box(inner);
  const b = await box(outer);
  if (!a || !b) throw new Error(`${label}: thiếu hộp ${!a ? inner : outer}`);
  if (a.bottom > b.bottom + 1)
    throw new Error(`${label}: ${inner} tràn khỏi ${outer} ở ${a.bottom.toFixed(0)}`);
};
/** `.dcard` là bản thân role="dialog": một scrim overflow:hidden sẽ cắt bớt
   hội thoại thay vì báo lỗi, nên đo thẳng lấy viewport làm hộp ngoài. */
const inViewport = async (label, sel) => {
  const over = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [
      ["trên", -r.top],
      ["trái", -r.left],
      ["phải", r.right - window.innerWidth],
      ["dưới", r.bottom - window.innerHeight],
    ].filter(([, px]) => px > 1);
  }, sel);
  if (over === null) throw new Error(`${label}: thiếu hộp ${sel}`);
  if (over.length)
    throw new Error(
      `${label}: ${sel} tràn màn hình ở ${over.map(([k, px]) => `${k} ${px.toFixed(0)}px`).join(", ")}`
    );
};

await page.goto(`${BASE}/dashboard/callSessions`, { waitUntil: "networkidle" });

/* 1 — danh sách cuộc họp */
await safe("danh sách", async () => {
  await shot("list-cards");
  await stacked("thẻ nằm dưới toolbar", ".toolbar", ".session-card");

  await page.locator('button[aria-label="Dạng bảng"]').click();
  await shot("list-table");
  await page.locator('button[aria-label="Dạng thẻ"]').click();
  await page.waitForTimeout(200);

  await btn(/^Thao tác cho /).click();
  await shot("card-menu");
  await close();

  await page.getByRole("searchbox", { name: "Tìm theo tên cuộc họp" }).fill("bảng");
  await shot("list-search");
  await page.getByRole("searchbox", { name: "Tìm theo tên cuộc họp" }).fill("");
  await page.waitForTimeout(200);

  await tab(/Nghiên cứu/).click();
  await shot("list-filter-research");
  await tab(/^Tất cả/).click();
  await page.waitForTimeout(200);

  await page.locator('button[aria-label="Mới nhất trước"]').click();
  await shot("list-sort-oldest");
  await page.locator('button[aria-label="Cũ nhất trước"]').click();
  await page.waitForTimeout(200);
});

/* 2 — panel chi tiết, đủ bốn tab */
await safe("panel chi tiết", async () => {
  await btn("Xem bản ghi").click();
  await until(async () => (await page.locator(".transcript-line").count()) > 0, 8000);
  await shot("detail-transcript");
  await beside("rail bên trái phần nội dung", ".dp__rail", ".dp__main");
  await hasHeight("bản ghi có chiều cao thật", ".dp__scroll", 200);

  await tab(/Nguồn/).click();
  await shot("detail-sources");
  await tab(/Artifact/).click();
  await shot("detail-artifact");
  await tab(/Chi tiết/).click();
  await shot("detail-meta");
  await close();
});

/* 3 — wizard tạo phiên, rồi dialog cài extension */
await safe("wizard", async () => {
  await btn("Cuộc họp mới").click();
  await until(async () => (await dlg(/^Cuộc họp mới$/).count()) === 1, 8000);
  await shot("wizard-step1");
  await hasHeight("người chọn loại có chỗ", ".wiz__body", 200);

  await radio(/Đào tạo/).click();
  await shot("wizard-step1-kind");
  await radio(/Sản phẩm/).click();
  await page.locator(".wiz__main").evaluate((el) => el.scrollBy(0, 420));
  await page.waitForTimeout(200);
  await shot("wizard-step1-docs");

  await btn("Tiếp").click();
  await shot("wizard-step2");
  await sw(/chat Meet/).click();
  await shot("wizard-step2-noautopost");
  await sw(/chat Meet/).click();

  await btn("Bắt đầu MeetMate").click();
  await until(async () => (await dlg(/Cài MeetMate/).count()) === 1, 8000);
  await shot("install-dialog");
  await inViewport("dialog cài đặt nằm trong màn hình", ".dcard");
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).click();
  await shot("install-ready");
  await close();
  await close();
});

/* 4 — monitor trực tiếp: đây là surface dài nhất, đi theo dòng thời gian của phiên */
await safe("monitor trực tiếp", async () => {
  await btn("Mở lại phiên").click();
  await until(async () => (await page.locator(".ovl").count()) === 1, 8000);
  await shot("live-overlay");
  await beside(
    "hai cột của overlay",
    '.ovl__panel[aria-label="Bản ghi đang chạy"]',
    ".ovl__panel--answers"
  );
  await hasHeight("cột kết quả có chỗ", ".ovl__answers", 200);

  await until(async () => (await page.locator(".mm-topic").count()) >= 1, 30_000);
  await shot("live-topic-first");
  await until(async () => (await page.locator(".mm-post").count()) >= 3, 40_000);
  await shot("live-posts");

  await btn("Cấu hình phiên").click();
  await shot("live-kebab");
  await item(/Cỡ chữ/).click();
  await shot("kebab-size-menu");
  await page.getByRole("menuitemradio", { name: /Lớn/ }).first().click();
  await shot("answers-large-text");
  await btn("Cấu hình phiên").click();
  await item(/Nền/).click();
  await page.getByRole("menuitemradio", { name: /Sáng/ }).first().click();
  await shot("live-chrome-light");
  await btn("Cấu hình phiên").click();
  await item(/Nền/).click();
  await page.getByRole("menuitemradio", { name: /Tối/ }).first().click();

  await btn("Cấu hình phiên").click();
  await item(/Tùy chọn nghiên cứu/).click();
  await until(async () => (await dlg(/Tùy chọn nghiên cứu/).count()) === 1, 8000);
  await shot("prefs-sources");
  await radio(/6 nguồn/).click();
  await shot("prefs-over-cap");
  await radio(/2 nguồn/).click();
  await shot("prefs-two-sources");
  await radio(/4 nguồn/).click();
  await btn("Mặc định").click();
  await page.locator(".dcard").evaluate((el) => el.scrollBy(0, 320));
  await page.waitForTimeout(200);
  await shot("prefs-bottom");
  await btn("Lưu").click();
  await close();

  await until(
    async () => (await page.locator(".mm-topic__stage--killed, .mm-post--cancelled").count()) > 0,
    60_000
  );
  await shot("live-topic-killed");

  await btn("Rời phiên").click();
  await until(async () => (await dlg(/Rời hoặc kết thúc/).count()) === 1, 8000);
  await shot("leave-dialog");
  await dlgRadio(/Kết thúc phiên/).first().click();
  await shot("leave-dialog-end");
  await dlgBtn("Ở lại phiên").click();
  await page.waitForTimeout(300);

  await btn("Rời phiên").click();
  await until(async () => (await dlg(/Rời hoặc kết thúc/).count()) === 1, 8000);
  await dlgRadio(/Kết thúc phiên/).first().click();
  await dlgBtn(/^Kết thúc phiên$/).click();
  await shot("after-end-list", { withToasts: true });
  await until(async () => (await page.locator(".ovl").count()) === 0, 8000);
});

/* 5 — trang gói dịch vụ */
await safe("trang gói", async () => {
  await page.goto(`${BASE}/dashboard/upgrade`, { waitUntil: "networkidle" });
  await shot("pricing-pro-year");
  await hasHeight("thẻ gói có chiều cao", ".pcard", 240);

  await radio(/^Free/).click();
  await shot("pricing-free");
  await radio(/^Team/).click();
  await shot("pricing-team");
  await radio(/^Edu/).click();
  await shot("pricing-edu");
  await radio(/^Pro/).click();
  await radio(/Trả theo tháng/).click();
  await shot("pricing-pro-month");
  await radio(/Trả theo năm/).click();

  await page.locator(".matrix").evaluate((el) => {
    el.scrollIntoView({ block: "center" });
  });
  await shot("pricing-matrix");

  await btn("Chuyển sang nền tối").click();
  await shot("pricing-dark");
  await btn("Chuyển sang nền sáng").click();
});

/* 6 — menu tài khoản + trang tài khoản */
await safe("tài khoản", async () => {
  await page.goto(`${BASE}/dashboard/callSessions`, { waitUntil: "networkidle" });
  await btn("Menu tài khoản").click();
  await shot("user-menu");
  await item(/Chủ đề màu/).click();
  await shot("user-menu-theme");
  await close();
  await close();

  await page.goto(`${BASE}/dashboard/profile`, { waitUntil: "networkidle" });
  await shot("profile-account");
  await tab(/Gói hiện tại/).click();
  await shot("profile-plan");
  await tab(/Dữ liệu của bạn/).click();
  await shot("profile-data");
});

/* 7 — tài liệu + cài đặt */
await safe("tài liệu và cài đặt", async () => {
  await page.goto(`${BASE}/dashboard/documents`, { waitUntil: "networkidle" });
  await shot("documents");
  await btn(/Thêm tài liệu/).click();
  await shot("documents-add");
  await close();

  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
  await shot("settings");
  await hasHeight("mục cài đặt có nội dung", ".settings-section", 120);
  await btn(/^Tối$/).click();
  await shot("settings-dark");
  await btn(/^Sáng$/).click();
});

/* 9 — mobile 390: mọi surface phải xếp một cột, không rỉ cuộn ngang */
await safe("mobile", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard/callSessions`, { waitUntil: "networkidle" });
  await shot("mobile-list");
  const doc = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
  }));
  if (doc.w > doc.c + 1) throw new Error(`trang danh sách rỉ cuộn ngang ở 390px: +${doc.w - doc.c}px`);

  await btn("Mở điều hướng").click();
  await shot("mobile-drawer");
  await close();
  // scrim biến mất thật chưa chắc drawer đã đóng với bàn phím: đo trực tiếp
  if (await page.locator(".sidebar-scrim").count())
    throw new Error("Escape không đóng drawer ở 390px — bàn phím vào được mà không ra được");

  await btn("Cuộc họp mới").click();
  await shot("mobile-wizard");
  await close();

  await btn(/^Thao tác cho /).click();
  await shot("mobile-card-menu");
  await close();

  await page.goto(`${BASE}/dashboard/upgrade`, { waitUntil: "networkidle" });
  await shot("mobile-upgrade");
  const spill = await page.evaluate(() => {
    const card = document.querySelector(".pcard")?.getBoundingClientRect();
    if (!card) return 0;
    let bad = 0;
    for (const el of document.querySelectorAll(".pcard *"))
      if (el.getBoundingClientRect().right > card.right + 1) bad++;
    return bad;
  });
  if (spill) throw new Error(`${spill} phần tử tràn khỏi thẻ gói ở 390px`);

  await page.goto(`${BASE}/dashboard/profile`, { waitUntil: "networkidle" });
  await shot("mobile-profile");
  await page.goto(`${BASE}/dashboard/documents`, { waitUntil: "networkidle" });
  await shot("mobile-documents");
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
  await shot("mobile-settings");
  await page.setViewportSize({ width: 1280, height: 800 });
});

await browser.close();
console.log(`\nshots: ${n}  problems: ${problems.length}`);
for (const p of problems) console.log(" *", p);
process.exit(problems.length === 0 ? 0 : 1);
