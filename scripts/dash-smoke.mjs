// scripts/dash-smoke.mjs — cổng Stage 8: console nói tiếng Việt, và bốn bất biến
// research của MeetMate phải giữ đúng ngay trên màn hình.
//
// Vì sao viết lại từ đầu: bộ check cũ đi theo IA của đối thủ (Interview/08-cv/
// Rate Sidekick/Upgrade/Send feedback). Những tên đó không còn tồn tại trong
// sản phẩm này, nên giữ chúng thì suite sẽ đỏ — và bỏ mất thứ duy nhất mà nó
// should đang đo: mọi nhãn người dùng nhìn thấy là tiếng Việt, và mọi tin
// MeetMate "đã gửi" nằm trong hợp đồng chat (≤450 ký tự, URL nguyên vẹn).
//
// Bốn check mới, đúng theo §5 Stage 8 của kế hoạch replatform:
//   1. mỗi tin ≤ LIMITS.chatMaxChars
//   2. URL của tin ⊆ tập nguồn có trong fixture
//   3. chuyện phiếm tạo ra 0 tin
//   4. chủ đề B cắt chủ đề A (A còn tin "chưa gửi", thẻ A mang nhãn "đã ngắt")
//
// Một check hỏng không được cất xác mười check sau: mỗi khối chạy trong try/catch
// riêng, khối chết thì ghi một FAIL và khối kế tiếp vẫn chạy trên trang mới.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// Trần kỹ thuật đọc từ lib/types.ts — bản sao cứng ở đây sẽ lệch ngay lần sửa đầu
// tiên, mà lệch thì check "≤450" chỉ còn là chữ.
const TYPES_SRC = readFileSync("lib/types.ts", "utf8");
const CHAT_MAX = Number(TYPES_SRC.match(/chatMaxChars:\s*(\d+)/)?.[1]);
const MAX_SOURCES = Number(TYPES_SRC.match(/maxSources:\s*(\d+)/)?.[1]);

// Tập nguồn hợp lệ = mọi URL có trong fixture dashboard + transcript.
const DATA_SRC = readFileSync("lib/dashboardData.ts", "utf8");
const SOURCE_URLS = new Set(
  [...DATA_SRC.matchAll(/https?:\/\/[^\s"'`)]+/g)].map((m) => m[0])
);

// Dòng chuyện phiếm, theo mocks/meetmate-output.json: "l-10 và l-11 là chuyện
// phiếm → chủ đề rỗng → không gửi gì." Hai cụm dưới đây lấy nguyên văn từ hai
// dòng đó (có kiểm tra lại ở dưới), nên nếu fixture đổi chữ, check sẽ tự hỏng
// thay vì âm thầm so với chuỗi rỗng.
const LINES = JSON.parse(readFileSync("mocks/meeting-transcript.json", "utf8"));
const SMALL_TALK_TEXT = LINES.filter((l) => l.id === "l-10" || l.id === "l-11")
  .map((l) => l.text)
  .join(" ");
const SMALL_TALK_TOKENS = ["chung kết", "phòng chiếu"];

const FIXTURE_TOPICS = [...DATA_SRC.matchAll(/topic:\s*"([^"]+)"/g)].map((m) => m[1]);
// Set, vì mỗi topic xuất hiện hai lần trong fixture (một lần trong `topic:`, một
// lần trong `result:`). slice(0,3) từng bỏ mất chủ đề thứ ba.
const TOPIC_NAMES = new Set(FIXTURE_TOPICS.slice(0, 6));

// Chữ của sản phẩm khác / của IA cũ. So sánh phân biệt hoa thường, vì đây là nhãn
// tiếng Anh chứ không phải từ mượn trong câu tiếng Việt.
const BANNED_TEXT = [
  "Interview",
  "Mock",
  "Sidekick",
  "Rejoin",
  "Upgrade",
  "Send feedback",
  "How billing works",
  "Credit pack",
  "Prepare",
  "Resumes",
  "Product weekly",
  "08-cv",
];

// Accessible name tiếng Anh còn sót. Danh sách từ, không phải mẫu regex chung, để
// "Google Meet" / "MeetMate" / "Edu / Pilot B2B" không bị báo oan.
const ENGLISH_NAMES = [
  "view", "edit", "delete", "save", "cancel", "close", "add ", "open ", "search",
  "sort", "table", "settings", "account", "sign", "upgrade", "send ", "feedback",
  "rate", "transcript", "details", "next", "back", "start", "leave", "light",
  "dark", "system", "language", "dashboard", "home", "help", "support", "billing",
  "download", "export", "copy", "clear",
];

let passed = 0;
const failures = [];
function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  —  ${detail}` : ""}`);
  }
}

const browser = await chromium.launch({ channel: "chrome" });
let page = null;
const consoleErrors = [];
const badResponses = [];
const NOISE = /favicon|Failed to load resource|Download the React DevTools/i;

async function freshPage() {
  if (page && !page.isClosed()) await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error" && !NOISE.test(m.text())) consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });
}

const goto = (path) => page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const texts = (sel) =>
  page.evaluate(
    (s) => Array.from(document.querySelectorAll(s)).map((n) => (n.textContent || "").trim()),
    sel
  );
