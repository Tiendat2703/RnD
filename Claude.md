# CLAUDE.md — AI Meeting Sidekick (MVP, frontend-only)

> File này là bản đặc tả kỹ thuật + hướng dẫn setup dành cho **AI coding agent** (Claude Code, Cursor, v.v.) và cho **team dev** dùng chung làm nguồn sự thật (single source of truth) khi build dự án. Đọc kỹ trước khi tạo bất kỳ file code nào.

---

## 1. Bối cảnh & nguồn cảm hứng

Dự án lấy cảm hứng từ **Sidekick** — dự án giành **giải Nhất (First Place)** tại hackathon toàn cầu **AI Tinkerers "Agents Everywhere"** (tài trợ bởi OpenAI, gần 700 dự án dự thi). Sidekick do **Alexander Payne** (chapter Hong Kong) xây dựng, được mô tả là *"an AI meeting teammate that researches questions and creates documents, slides, and spreadsheets while the team talks"* — một đồng đội AI ngồi trong cuộc họp, tự nghiên cứu câu hỏi và tạo tài liệu/slide/spreadsheet ngay trong lúc mọi người đang nói chuyện. Sidekick dùng OpenAI, Exa và Ambiguous AI, và còn thắng thêm giải "Best Use of Ambiguous AI".

**Lưu ý quan trọng:** chúng ta **không** sao chép code hay tài sản của Sidekick (không có repo public chính thức của dự án đó). File này chỉ dùng ý tưởng/concept làm điểm tham chiếu để tự thiết kế lại một MVP tương tự, độc lập, theo cách của team mình.

## 2. Mục tiêu MVP

Xây một **frontend-only demo** (không có backend thật) mô phỏng trải nghiệm "trợ lý AI trong cuộc họp", gồm đúng 2 mảng UI chính:

1. **Giao diện cuộc họp** — lưới người tham gia + panel transcript/chat, giống Zoom/Google Meet.
2. **Popup "AI đang phân tích"** — overlay xuất hiện khi AI được kích hoạt (thủ công hoặc tự động theo mock transcript), hiển thị trạng thái "đang suy nghĩ" rồi trả về kết quả (câu trả lời / tài liệu được tạo / action item).

Toàn bộ "backend" (gọi AI, tạo tài liệu, tìm kiếm...) đều là **mock**: dữ liệu tĩnh + `setTimeout`/Promise giả lập độ trễ, không gọi API thật.

### Trong phạm vi (in-scope)
- Giao diện meeting room (mock video tile, danh sách participant, transcript giả lập chạy dần theo thời gian).
- Nút/trigger "Ask Sidekick" hoặc auto-trigger khi transcript xuất hiện câu hỏi (mock).
- Popup/overlay "AI đang phân tích" có animation, có thể hiện các bước giả lập ("Đang đọc câu hỏi…", "Đang tìm kiếm…", "Đang tổng hợp…").
- Kết quả trả về dạng card: câu trả lời ngắn + CTA giả (ví dụ "Xem tài liệu đã tạo", "Thêm vào slide") — click vào chỉ mở mock data, không có file thật.
- Toàn bộ state chạy client-side, không cần đăng nhập, không cần DB.

### Ngoài phạm vi (out-of-scope, để sau)
- Video/audio call thật (WebRTC, Zoom SDK…).
- Tích hợp AI thật (OpenAI, Exa…).
- Tạo tài liệu/slide/spreadsheet thật (Google Docs/Slides API, Notion…).
- Auth, lưu trữ dữ liệu, real-time đa người dùng (WebSocket).

## 3. Tech stack đề xuất

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Có thể đổi sang Vite + React nếu team muốn nhẹ hơn |
| Styling | Tailwind CSS + shadcn/ui | Tốc độ dựng UI nhanh, dễ tuỳ biến |
| State | React Context hoặc Zustand | Không cần Redux cho scope này |
| Mock backend | Hàm async nội bộ giả lập fetch (`lib/mockApi.ts`), có thể nâng cấp lên MSW (Mock Service Worker) nếu muốn intercept fetch thật | Thiết kế để sau này swap sang API thật chỉ cần đổi implementation, không đổi interface |
| Icon | lucide-react | |
| Animation | Framer Motion | Cho popup "đang phân tích" mượt hơn |
| Package manager | pnpm (hoặc npm nếu team quen hơn) | |

Agent build có thể tự do đề xuất thay thế nếu có lý do rõ ràng, nhưng phải giữ nguyên tắc: **không có backend thật, mọi dữ liệu mock nằm trong `/mocks` hoặc `/lib/mockApi.ts`**.

