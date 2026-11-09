# Kế hoạch sửa frontend — dashboard thành MeetMateAI web console

File này thực thi [`2026-11-02-frontend-conflict-register.md`](./2026-11-02-frontend-conflict-register.md). Nguyên tắc: **đổi nhãn trước khi dựng lại**, giữ route và CSS, mỗi stage kết thúc bằng app chạy được + suite xanh. Không đụng `agents/sidekick/`, không sửa `.docx`, không sửa `2026-11-01-meetmate-extension.md`.

Quyết định nền (đã chốt): dashboard **là form giao diện chính để phát triển tiếp**, nhưng nó **không phải prototype của bản demo**. Bản demo là tiện ích Chrome. Web console được trình bày trong `III.3.3` với tư cách *"bản mô phỏng giao diện mục tiêu, dữ liệu mẫu, không đấu nối luồng AI"*.

---

## 1. Khung đích (IA)

Giữ slug route để không phá redirect (`app/dashboard/page.tsx`), không phá 62 shot và không tạo công việc vô ích.

```
TRỢ LÝ CUỘC HỌP
  Cuộc họp            /dashboard/callSessions     (slug giữ nguyên, label đổi)
  Tài liệu            /dashboard/documents        (label đổi + note "lớp mục tiêu")
TÀI KHOẢN (user menu)
  Tài khoản           /dashboard/profile
  Cấu hình            /dashboard/settings
XÓA: Resumes (/dashboard/cv) · Mock Interview · Resume Maker · Headshots · Create session · Support chat · Credit options · Notifications/Alt+T
```

`components/dashboard/DashboardShell.tsx:64-87` thay bằng:

```ts
const NAV_GROUPS: {
  label: string;
  items: { label: string; icon: typeof IconFile; href?: string; count?: boolean }[];
}[] = [
  {
    label: "Trợ lý cuộc họp",
    items: [
      { label: "Cuộc họp", icon: IconTranscript, href: "/dashboard/callSessions", count: true },
      { label: "Tài liệu", icon: IconFolder, href: "/dashboard/documents" },
    ],
  },
];
```

`TITLES` (`:91-103`) thay bằng:

```ts
const TITLES: Record<string, { title: string; note: string }> = {
  "/dashboard/callSessions": { title: "Cuộc họp", note: "Mọi cuộc họp MeetMate đã nghe và số nguồn đã gửi vào chat Meet." },
  "/dashboard/documents": { title: "Tài liệu", note: "Tài liệu để đối chiếu trong cuộc họp. Lớp mục tiêu — chưa đấu nối với luồng AI." },
  "/dashboard/settings": { title: "Cấu hình", note: "Hồ sơ, giao diện và dữ liệu của workspace này." },
  "/dashboard/profile": { title: "Tài khoản", note: "Thông tin tài khoản, gói dùng và những gì MeetMate lưu." },
};
// fallback (:351): { title: "MeetMate", note: "Workspace trợ lý cuộc họp." }
```

`NOTIFICATIONS` (`:105-118`) — bỏ chuông hoặc thay bằng dữ liệu trung thực:

```ts
const NOTIFICATIONS = [
  { id: "n1", icon: IconTranscript, text: "Cuộc họp “Bảng giá gói SME” đã có 4 nguồn kèm lý do.", time: "2 giờ trước" },
  { id: "n2", icon: IconCheck, text: "MeetMate chuyển chủ đề sang “Kênh phân phối B2B”.", time: "Hôm qua" },
];
```

## 2. Hợp đồng dữ liệu dùng chung web ↔ extension

`lib/types.ts` **xóa**: `Participant`, `AIArtifact`, `AIResult`, `AIAnalysisStep`, `speakerId`, `intent`. **Thêm** (khớp `Topic/TopicDecision/ResearchResult` trong `2026-11-01-meetmate-extension.md` Task 5–6 và `Source{title,url,text}` ở `agents/sidekick/shared/types.ts:17`):