const bodyText = () => page.evaluate(() => document.body.innerText);
const esc = async () => {
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
};
/** Chờ một điều kiện DOM, dùng cho replay chạy 8x (đừng đoán số giây). */
async function until(fn, timeout = 90_000) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return true;
    if (Date.now() - t0 > timeout) return false;
    await page.waitForTimeout(250);
  }
}
/** Đọc text của mọi phần tử khớp selector. */
const allText = (sel) =>
  page.evaluate(
    (s) => Array.from(document.querySelectorAll(s)).map((n) => (n.textContent || "").trim()).join(" | "),
    sel
  );

/** Một khối = một mạch tương tác. Chết giữa khối chỉ mất khối đó. */
async function block(label, fn) {
  console.log(`\n== ${label}`);
  await freshPage();
  try {
    await fn();
  } catch (e) {
    const msg = String(e && e.message ? e.message : e).split("\n")[0].slice(0, 140);
    failures.push(`${label} (khối chết): ${msg}`);
    console.log(`  BLOCK FAIL  ${label} — ${msg}`);
  }
}

/* ---------------------------------------------------------------- */
await block("Vỏ console: điều hướng + topbar", async () => {
  await goto("/dashboard/callSessions");
  ok("rail có đúng 2 mục điều hướng", (await count(".sidebar__nav .nav-item")) === 2);
  const nav = await texts(".sidebar__nav .nav-item");
  ok(
    "rail là Cuộc họp + Tài liệu",
    nav.length === 2 && nav[0].startsWith("Cuộc họp") && nav[1] === "Tài liệu",
    nav.join(" / ")
  );
  ok(
    "thẻ gói đưa tới /dashboard/upgrade",
    (await count('a[href="/dashboard/upgrade"]')) >= 1
  );
  ok("không còn route /dashboard/cv", (await count('a[href="/dashboard/cv"]')) === 0);
  const h1 = await texts("h1");
  ok("một h1 duy nhất, tên là Cuộc họp", h1.length === 1 && h1[0].startsWith("Cuộc họp"), h1[0]);
  ok(
    "skip link tiếng Việt",
    (await count('a[href="#dash-main"]')) === 1 && (await allText('a[href="#dash-main"]')).includes("Chuyển tới nội dung")
  );
  ok("nút menu tài khoản có nhãn Việt", (await count('button[aria-label="Menu tài khoản"]')) === 1);
  ok("nút thu gọn sidebar có nhãn Việt", (await count('button[aria-label^="Thu gọn"]')) === 1);
  const total = await allText(".tabbar__total");
  const navCount = await allText(".nav-item__count");
  ok("số đếm ở rail khớp tổng danh sách", navCount === total.replace(/\D/g, ""), `${navCount} vs ${total}`);
});

/* ---------------------------------------------------------------- */
await block("Danh sách cuộc họp: lọc, tìm, sắp, kiểu hiển thị", async () => {
  await goto("/dashboard/callSessions");
  const tabs = await texts('[role="tab"]');
  ok("6 tab lọc theo loại họp của MeetMate", tabs.length === 6 && tabs[0] === "Tất cả", tabs.join(" / "));
  ok(
    "tab đang chọn là Tất cả",
    (await page.getAttribute('[role="tab"]', "aria-selected")) === "true"
  );
  ok("8 cuộc họp trong vùng làm việc", (await allText(".tabbar__total")) === "8 cuộc họp");

  const search = page.getByRole("searchbox", { name: "Tìm theo tên cuộc họp" });
  ok("ô tìm kiếm có nhãn tiếng Việt", (await search.count()) === 1);

  await page.getByRole("tab", { name: "Nghiên cứu" }).click();
  await page.waitForTimeout(150);
  const scoped = Number((await allText(".tabbar__total")).replace(/\D/g, ""));
  ok("lọc theo loại đổi số cuộc họp", scoped > 0 && scoped < 8, `${scoped}`);
  // pill loại là pill ĐẦU TIÊN của thẻ; các pill sau là "N chủ đề" / "Có bản ghi"
  const kinds = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".session-card")).map(
      (c) => c.querySelector(".pill")?.textContent?.trim() ?? ""
    )
  );
  ok("thẻ còn lại đúng loại đã lọc", kinds.length > 0 && kinds.every((k) => k === "Nghiên cứu"), kinds.join(" / "));
  await page.getByRole("tab", { name: "Tất cả" }).click();
  await page.waitForTimeout(120);

  await search.fill("bảng giá");
  await page.waitForTimeout(200);
  const hits = await texts(".session-card__role");
  ok("tìm kiếm ra kết quả khớp từ khóa", hits.length > 0 && hits.length < 8, hits.join(" / "));
  ok("mọi kết quả chứa 'bảng giá'", hits.every((t) => t.toLowerCase().includes("bảng giá")));
  await search.fill("");
  await page.waitForTimeout(150);

  const before = (await texts(".session-card__role"))[0];
  await page.locator('button[aria-label="Mới nhất trước"]').click();
  await page.waitForTimeout(200);
  const afterLabel = await page.getAttribute('button[aria-label="Cũ nhất trước"]', "aria-label");
  ok("nút sắp đổi nhãn thật", afterLabel === "Cũ nhất trước");
  const after = (await texts(".session-card__role"))[0];
  ok("thứ tự thẻ đổi thật", after !== before, `${before} -> ${after}`);
  await page.locator('button[aria-label="Cũ nhất trước"]').click();
  await page.waitForTimeout(150);

  const dates = await texts(".session-card__date");
  ok(
    "ngày định dạng tiếng Việt (vi-VN), không phải dd/mm/yyyy cứng",
    dates.length === 8 && dates.every((d) => /^\d{1,2} thg \d{1,2}, \d{4}$/.test(d)),
    dates.slice(0, 2).join(" / ")
  );

  await page.locator('button[aria-label="Dạng bảng"]').click();
  await page.waitForTimeout(200);
  ok("dạng bảng vẽ table", (await count(".session-table")) === 1);
  ok(
    "dạng bảng giữ đủ số cuộc họp",
    (await count(".session-table__role--link")) === 8,
    String(await count(".session-table__role--link"))
  );
  await page.locator('button[aria-label="Dạng thẻ"]').click();
  await page.waitForTimeout(200);
  ok("quay lại dạng thẻ", (await count(".session-card")) === 8);
});