## 4. Cấu trúc thư mục đề xuất

```
project-root/
├─ CLAUDE.md
├─ README.md
├─ package.json
├─ app/                          # hoặc src/app nếu dùng App Router
│  ├─ layout.tsx
│  ├─ page.tsx                   # trang meeting chính
│  └─ globals.css
├─ components/
│  ├─ meeting/
│  │  ├─ MeetingRoom.tsx         # container chính
│  │  ├─ ParticipantGrid.tsx
│  │  ├─ ParticipantTile.tsx
│  │  ├─ TranscriptPanel.tsx     # transcript giả lập chạy dần
│  │  └─ MeetingControls.tsx     # mic/cam/leave (chỉ UI, không chức năng thật)
│  ├─ ai-sidekick/
│  │  ├─ AskSidekickButton.tsx
│  │  ├─ AIAnalyzingPopup.tsx    # overlay "đang phân tích"
│  │  ├─ AIResultCard.tsx        # kết quả trả về
│  │  └─ AISidekickPanel.tsx     # (tuỳ chọn) panel lịch sử các câu hỏi đã hỏi
│  └─ ui/                        # shadcn components (button, dialog, spinner...)
├─ mocks/
│  ├─ participants.json
│  ├─ transcript.json
│  └─ ai-responses.json
├─ lib/
│  ├─ mockApi.ts                 # toàn bộ hàm giả lập gọi AI
│  ├─ types.ts                   # type/interface dùng chung
│  └─ utils.ts
├─ hooks/
│  ├─ useTranscriptStream.ts     # giả lập transcript chạy theo thời gian
│  └─ useAIAnalysis.ts           # quản lý state: idle → analyzing → result
└─ public/
```

## 5. Data model (types.ts)

```ts
export type Participant = {
  id: string;
  name: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted: boolean;
};

export type TranscriptEntry = {
  id: string;
  speakerId: string;
  text: string;
  timestamp: number; // ms từ lúc bắt đầu mock
};

export type AIAnalysisStatus = "idle" | "analyzing" | "done" | "error";

export type AIAnalysisStep = {
  id: string;
  label: string; // vd: "Đang đọc câu hỏi…"
};

export type AIResult = {
  id: string;
  triggeredBy: string;      // transcript entry id hoặc "manual"
  question: string;
  answer: string;
  artifacts?: {
    type: "document" | "slide" | "spreadsheet";
    title: string;
    url: string; // mock link, không cần trỏ đến file thật
  }[];
};
```

## 6. Mock backend contract (`lib/mockApi.ts`)

Thiết kế các hàm sau như thể chúng đang gọi API thật — sau này chỉ cần thay nội dung bên trong, **không đổi chữ ký hàm**, để phần UI không phải sửa:

```ts
// Giả lập AI phân tích 1 câu hỏi từ transcript, có độ trễ 2-4s
export async function analyzeQuestion(question: string): Promise<AIResult>;

// Giả lập lấy participants ban đầu
export async function getParticipants(): Promise<Participant[]>;

// Giả lập stream transcript (dùng interval, không phải API call thật)
export function subscribeToTranscript(
  onEntry: (entry: TranscriptEntry) => void
): () => void; // trả về hàm unsubscribe
```

`analyzeQuestion` nên trả về kết quả từ `mocks/ai-responses.json` (chọn ngẫu nhiên hoặc theo keyword khớp với câu hỏi), kèm `setTimeout` 2000–4000ms để mô phỏng "AI đang suy nghĩ" một cách thuyết phục.

## 7. Luồng người dùng (User flow)

1. Vào trang → thấy `MeetingRoom`: lưới participant (video tile là ảnh avatar tĩnh + hiệu ứng "đang nói" nhấp nháy viền), `TranscriptPanel` bên phải chạy dần từng dòng transcript mock (dùng `useTranscriptStream`, mỗi dòng xuất hiện cách nhau 2-3s).
2. Có 2 cách kích hoạt AI:
   - **Thủ công**: người dùng bấm nút "Ask Sidekick", nhập/chọn câu hỏi.
   - **Tự động (demo)**: khi transcript xuất hiện 1 dòng chứa dấu `?` hoặc nằm trong danh sách "câu hỏi mẫu" trong `mocks/transcript.json`, tự trigger sau vài giây.