```ts
export const LIMITS = {
  windowMs: 120_000, duplicateMs: 5_000, topicCheckEvery: 3, topicMinGapMs: 15_000,
  sampleRate: 16_000, frameSamples: 1_600, maxSources: 4,
  summaryMaxChars: 300, reasonMaxChars: 200, chatMaxChars: 450, chatGapMs: 600,
  prefix: "MeetMate: ",
} as const;

export type AudioSource = "tab" | "mic";                     // không có "người nói"
export type MeetingKind = "san-pham" | "nghien-cuu" | "dao-tao" | "ban-le" | "khac";
export type MeetingStatus = "live" | "ready" | "ended";

export interface MeetingLine { id: string; text: string; atMs: number; source: AudioSource }
export interface Topic { topic: string; keywords: string[]; query: string }        // keywords ≤ 8
export interface ResearchSource { title: string; url: string; reason: string }      // reason ≤ 200
export interface ResearchResult { topic: string; summary: string; sources: ResearchSource[] } // summary ≤ 300
export interface PostedMessage { text: string; chars: number }                      // chars ≤ 450
export interface MeetingRecord {
  id: string; title: string; kind: MeetingKind; startedAt: string; durationSec: number;
  topicCount: number; sourceCount: number; status: MeetingStatus;
}
export type PipelineStage = "listening" | "transcribing" | "topic" | "searching" | "writing" | "posting";
export type Degraded = "no-keys" | "no-mic" | "blaze-credits" | "chat-unreachable";
```

Hàm định dạng **phải dùng chung một chỗ** để web và extension không bao giờ lệch giới hạn (`lib/formatChat.ts`, extension Task 6 import cùng logic):

```ts
export function toChatMessages(r: ResearchResult): string[] {
  const out = [`${LIMITS.prefix}Chủ đề: ${r.topic}\n${clip(r.summary, LIMITS.summaryMaxChars)}`];
  r.sources.forEach((s, i) =>
    out.push(`${LIMITS.prefix}[${i + 1}/${r.sources.length}] ${s.title}\n${s.url}\nVì sao chọn: ${clip(s.reason, LIMITS.reasonMaxChars)}`));
  return out.map((t) => clipKeepUrl(t, LIMITS.chatMaxChars));   // URL không bao giờ bị cắt
}
```

## 3. Fixture mới (thay toàn bộ `mocks/`)

`mocks/meeting-transcript.json` — họp **về một chủ đề thật**, không có ai tên, không nhắc đến demo, 12 dòng ~1 câu/dòng:

```json
[
  { "id": "l-01", "text": "Mình cần chốt giá gói cho khách SME trước cuối tuần này.", "atMs": 14000, "source": "tab" },
  { "id": "l-02", "text": "Thị trường Việt Nam mình đang thấy phổ biến từ 300.000 đến 800.000 đồng mỗi tháng.", "atMs": 21000, "source": "tab" },
  { "id": "l-03", "text": "Khoảng đó có vẻ hợp lý với năng lực chi trả của nhóm dưới 20 nhân viên.", "atMs": 30000, "source": "mic" },
  { "id": "l-04", "text": "Nhưng mình chưa có số liệu công khai nào để đối chiếu.", "atMs": 38000, "source": "tab" },
  { "id": "l-05", "text": "Hay là tìm xem mấy sản phẩm cùng phân khúc đang niêm yết bao nhiêu.", "atMs": 45000, "source": "tab" },
  { "id": "l-06", "text": "Ừ, ưu tiên nguồn có bảng giá rõ ràng và cập nhật trong năm nay.", "atMs": 53000, "source": "mic" },
  { "id": "l-07", "text": "Có điều khách mình mua theo năm, nên giá theo tháng sẽ khó so.", "atMs": 61000, "source": "tab" },
  { "id": "l-08", "text": "Mình tính thử mô hình freemium xem sao, cho dùng miễn phí ba tính năng.", "atMs": 120000, "source": "tab" },
  { "id": "l-09", "text": "Freemium thì tỷ lệ chuyển đổi trung bình ngành mình cũng nên tra cứu.", "atMs": 128000, "source": "mic" },
  { "id": "l-10", "text": "À tối nay đá chung kết nhé, mấy đứa xem không?", "atMs": 180000, "source": "tab" },
  { "id": "l-11", "text": "Xem chứ, đặt phòng chiếu luôn.", "atMs": 186000, "source": "tab" },
  { "id": "l-12", "text": "Quay lại chuyện kênh phân phối, mình bán qua đại lý hay bán trực tiếp?", "atMs": 240000, "source": "tab" }
]
```

`mocks/meetmate-output.json` — mô phỏng đúng ba hành vi có thật trong `session.ts`: (a) chủ đề A đang gửi thì chủ đề B tới → phần tử đang chờ của A bị **hủy**, (b) mỗi tin ≤ 450 ký tự, (c) đoạn nói chuyện phiếm (`l-10`, `l-11`) → **không sinh tin nào**:

```json
{
  "atMs": 68000,
  "events": [
    { "kind": "topic", "topic": { "topic": "Bảng giá gói SME Việt Nam", "keywords": ["SME", "giá", "gói", "VND", "thị trường"], "query": "bảng giá phần mềm cho SME Việt Nam 2026" } },
    { "kind": "posted", "message": "MeetMate: Chủ đề: Bảng giá gói SME Việt Nam\nThị trường SaaS Việt Nam dưới 20 nhân viên phổ biến ở khoảng 300.000–800.000 đồng mỗi tháng; các gói niêm yết công khai thường quy theo năm." },
    { "kind": "posted", "message": "MeetMate: [1/4] Bảng giá — Base.vn\nhttps://example.com/base/bang-gia\nVì sao chọn: Niêm yết công khai theo người dùng/tháng và có bậc SME." },
    { "kind": "posted", "message": "MeetMate: [2/4] Bảng giá — Misa amis\nhttps://example.com/misa/bang-gia\nVì sao chọn: Gói khởi tạo cho doanh nghiệp nhỏ, ghi rõ số user và thời hạn." },
    { "kind": "cancelled", "pending": "MeetMate: [3/4] …", "reason": "Chủ đề đổi sang “Tỷ lệ chuyển đổi freemium” trước khi tin này gửi." },
    { "kind": "topic", "topic": { "topic": "Tỷ lệ chuyển đổi freemium", "keywords": ["freemium", "chuyển đổi"], "query": "freemium to paid conversion rate benchmark 2026" } },
    { "kind": "posted", "message": "MeetMate: Chủ đề: Tỷ lệ chuyển đổi freemium\nMặt bằng chuyển đổi freemium sang trả phí thường ở khoảng 2–5%, phụ thuộc vào độ sâu của bậc miễn phí." },
    { "kind": "idle", "from": 180000, "to": 190000, "posted": 0, "note": "l-10 và l-11 là chuyện phiếm → chủ đề rỗng → không gửi gì." }
  ]
}
```

`mocks/ai-responses.json` → **xóa**. `mocks/participants.json` → **xóa**.

## 4. Surface mới cho kết quả research (Stage 2, giá trị cao nhất)

`components/ai-sidekick/AIResultCard.tsx` bỏ `return null`, nhận `ResearchResult`:

```tsx
type Props = { result: ResearchResult; sent: boolean };
```

Render: eyebrow `Chủ đề đang bàn` → `topic`; đoạn `summary`; mỗi nguồn một dòng: `[i/n]` + `title` (từ **kết quả Exa**, không phải từ model) + `url` dạng `target="_blank" rel="noopener"` + `Vì sao chọn: reason`. Chân thẻ: `Mọi đường dẫn đều nằm trong kết quả tìm nguồn · Tin gửi vào chat dài tối đa 450 ký tự, cách nhau 600 ms`.

`AISidekickPanel` → dòng thời gian chủ đề (`Topic[]` + số nguồn + trạng thái `posted|cancelled`). `AIAnalyzingPopup` → 6 `PipelineStage`. `AskSidekickButton` → **xóa** (không có luồng hỏi thủ công).

Bốn trạng thái suy giảm (`components/ai-sidekick/StatusBar.tsx`, dựng mới) — text lấy nguyên văn từ plan extension:

| `Degraded` | Chuỗi hiển thị | Nguồn |
|---|---|---|
| `no-keys` | Thiếu khóa Blaze hoặc Exa | Task 2 Step 3 |
| `no-mic` | Không dùng được micro — chỉ nghe âm thanh từ người khác | Task 3 Step 5 |
| `blaze-credits` | Blaze STT: Insufficient credits | Task 4 Step 1 |
| `chat-unreachable` | Không gửi được vào chat Meet | Task 8 |

## 5. Các stage