/* ---------------------------------------------------------------- */
await block("Panel chi tiết cuộc họp", async () => {
  await goto("/dashboard/callSessions");
  // panel mở ra đúng tab mà thẻ hứa: "Xem chi tiết" → Chi tiết, "Xem bản ghi" →
  // Bản ghi. Kiểm chứng bằng chính tab được chọn, không bằng tên nút.
  await page.getByRole("button", { name: "Xem bản ghi" }).first().click();
  await page.waitForTimeout(250);
  const dlg = await count('[role="dialog"][aria-label^="Chi tiết cuộc họp:"]');
  ok("mở panel chi tiết bằng nhãn Việt", dlg === 1);
  const openedTab = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".dp__rail [role='tab'][aria-selected='true']")).map(
      (n) => n.textContent?.trim()
  ) );
  ok(
    "nút Xem bản ghi mở thẳng vào tab Bản ghi",
    openedTab.length === 1 && openedTab[0] === "Bản ghi",
    openedTab.join(" / ")
  );
  const dpTabs = await texts(".dp__rail [role=\"tab\"]");
  ok(
    "4 tab: Bản ghi / Nguồn / Artifact / Chi tiết",
    dpTabs.length === 4 && dpTabs[0] === "Bản ghi" && dpTabs.includes("Nguồn"),
    dpTabs.join(" / ")
  );
  // "Xem chi tiết" mở đúng tab Chi tiết, nên bản ghi phải được chọn một cách
  // tường minh — và aria-selected phải đổi theo, không chỉ đổi mỗi class.
  await page.locator(".dp__rail [role='tab']").first().click();
  await page.waitForTimeout(200);
  ok(
    "tab Bản ghi nhận aria-selected thật",
    await page.evaluate(() => document.querySelector(".dp__rail [role='tab']")?.getAttribute("aria-selected") === "true")
  );
  const who = await texts(".transcript-line__who");
  ok(
    "bản ghi dán nhãn kênh âm, không dán tên người",
    who.length > 0 && who.every((w) => w === "Âm thanh tab Meet" || w === "Micro của bạn"),
    [...new Set(who)].join(" / ")
  );
  const hint = await allText(".dp__hint");
  ok("panel nói rõ chỉ có hai kênh âm", hint.includes("hai kênh") || hint.includes("Hai kênh"), hint.slice(0, 60));

  await page.getByRole("tab", { name: "Nguồn" }).click();
  await page.waitForTimeout(250);
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".dp a[href^='http']")).map((a) => a.getAttribute("href"))
  );
  ok("panel chi tiết có link nguồn", hrefs.length > 0, `${hrefs.length}`);
  ok(
    "CHECK-2 (panel): mọi URL nằm trong tập nguồn",
    hrefs.every((h) => SOURCE_URLS.has(h)),
    hrefs.filter((h) => !SOURCE_URLS.has(h)).join(" | ")
  );

  await page.getByRole("tab", { name: "Artifact" }).click();
  await page.waitForTimeout(150);
  const artText = await bodyText();
  ok("tab Artifact nói bằng tiếng Việt", artText.includes("Artifact") || artText.includes("bản giao"));

  await page.locator('button[aria-label="Đóng chi tiết"]').click();
  await page.waitForTimeout(200);
  ok("đóng panel bằng nút có nhãn Việt", (await count('[role="dialog"]')) === 0);
});