3. Khi trigger → `AIAnalyzingPopup` hiện lên (overlay, có thể là modal góc màn hình hoặc dialog giữa màn hình), hiển thị spinner + text các bước xử lý giả lập, đổi label mỗi ~1s ("Đang đọc câu hỏi…" → "Đang tìm kiếm…" → "Đang tổng hợp…").
4. Sau khi `analyzeQuestion` resolve (2-4s) → popup chuyển thành `AIResultCard`: câu trả lời + (nếu có) nút mở "tài liệu" mock.
5. Người dùng đóng popup (nút X hoặc click ra ngoài) → quay lại theo dõi meeting, có thể xem lại lịch sử câu hỏi trong `AISidekickPanel` (tuỳ chọn, làm sau nếu còn thời gian).

## 8. UI/UX guideline

- Layout tối màu (dark theme) kiểu Zoom/Meet: nền xám đậm/đen, tile video bo góc, avatar tròn.
- Popup "AI đang phân tích" nên có hiệu ứng glow/pulse nhẹ quanh viền hoặc icon để tạo cảm giác "AI đang sống", tránh spinner mặc định nhàm chán.
- Dùng **1 màu accent** xuyên suốt cho mọi thứ liên quan AI (ví dụ tím/xanh cyan) để phân biệt rõ với UI meeting thường.
- Ưu tiên rõ ràng, ít chi tiết thừa — đây là MVP demo, không cần đầy đủ tính năng như Zoom thật.
- Tránh trông giống template AI generic mặc định; xem thêm skill `frontend-design` nếu agent có quyền truy cập để lấy hướng dẫn chi tiết hơn về typography/màu sắc.

## 9. Checklist triển khai cho agent

- [ ] Khởi tạo project (Next.js/Vite + TS + Tailwind + shadcn).
- [ ] Định nghĩa types trong `lib/types.ts`.
- [ ] Tạo mock data: `participants.json`, `transcript.json`, `ai-responses.json`.
- [ ] Viết `lib/mockApi.ts` theo đúng contract ở mục 6.
- [ ] Build `MeetingRoom` + `ParticipantGrid` + `ParticipantTile`.
- [ ] Build `TranscriptPanel` + hook `useTranscriptStream`.
- [ ] Build `AskSidekickButton` + hook `useAIAnalysis` (quản lý state idle/analyzing/done).
- [ ] Build `AIAnalyzingPopup` (có animation từng bước) + `AIResultCard`.
- [ ] Nối trigger tự động từ transcript vào `useAIAnalysis`.
- [ ] Responsive cơ bản (desktop trước, mobile sau nếu còn thời gian).
- [ ] Polish animation (Framer Motion cho popup mở/đóng).
- [ ] Viết `README.md` ngắn cho team (cách chạy local, cách thêm mock data mới).

## 10. Tiêu chí hoàn thành (Definition of Done cho MVP)

- Chạy được `pnpm dev` (hoặc `npm run dev`) và thấy giao diện meeting với transcript tự chạy, không lỗi console.
- Bấm "Ask Sidekick" (hoặc để tự động trigger) → thấy popup "đang phân tích" → sau vài giây thấy kết quả, không cần backend/API key nào.
- Không có bất kỳ network call nào ra ngoài (mọi thứ chạy local/mock) — dễ deploy demo lên Vercel tĩnh.
- Code có type rõ ràng, tách UI khỏi mock data (để sau này nối API thật chỉ sửa `lib/mockApi.ts`).

## 11. Định hướng mở rộng sau MVP (không làm ngay)

- Thay `mockApi.ts` bằng gọi API thật (OpenAI cho phân tích, Exa cho research, tool gọi Google Docs/Slides API để tạo tài liệu thật).
- Video call thật qua WebRTC hoặc SDK bên thứ ba.
- Đồng bộ real-time nhiều người dùng (WebSocket/Pusher).
- Auth + lưu lịch sử meeting.

## 12. Quy ước làm việc nhóm

- Nhánh: `main` (ổn định) — mỗi tính năng làm trên nhánh riêng `feature/ten-tinh-nang`, PR review trước khi merge.
- Commit message ngắn gọn, tiếng Anh hoặc tiếng Việt đều được, miễn nhất quán trong team.
- Mọi mock data đặt trong `/mocks`, **không** hardcode dữ liệu giả trực tiếp trong component.
- Khi giao việc cho AI coding agent, luôn trỏ agent đọc file `CLAUDE.md` này trước tiên để agent bám đúng scope, tránh việc agent tự ý thêm backend/API thật ngoài kế hoạch.