| # | Stage | File chạm tới | Kết quả kiểm tra được | Size |
|---|---|---|---|---|
| 0 | **Thương hiệu + điều hướng**: `Sidekick`→`MeetMate` ở 2 metadata, wordmark, fallback title; `package.json`; `localStorage` key; `NAV_GROUPS`/`TITLES`/`NOTIFICATIONS` mới; **xóa nhóm Prepare + Resumes + Create session + Support chat + bell** | `app/layout.tsx`, `app/dashboard/layout.tsx`, `package.json`, `DashboardShell.tsx:64-118,351,413-483`, `NewSessionButton.tsx` (xóa), `UserMenu.tsx` | `npx tsc --noEmit` 0 lỗi; sidebar tiếng Việt, không còn Mock/Resume/Headshots/Resumes; `curl -s localhost:3000/dashboard \| grep -c Sidekick` = 0 | S |
| 1 | **Model + fixture**: `lib/types.ts` mới (§2), `lib/dashboardData.ts` bỏ `who`/`SessionType`/`CvFile`/`ANSWER_LIBRARY`/`composeAnswer`/`buildNotes`/`askAiReply`/`SESSION_OPENERS`/`seedTranscript`; `mocks/` (§3) | `lib/types.ts`, `lib/dashboardData.ts`, `mocks/*`, `lib/mockApi.ts` (xóa `getParticipants`, thay `analyzeQuestion` bằng `getResearchResult()`) | `LIMITS` grep khớp `2026-11-01-meetmate-extension.md`; fixture JSON parse được | M |
| 2 | **Surface research**: `AIResultCard`/`AISidekickPanel`/`AIAnalyzingPopup` dựng thật, `StatusBar` mới, `lib/formatChat.ts`; `SessionDetailPanel` tabs → Bản ghi / Nguồn / Chi tiết; `LiveOverlay` → `MeetingMonitor` | `components/ai-sidekick/*`, `lib/formatChat.ts`, `SessionDetailPanel.tsx:33-35,152-158,168-179,234-239,283-325`, `LiveOverlay.tsx:38-52,92,111-119,131-132,171-172,197-198,408-446` | Mở `/` và card: mỗi tin ≤ 450 ký tự, link mở tab mới, `grep -c "Vì sao chọn"` = số nguồn, small-talk không sinh tin | L |
| 3 | **Xóa Resumes & Prepare**: file + route + `--cv-*` tokens + `.cv-*`/`.drop-hint` rules + field "Attach CV" + shot `08-cv` + check `/dashboard/cv` | `CvLibrary.tsx`, `app/dashboard/cv/page.tsx`, `dashboard.css:38-39,65-66,147-148,1067-1135`, `CreateSessionWizard.tsx:246`, `scripts/dash-{smoke,shots}.mjs`, `scripts/probe-net.mjs` | `/dashboard/cv` → 404; suite xanh; `grep -rn "CvFile\|initialCvs\|cv-card" app components lib` = 0 | S |
| 4 | **Wizard/Connect/Prefs về đúng domain**: wizard = "Cuộc họp mới" (tên, loại, note "Bật MeetMate trong tab Meet để ghi"); connect → dialog 3 bước cài tiện ích; prefs → "Tùy chọn nghiên cứu" (số nguồn 2/4/6, ngôn ngữ truy vấn, tự động gửi, bỏ qua khi chủ đề rỗng); **xóa STAR/filler/format/length/tone** | `CreateSessionWizard.tsx` (207-241,324-351,434-439), `ConnectSessionDialog.tsx:28-51,119-214`, `AnswerPreferencesDialog.tsx:28-137`, `DashboardContext.tsx:10-45` | Wizard không còn field job/company/JD; dialog "Cài MeetMate" render 3 bước; prefs không còn "STAR" | M |
| 5 | **Pricing & account**: `PRICING` theo phút họp + số nguồn (bỏ resume/headshot/DEAL50/payment brands); bỏ `spendCredits` trong `rejoinLive`; **xóa** `SupportWidget`, `ReviewPrompt`, `CreditMenu`, `INVOICES` + billing tab, `PRIVACY_ROWS` → khối "Dữ liệu của bạn" khớp `III.2.8`; `ACCOUNT` hết "Job hunt"; `LANGUAGES`→`["Tiếng Việt"]`; `MODELS`→Blaze | `dashboardData.ts:320-326,41,583-685`, `UpgradeDialog.tsx`, `ProfilePanel.tsx:89-182`, `SupportWidget.tsx`, `ReviewPrompt.tsx`, `CreditMenu.tsx`, `DashboardShell.tsx:220-291`, `CreditMenu.tsx` | Card "Còn lại {n} cuộc họp"; không còn "0.5 Credit = 1 headshot"; dialog ghi "Gói dịch vụ dự kiến — chưa mở bán" | M |
| 6 | **Dịch + phông tiếng Việt** *(chỉ phần xuất hiện trong ảnh chụp nếu gấp)*: ~818 chuỗi; `subsets:["latin","vietnamese"]` cho `Chakra_Petch`/`JetBrains_Mono`/`Caveat`; `Intl` → `vi-VN`; bỏ `toUpperCase()` eyebrow (`dashboardData.ts:206-215`) + `text-transform` ở `globals.css:220-254` | toàn bộ `components/dashboard/*.tsx`, `app/dashboard/layout.tsx:12-29`, `app/globals.css` | `grep -rn "[A-Za-z] {3,}" ` trên các label đã đổi = 0; heading "Bảng giá" hiển thị đúng dấu | L |
| 7 | **Trang `/` về đúng MeetMate**: bỏ camera/mic/leave/rejoin + 2 nút chết; bỏ `ParticipantGrid/Tile` (thay bằng dải nguồn âm); caption không tên người; "Đang ghi bản họp"→"Đang lắng nghe"; bỏ "Bảo mật"/"Kết nối tốt"; badge `01/06`→số chủ đề đã phát hiện; tab "Ghi chú <span>0</span>"→"Nguồn"; refactor `TranscriptPanel.tsx:115-116`; một đồng hồ duy nhất | `MeetingRoom.tsx:38-42,60-104,118-129`, `MeetingControls.tsx:39-49`, `ParticipantGrid.tsx`, `ParticipantTile.tsx`, `TranscriptPanel.tsx:17-22,57-59,62-66,101-137,156-164`, `useTranscriptStream.ts:6-8,20-22,28-34`, `lib/types.ts:3-9`, `mocks/transcript.json`, `app/globals.css:189-340` | Transcript vẫn render **đủ 12 dòng khi không có roster**; không còn chữ "Sidekick"/"Product weekly"; `tsc` 0 lỗi | M |
| 8 | **Bộ kiểm chứng**: mọi accessible name theo tiếng Việt; xóa check `Interview`/`08-cv`/`/dashboard/cv`/`Rate Sidekick`/`Upgrade`/`Send feedback`; thêm 4 check mới (mỗi tin ≤ 450 · URL ⊆ tập nguồn · small-talk = 0 tin · chủ đề B cắt chủ đề A) | `scripts/dash-smoke.mjs:22-96,135`, `scripts/dash-shots.mjs:47`, `scripts/dash-shots2.mjs`, `scripts/probe-net.mjs:11`, `tests/meeting-layout.spec.ts:3-14,64,71-80` | 51 checks chạy lại và **xanh với tên tiếng Việt**; 62 shot render; `playwright test` xanh | M |