/* ---------------------------------------------------------------- */
await block("Menu thao tác trên thẻ và sửa cuộc họp", async () => {
  await goto("/dashboard/callSessions");
  const firstTitle = (await texts(".session-card__role"))[0];
  await page.locator(`button[aria-label="Thao tác cho ${firstTitle}"]`).click();
  await page.waitForTimeout(150);
  const items = await texts('[role="menuitem"]');
  ok(
    "3 thao tác, toàn bộ tiếng Việt",
    items.length === 3 && items.includes("Sửa cuộc họp") && items.includes("Xoá cuộc họp"),
    items.join(" / ")
  );
  await page.getByRole("menuitem", { name: "Sửa cuộc họp" }).click();
  await page.waitForTimeout(200);
  ok(
    "dialog sửa cuộc họp mang tên việc đang làm",
    (await count('[role="dialog"][aria-label="Sửa cuộc họp"]')) === 1
  );
  // nút phải lưu được ngay ở bước 1: bắt người đổi tên đi qua "tùy chọn phiên trực
  // tiếp" để tới nút "Lưu thay đổi" là bắt họ làm việc của flow tạo phiên
  ok(
    "sửa cuộc họp chỉ hứa một bước",
    (await count('[role="dialog"] .stepper__step')) === 1,
    String(await count('[role="dialog"] .stepper__step'))
  );
  ok(
    "nút lưu mang đúng tên việc, ở ngay bước 1",
    (await page.getByRole("button", { name: "Lưu thay đổi" }).count()) === 1
  );
  const input = page.locator('[role="dialog"] input').first();
  await input.fill("Bảng giá gói SME (đã sửa)");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.waitForTimeout(250);
  const toast = await allText(".toast");
  ok("lưu tên báo bằng toast tiếng Việt", toast.includes("Đã cập nhật cuộc họp."), toast.slice(0, 60));
  const titles = await texts(".session-card__role");
  ok("thẻ hiển thị tên mới", titles.includes("Bảng giá gói SME (đã sửa)"), titles.slice(0, 2).join(" / "));
});

/* ---------------------------------------------------------------- */
await block("Wizard tạo phiên + dialog cài extension", async () => {
  await goto("/dashboard/callSessions");
  await page.getByRole("button", { name: "Cuộc họp mới" }).click();
  await page.waitForTimeout(250);
  ok("dialog tên tiếng Việt", (await count('[role="dialog"][aria-label="Cuộc họp mới"]')) === 1);
  const kinds = await texts('[role="dialog"] [role="radio"]');
  ok(
    "5 loại họp của MeetMate, không còn Interview/Mock",
    kinds.length === 5 && !kinds.join(" ").match(/Interview|Mock/),
    kinds.join(" / ")
  );
  const labels = await texts('[role="dialog"] .field__label');
  ok(
    "nhãn tên cuộc họp ghi rõ không bắt buộc",
    labels.some((l) => l.includes("Tên cuộc họp") && l.includes("Không bắt buộc")),
    labels.join(" / ")
  );
  const opts = await texts('[role="dialog"] select option');
  ok(
    "chọn tài liệu đối chiếu từ thư viện",
    opts.length > 1 && opts[0].startsWith("Không dùng tài liệu"),
    opts.slice(0, 2).join(" / ")
  );
  await page.getByRole("button", { name: "Tiếp" }).click();
  await page.waitForTimeout(250);
  // Switch không có chữ bên trong, nhãn nằm ở aria-label — đọc textContent sẽ
  // nhận về chuỗi rỗng và check "toàn tiếng Việt" sẽ so với "" chứ không với nhãn.
  const switchNames = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"] [role="switch"]')).map(
      (s) => s.getAttribute("aria-label") || (s.textContent || "").trim()
    )
  );
  ok(
    "bước 2: hai switch tiếng Việt",
    switchNames.length === 2 &&
      switchNames.some((s) => s.includes("chat Meet")) &&
      switchNames.some((s) => s.includes("bản ghi")),
    switchNames.join(" / ")
  );
  await page.getByRole("button", { name: "Bắt đầu MeetMate" }).click();
  await page.waitForTimeout(300);
  ok(
    "cổng giữa là dialog cài extension, không phải chọn nền tảng gọi",
    (await count('[role="dialog"][aria-label="Cài MeetMate để bắt đầu ghi"]')) === 1,
    await page.evaluate(() => Array.from(document.querySelectorAll('[role=dialog]')).map((d) => d.getAttribute("aria-label")).join(" / "))
  );
  const checks = await texts('[role="dialog"] [role="checkbox"]');
  ok("3 bước cài có nhãn tiếng Việt", checks.length === 3, checks.length);
  const stillWaiting = await page.getByRole("button", { name: "Còn 3 bước" }).count();
  ok("nút vào phiên khoá cho tới khi đủ 3 bước", stillWaiting === 1);
  await esc();
});

