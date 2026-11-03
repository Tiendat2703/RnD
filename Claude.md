# CLAUDE.md — MeetMateAI

Nguồn sự thật cho dev và AI coding agent. Cập nhật 03/11/2026 (Phase 0). Bản cũ mô tả "AI Meeting Sidekick frontend-only" đã bị thay thế hoàn toàn.

## 1. Sản phẩm

MeetMateAI là trợ lý AI trong cuộc họp (dự án RnD to Startup 2026, tài liệu: `RTS2026 - Bản Mô tả - MeetMateAI`). Chu trình: Talk → Understand → Research → Verify → Create. Điểm khác biệt: gán **trạng thái bằng chứng** cho nhận định (Supported / Partially Supported / Contradicted / Insufficient Evidence) và hiểu hội thoại Việt–Anh.

## 2. Quyết định kiến trúc (Phase 0)

Ba nguồn đang mô tả ba kiến trúc khác nhau, nên chia làm hai lớp:

| Lớp | Nội dung | Trạng thái |
|---|---|---|
| **Demo (MVP hiện tại)** | Chrome extension MV3: nghe tab Meet + micro → Blaze STT → tách chủ đề → Exa → viết lý do → gõ vào chat Meet. Khóa API ở `chrome.storage.local`, không backend. Plan: `2026-11-01-meetmate-extension.md` | **Chưa có code** (`extension/` chưa tồn tại) |
| **Web console** | Next.js trong repo này, dữ liệu mẫu. Là "bản mô phỏng giao diện mục tiêu", không phải prototype chạy thật, không đấu nối AI | Có, lint + build xanh |
| **Lớp mục tiêu (roadmap)** | Document pipeline + RAG, Supabase (Postgres, pgvector, Storage, RLS), Context Router, Knowledge Card, Measurement & Logging, evidence status | Chưa có; chỉ được viết là "mục tiêu", không viết ở thì hiện tại |

Ảnh kiến trúc System Architecture (MVP) trong tài liệu vẽ **lớp mục tiêu**; khi dùng trong tài liệu phải ghi nhãn đó.

## 3. Cấu trúc repo

- `app/`, `components/`, `hooks/`, `lib/`, `mocks/`: web console Next.js 16, React 18, TypeScript, không Tailwind. CSS thường (`app/globals.css`, `app/dashboard/dashboard.css`).
- `lib/types.ts`: hợp đồng dữ liệu web ↔ extension (`LIMITS`, `Topic`, `ResearchResult`…). Sửa hằng số ở đây, không sửa ở nơi dùng.
- `lib/mockApi.ts`: chỗ giả lập AI. Chỉ đổi phần bên trong hàm khi nối backend thật, không đổi chữ ký.
- `agents/sidekick/`: code nhập từ dự án hackathon Sidekick (OpenAI/LiveKit/Exa/Ambiguous). Có `package.json` riêng. **Không sửa** trừ khi task nêu rõ; nó chưa dùng Blaze.
- `designs/`, `MEETMATE-DESIGN.md`: hợp đồng thiết kế. `DESIGN.md` chỉ là capture tham khảo từ sản phẩm khác, **không** dùng logo, tên, copy, minh họa hay phông chữ từ đó.
- `2026-11-0x-*.md`: kế hoạch và sổ đối chiếu (extension, conflict register, replatform, consistency checklist).

## 4. Lệnh

```sh
npm ci
npm run dev        # web console
npm run lint       # tsc --noEmit
npm run build
npm run test:e2e   # Playwright (tests/)
```

Trước khi sửa Next.js, đọc `AGENTS.md` và `node_modules/next/dist/docs/` — phiên bản này có breaking changes.

## 5. Quy ước

- Mọi chữ hiển thị cho người dùng bằng **tiếng Việt**. Thương hiệu chỉ là **MeetMate / MeetMateAI**.
- Dữ liệu giả nằm trong `mocks/` hoặc `lib/dashboardData.ts`, không hardcode trong component.
- Web app không bao giờ giữ khóa Blaze/Exa; không có `fetch`/`wss` ra ngoài trong `lib/mockApi.ts` cho đến khi có quyết định backend.
- Không tuyên bố trong UI hoặc tài liệu điều code chưa làm. Số liệu chưa đo gọi là "mục tiêu"/"mô phỏng".
- Nhánh `feature/<tên>`, PR review trước khi merge vào `main`.

## 6. Kiểm tra trước khi nộp

Chạy 9 lệnh grep ở mục 2 của `2026-11-02-consistency-checklist.md`. Trạng thái 03/11/2026: không còn chuỗi hiển thị "Sidekick"/"interview" trong `app components lib`; còn lại là tên thư mục `components/ai-sidekick/`, `AISidekickPanel` và vài comment (việc đổi tên để sau, không ảnh hưởng người dùng).

## 7. Việc tiếp theo

Phase 1: làm tài liệu trung thực. Phase 2: dựng `extension/` theo plan. Phase 3: evidence status. Phase 4: document pipeline + RAG. Chi tiết trong lộ trình đã thống nhất.