**Thứ tự phụ thuộc:** 0 → 1 → (2 ∥ 3) → 4 → 5 → 7 → 6 → 8, trong đó 8 được cập nhật **trong từng stage** chứ không dồn cuối (nếu dồn, từ stage 0 suite đã đỏ và mất ý nghĩa kiểm chứng).

## 6. Chính sách trung thực cho UI (thay 9 toast `Demo only —`)

Một nút chỉ được tồn tại nếu **(a) chạy thật ở client**, hoặc **(b)** có nhãn "dự kiến / minh họa" ngay trong label hoặc tooltip. Cụ thể:

| Hành vi hiện tại | Quyết định |
|---|---|
| 5 sao "How did Sidekick do on this call" | **XÓA** (không có khái niệm chấm điểm câu trả lời) |
| `spendCredits(0.5)` khi rejoin | **XÓA** |
| "Upgrade" / pricing dialog | **GIỮ** 1 tab, title "Gói dịch vụ (dự kiến)", toast "Gói này chưa mở bán." |
| Upload CV / "Parsing…" / `Attach CV` | **XÓA** |
| Add document → "Document added to your library." | **GIỮ**, tooltip "Lớp mục tiêu: MeetMate chưa truy xuất tài liệu này." |
| Auto Answer | **ĐỔI** → "Tự động gửi vào chat" |
| Support ticket, review prompt, export email, delete account, sign-out, desktop app, tutorials | **XÓA** |
| Connect 5 nền tảng + 3 cách nghe | **ĐỔI** thành 3 bước cài MeetMate (Load unpacked → tab Meet → nhập khóa, Bắt đầu) |
| Notifications + Alt+T | **XÓA** |

## 7. Đường cắt đề xuất (hôm nay là 02/11, extension chưa có dòng code nào)

Làm **Stage 0 → 5 + Stage 7 + Stage 8**, và **Stage 6 chỉ áp cho những gì xuất hiện trong ảnh chụp**: sidebar, topbar, danh sách cuộc họp, card kết quả research, detail panel, dialog Cài MeetMate. Phần còn lại của Stage 6 và mọi surface thương mại chi tiết → mục **V.4** của bản mô tả. Lý do: (1) các phần đó đã bị mục 5 khuyến nghị **xóa** nên không cần dịch; (2) ảnh chụp cho III.3.3 chỉ cần các khung bị cắt; (3) ưu tiên tuyệt đối vẫn là Task 1–8 của extension.

## 8. Không được làm

Không thêm ô nhập API key vào web (`SettingsPanel`) — khóa demo nằm ở `chrome.storage.local` của popup; một ô key trong web app sẽ tạo đúng câu hỏi "key này gửi đi đâu". Không `fetch`/`wss` thật từ web. Không đụng `agents/sidekick/`. Không dựng lại `components/ui/`. Không đổi slug route. Không sửa `.docx` bằng script. Không đổi tên hàng loạt class CSS (`.cv-*` bị xóa thì xóa hẳn, các class khác giữ).