/* ---------------------------------------------------------------- */
await block("Monitor trực tiếp + bốn check research", async () => {
  await goto("/dashboard/callSessions");
  await page.getByRole("button", { name: "Mở lại phiên" }).click();
  await page.waitForTimeout(400);
  ok("overlay phiên trực tiếp", (await count(".ovl")) === 1);
  const heads = await allText(".ovl__panelhead");
  ok("cột trái gọi đúng: Đang nghe", heads.includes("Đang nghe"), heads.slice(0, 60));
  ok("cột phải là Kết quả MeetMate", heads.includes("Kết quả MeetMate"), heads.slice(60, 130));
  const pipeLabels = await texts(".ovl__pipeline *");
  ok(
    "pipeline toàn nhãn Việt",
    pipeLabels.length > 0 && !pipeLabels.join(" ").match(/Listening|Transcribing|Searching|Writing|Posting/),
    [...new Set(pipeLabels)].slice(0, 6).join(" / ")
  );

  // chờ cả ba chủ đề của replay 8x xuất hiện
  const got3 = await until(async () => (await count(".mm-topic")) >= 3, 120_000);
  ok("3 chủ đề được tách trong phiên", got3, String(await count(".mm-topic")));
  const finished = await until(
    async () => (await count(".mm-topic__stage--done, .mm-topic__stage--killed, .mm-topic__stage--off")) >= 3,
    60_000
  );
  ok("các chủ đề đều về trạng thái cuối", finished, await allText(".mm-topic__stage"));

  const posts = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".mm-post")) {
      const card = el.closest(".mm-topic");
      const foot = el.querySelector(".mm-post__foot")?.textContent ?? "";
      const m = foot.match(/(\d+)\/(\d+)/);
      const a = el.querySelector("a.mm-post__url");
      out.push({
        topic: card?.querySelector(".mm-topic__name")?.textContent?.trim() ?? "",
        eyebrow: el.querySelector(".mm-post__eyebrow")?.textContent?.trim() ?? "",
        chars: m ? Number(m[1]) : NaN,
        limit: m ? Number(m[2]) : NaN,
        url: a?.getAttribute("href") ?? "",
        urlText: a?.textContent?.trim() ?? "",
        target: a?.getAttribute("target") ?? "",
        rel: a?.getAttribute("rel") ?? "",
        cancelled: el.classList.contains("mm-post--cancelled"),
        foot: foot.replace(/\s+/g, " ").trim(),
        text: (el.textContent || "").replace(/\s+/g, " "),
      });
    }
    return out;
  });
  ok("monitor vẽ tin chat", posts.length > 0, `${posts.length} tin`);

  // CHECK 1 — ngân sách tin
  ok(
    "CHECK-1: mỗi tin ≤ " + CHAT_MAX + " ký tự",
    posts.every((p) => Number.isFinite(p.chars) && p.chars > 0 && p.chars <= CHAT_MAX),
    posts.filter((p) => !(p.chars <= CHAT_MAX)).map((p) => `${p.chars}`).join(",")
  );
  ok(
    "CHECK-1b: trần in trên mỗi tin là LIMITS, không phải số tự do",
    posts.every((p) => p.limit === CHAT_MAX),
    [...new Set(posts.map((p) => p.limit))].join(",")
  );

  // CHECK 2 — URL nguyên vẹn và thuộc tập nguồn
  const withUrl = posts.filter((p) => p.url);
  ok("tin nguồn có link", withUrl.length > 0, `${withUrl.length}/${posts.length}`);
  ok(
    "CHECK-2: URL của tin ⊆ tập nguồn fixture",
    withUrl.every((p) => SOURCE_URLS.has(p.url)),
    withUrl.filter((p) => !SOURCE_URLS.has(p.url)).map((p) => p.url).join(" | ")
  );
  ok(
    "URL không bị cắt và mở tab mới an toàn",
    withUrl.every(
      (p) => /^https?:\/\/\S+$/.test(p.url) && !p.urlText.endsWith("…") && p.target === "_blank" && p.rel.includes("noreferrer")
    ),
    withUrl.filter((p) => !/^https?:\/\/\S+$/.test(p.url)).map((p) => p.url).join(" | ")
  );
  ok(
    "mỗi nguồn đếm ≤ " + MAX_SOURCES,
    new Map(posts.reduce((m, p) => m.set(p.topic, [...(m.get(p.topic) || []), p.eyebrow]), new Map())).size > 0 &&
      [...new Set(posts.map((p) => p.topic))].every(
        (t) => posts.filter((p) => p.topic === t).length - 1 <= MAX_SOURCES
      ),
    [...new Set(posts.map((p) => p.topic))]
      .map((t) => `${t}:${posts.filter((p) => p.topic === t).length - 1}`)
      .join(" ")
  );

  // CHECK 3 — chuyện phiếm tạo ra 0 tin
  ok(
    "fixture chuyện phiếm có thật (l-10/l-11 chứa cả hai cụm so sánh)",
    SMALL_TALK_TOKENS.every((p) => SMALL_TALK_TEXT.includes(p)),
    SMALL_TALK_TEXT
  );
  const topicNames = [...new Set(posts.map((p) => p.topic))];
  ok(
    "CHECK-3: mọi chủ đề đều là chủ đề có căn cứ, không có chủ đề rỗng",
    topicNames.length === 3 && topicNames.every((t) => TOPIC_NAMES.has(t)),
    `${topicNames.length}: ${topicNames.filter((t) => !TOPIC_NAMES.has(t)).join(" | ")}`
  );
  const answers = await allText(".ovl__answers");
  ok(
    "CHECK-3b: không tin nào nhắc chuyện phiếm",
    !SMALL_TALK_TOKENS.some((w) => answers.toLowerCase().includes(w)),
    SMALL_TALK_TOKENS.filter((w) => answers.toLowerCase().includes(w)).join(",")
  );

  // CHECK 4 — chủ đề B cắt chủ đề A
  const killedCards = await count(".mm-topic__stage--killed");
  const cancelledPosts = posts.filter((p) => p.cancelled);
  ok(
    "CHECK-4: thẻ chủ đề bị ngắt mang nhãn 'đã ngắt'",
    killedCards >= 1,
    String(killedCards)
  );
  ok(
    "CHECK-4b: chủ đề bị ngắt còn tin chưa gửi, ghi rõ lý do",
    cancelledPosts.length > 0 && cancelledPosts.every((p) => p.foot.includes("chủ đề mới đã đến")),
    cancelledPosts.map((p) => p.foot).slice(0, 1).join("")
  );
  ok(
    "CHECK-4c: phần đã gửi của chủ đề bị ngắt vẫn tính là đã gửi",
    cancelledPosts.every((p) => p.chars <= CHAT_MAX) &&
      posts.filter((p) => !p.cancelled).length >= cancelledPosts.length,
    `${posts.filter((p) => !p.cancelled).length} gửi / ${cancelledPosts.length} chưa`
  );
  const foot = await allText(".ovl__footnote");
  const sentCount = Number((foot.match(/(\d+) tin/) || [])[1]);
  ok(
    "chân trang đếm đúng số tin đã vào chat",
    foot.includes("tin đã vào chat Meet") &&
      posts.filter((p) => p.eyebrow.startsWith("MeetMate") && !p.cancelled).length === sentCount,
    `${foot.slice(0, 44)} vs ${posts.filter((p) => !p.cancelled).length}`
  );
});

/* ---------------------------------------------------------------- */
await block("Rời và kết thúc phiên", async () => {
  await goto("/dashboard/callSessions");
  await page.getByRole("button", { name: "Mở lại phiên" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Rời phiên" }).click();
  await page.waitForTimeout(250);
  ok(
    "dialog rời/kết thúc có nhãn Việt",
    (await count('[role="dialog"][aria-label="Rời hoặc kết thúc phiên"]')) === 1
  );
  const radios = await texts('[role="dialog"] [role="radio"]');
  ok(
    "hai lựa chọn: rời phiên hoặc kết thúc phiên",
    radios.length === 2 && radios.some((r) => r.startsWith("Rời phiên")) && radios.some((r) => r.includes("Kết thúc")),
    radios.map((r) => r.slice(0, 24)).join(" / ")
  );
  await page.locator('[role="dialog"] button', { hasText: "Ở lại phiên" }).first().click();
  await page.waitForTimeout(200);
  ok("ở lại giữ phiên đang chạy", (await count(".ovl")) === 1);

  await page.getByRole("button", { name: "Rời phiên" }).click();
  await page.waitForTimeout(200);
  await page
    .getByRole("radio", { name: /Kết thúc phiên/ })
    .click();
  await page.waitForTimeout(120);
  const confirm = page.locator('[role="dialog"] button').filter({ hasText: /Kết thúc phiên|Rời phiên/ }).last();
  await confirm.click();
  await page.waitForTimeout(400);
  const toast = await allText(".toast");
  ok("kết thúc phiên báo bằng toast tiếng Việt", toast.includes("Đã kết thúc phiên"), toast.slice(0, 70));
  ok("overlay biến mất", (await count(".ovl")) === 0);
  ok("cuộc họp vẫn còn trong danh sách", (await count(".session-card")) >= 8);
});

/* ---------------------------------------------------------------- */
await block("Tùy chọn nghiên cứu", async () => {
  await goto("/dashboard/settings");
  await page.getByRole("button", { name: "Mở tùy chọn" }).click();
  await page.waitForTimeout(300);
  const t = await bodyText();
  ok("dialog tùy chọn nghiên cứu", t.includes("Tùy chọn nghiên cứu"));
  const radios = await texts('[role="dialog"] [role="radio"]');
  ok(
    "chọn số nguồn với trần 4 ghi rõ",
    radios.some((r) => r.includes("2 nguồn")) &&
      radios.some((r) => r.includes("4 nguồn")) &&
      radios.some((r) => r.includes("6 nguồn") && r.includes("4 nguồn")),
    radios.join(" / ").slice(0, 90)
  );
  const sw = await texts('[role="dialog"] [role="switch"]');
  ok(
    "ba switch, toàn bộ tiếng Việt",
    sw.length === 3 && sw.every((s) => !/[a-z]{4,}\s[a-z]{4,}/.test(s.replace(/MeetMate|Google Meet/gi, ""))),
    sw.join(" / ")
  );
  await page.getByRole("button", { name: "Mặc định" }).click();
  await page.waitForTimeout(150);
  const chosen = await page.evaluate(() => {
    const r = Array.from(document.querySelectorAll('[role="dialog"] [role="radio"]'));
    return r.find((n) => n.getAttribute("aria-checked") === "true")?.textContent?.trim() ?? "";
  });
  ok("về mặc định chọn lại 4 nguồn", chosen.includes("4 nguồn"), chosen);
  await page.getByRole("button", { name: "Lưu" }).click();
  await page.waitForTimeout(200);
  ok("lưu tùy chọn đóng dialog", (await count('[role="dialog"]')) === 0);
});

/* ---------------------------------------------------------------- */
await block("Trang gói dịch vụ theo bảng IV.3.1", async () => {
  await goto("/dashboard/upgrade");
  const radios = await texts('[role="radio"]');
  ok(
    "4 gói: Free / Pro / Team / Edu / Pilot",
    radios.length >= 4 &&
      radios.some((r) => r.startsWith("Free")) &&
      radios.some((r) => r.startsWith("Pro")) &&
      radios.some((r) => r.startsWith("Team")) &&
      radios.some((r) => r.includes("Edu")),
    radios.slice(0, 4).join(" / ")
  );

  const pick = async (re) => {
    await page.getByRole("radio", { name: re }).click();
    await page.waitForTimeout(250);
    return bodyText();
  };

  let t = await pick(/^Free/);
  ok(
    "Free: 3 phiên, ≤45 phút, 10 lượt kiểm chứng, 1 artifact",
    t.includes("3 phiên") && t.includes("45") && t.includes("10 lượt kiểm chứng") && t.includes("1 artifact"),
    t.slice(0, 50)
  );
  t = await pick(/^Pro/);
  await page.getByRole("radio", { name: "Trả theo tháng" }).click();
  await page.waitForTimeout(250);
  t = await bodyText();
  ok("Pro 199.000đ/tháng khi chọn chu kỳ tháng", t.includes("199.000đ"), "không thấy 199.000đ");
  await page.getByRole("radio", { name: "Trả theo năm" }).click();
  await page.waitForTimeout(250);
  t = await bodyText();
  ok("Pro 1.990.000đ/năm khi chọn chu kỳ năm", t.includes("1.990.000đ"), "không thấy 1.990.000đ");
  const cta = (await texts("button.btn--ink")).join(" / ");
  ok("CTA nói bằng VND và gọi đúng tên gói", /Chọn Pro · [\d.]+đ/.test(cta), cta.slice(0, 60));
  t = await pick(/^Team/);
  ok("Team 179.000đ/người/tháng, tối thiểu 3 người", t.includes("179.000đ") && t.includes("3 người"));
  t = await pick(/^Edu/);
  ok("Edu/Pilot 4.500.000đ/quý, tối đa 15 người", t.includes("4.500.000đ") && t.includes("15 người"));

  await pick(/^Pro/);
  t = await bodyText();
  ok("trang nói thẳng: chưa mở bán", t.includes("chưa mở bán"));
  ok("không có đô la Mỹ trên trang gói", !t.includes("$") && !t.includes("USD"));
  ok("đơn vị tính là phiên/lượt/artifact", t.includes("lượt kiểm chứng") && t.includes("artifact"));
  ok("bảng so sánh đánh dấu gói hiện tại", (await count(".matrix .is-here")) >= 1);
});

/* ---------------------------------------------------------------- */
await block("Trang tài khoản", async () => {
  await goto("/dashboard/profile");
  const tabs = await texts('[role="tab"]');
  ok(
    "3 tab: Tài khoản / Gói hiện tại / Dữ liệu của bạn",
    tabs.length === 3 && tabs.includes("Gói hiện tại") && tabs.includes("Dữ liệu của bạn"),
    tabs.join(" / ")
  );
  ok("nút đổi email có nhãn Việt", (await page.getByRole("button", { name: "Đổi email" }).count()) === 1);
  await goto("/dashboard/profile?tab=plan");
  await page.waitForTimeout(250);
  const sel = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]')).map((n) => n.textContent?.trim())
  );
  ok("deep link ?tab=plan mở đúng tab", sel.includes("Gói hiện tại"), sel.join(" / "));
  const t = await bodyText();
  ok("trang tài khoản không hiện hoá đơn thật", t.includes("dự kiến") || t.includes("chưa mở bán"));
  ok("không có $ trên trang tài khoản", !t.includes("$"));
});

/* ---------------------------------------------------------------- */
await block("Cài đặt: giao diện, ngôn ngữ, dữ liệu", async () => {
  await goto("/dashboard/settings");
  const h2 = await texts("h2");
  ok(
    "4 mục: Hiển thị / Ngôn ngữ / Nghiên cứu / Vùng làm việc",
    h2.includes("Hiển thị") && h2.includes("Ngôn ngữ") && h2.includes("Nghiên cứu") && h2.includes("Vùng làm việc"),
    h2.join(" / ")
  );
  const themeBtns = await texts(".theme-choice button");
  ok("ba tuỳ chọn nền: Sáng / Tối / Hệ thống", ["Sáng", "Tối", "Hệ thống"].every((x) => themeBtns.includes(x)), themeBtns.join(" / "));
  // exact: "Tối" nếu so khớp gần đúng sẽ dính cả nút "Chuyển sang nền tối" trên topbar
  await page.getByRole("button", { name: "Tối", exact: true }).click();
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => localStorage.getItem("meetmate-theme"));
  ok("nền lưu vào meetmate-theme", stored === "dark", String(stored));
  const keys = await page.evaluate(() => Object.keys(localStorage));
  ok("không còn key lưu trữ của sản phẩm cũ", !keys.some((k) => /sidekick|parakeet|cv/i.test(k)), keys.join(" "));
  await page.getByRole("button", { name: "Sáng", exact: true }).click();
  await page.waitForTimeout(150);

  await page.getByRole("button", { name: "Xoá tất cả" }).click();
  await page.waitForTimeout(250);
  const t = await bodyText();
  ok("xoá dữ liệu có dialog xác nhận", t.includes("Xoá toàn bộ cuộc họp?"), t.slice(0, 40));
  const confirmBtn = page.locator('[role="dialog"] button').filter({ hasText: /^Xoá \d+ cuộc họp$/ });
  ok("nút xác nhận nói rõ xoá bao nhiêu", (await confirmBtn.count()) === 1, await allText('[role="dialog"] button'));
  await confirmBtn.click();
  await page.waitForTimeout(400);
  const toast = await allText(".toast");
  ok("xoá xong báo bằng toast tiếng Việt", toast.includes("Đã xoá toàn bộ cuộc họp"), toast.slice(0, 60));
  // dữ liệu sống trong state của DashboardShell, nên phải điều hướng bằng link
  // client-side — goto() sẽ reload, state reset và danh sách tự hồi sinh 8 thẻ.
  await page.getByRole("link", { name: /^Cuộc họp/ }).first().click();
  await page.waitForTimeout(400);
  ok("danh sách trống sau khi xoá", (await count(".session-card")) === 0, String(await count(".session-card")));
  const empty = await allText(".empty-state");
  ok("khu rỗng hướng dẫn người dùng làm gì", empty.length > 0 && empty.length < 400, empty.slice(0, 70));
  ok("tổng ở toolbar về 0", (await allText(".tabbar__total")).startsWith("0"), await allText(".tabbar__total"));
});

/* ---------------------------------------------------------------- */
await block("Giao diện sáng/tối và trang /", async () => {
  await goto("/dashboard/callSessions");
  const toggle = page.locator('button.topbar__theme');
  const label1 = await toggle.getAttribute("aria-label");
  ok("nút đổi nền có nhãn Việt", label1 === "Chuyển sang nền tối" || label1 === "Chuyển sang nền sáng", String(label1));
  await toggle.click();
  await page.waitForTimeout(250);
  const label2 = await toggle.getAttribute("aria-label");
  ok("nhãn đảo thật sau khi bấm", label2 !== label1, `${label1} -> ${label2}`);

  await goto("/");
  const t = await bodyText();
  ok("trang / là phòng họp MeetMate", t.includes("MeetMate") && t.includes("Đang lắng nghe"), t.slice(0, 60));
  for (const b of BANNED_TEXT) ok(`trang / không còn chữ "${b}"`, !t.includes(b));
  ok("một đồng hồ duy nhất", (await count(".meeting-clock")) === 1);
  ok("hai điều khiển thật", (await count(".meeting-control")) === 2);
  ok("dải nguồn âm 2 kênh", (await count(".mmk-src")) === 2);

  // Font đo bằng computed style, không bằng mắt. `--font-ui` khai trên `:root`
  // trong globals.css và trỏ tới `var(--font-bv)` mà next/font gắn lên `<html>`;
  // chỉ cần class biến đó rơi xuống `<body>` là `:root` không còn thấy nó,
  // `--font-ui` thành guaranteed-invalid, và mọi phần tử chỉ kế thừa font — tức
  // cả bản ghi trên `/` — âm thầm vẽ bằng serif của trình duyệt. Font vẫn tải đủ
  // 44 face nên network không báo gì; shot thì mắt thường rất dễ lướt.
  const famOf = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).fontFamily : "MISSING";
    }, sel);
  const famRoom = await famOf("main");
  ok(
    "chữ trên / chạy Be Vietnam Pro, không rơi về serif",
    /Be Vietnam Pro/.test(famRoom) && !/Times|serif$/.test(famRoom.split(",")[0]),
    famRoom.slice(0, 46)
  );
  await goto("/dashboard/callSessions");
  const famDash = await famOf(".dash");
  ok("console cùng một mặt chữ với /", /Be Vietnam Pro/.test(famDash), famDash.slice(0, 46));
});

/* ---------------------------------------------------------------- */
await block("Dọn dẹp: console, request, tên tiếng Anh", async () => {
  for (const path of [
    "/dashboard/callSessions",
    "/dashboard/documents",
    "/dashboard/settings",
    "/dashboard/upgrade",
    "/dashboard/profile",
  ]) {
    await goto(path);
    const t = await bodyText();
    const hits = BANNED_TEXT.filter((b) => t.includes(b));
    ok(`${path}: không còn chữ của IA cũ`, hits.length === 0, hits.join(" / "));
  }

  await goto("/dashboard/callSessions");
  const names = await page.evaluate(() => {
    const sel =
      'a[href], button, input, select, [role="tab"], [role="menuitem"], [role="radio"], [role="switch"], [role="checkbox"], h1, h2';
    return Array.from(document.querySelectorAll(sel)).map((n) => {
      const aria = n.getAttribute("aria-label") || "";
      const label =
        n.tagName === "INPUT" || n.tagName === "SELECT"
          ? (document.querySelector(`label[for="${n.id}"]`)?.textContent ?? "") + " " + (n.getAttribute("placeholder") ?? "")
          : "";
      return `${aria} ${label} ${(n.textContent || "")}`.replace(/\s+/g, " ").trim();
    });
  });
  const offenders = names.filter((n) => {
    const low = n.toLowerCase();
    return ENGLISH_NAMES.some((w) => low.includes(w));
  });
  ok("mọi accessible name là tiếng Việt", offenders.length === 0, offenders.slice(0, 3).join(" || "));

  ok("không có request ≥400", badResponses.length === 0, badResponses.slice(0, 4).join(" | "));
  ok("không có lỗi console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await browser.close();
console.log(
  `\n${passed} passed, ${failures.length} failed` +
    (failures.length ? `\n` + failures.map((f) => `  - ${f}`).join("\n") : "")
);
console.log(failures.length === 0 ? "\nSTAGE 8 SMOKE: XANH" : `\nSTAGE 8 SMOKE: ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
