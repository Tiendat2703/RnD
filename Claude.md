# CLAUDE.md — MeetMateAI

Nguồn sự thật cho dev và AI coding agent. Cập nhật 03/11/2026 (Phase 0). Bản cũ mô tả "AI Meeting Sidekick frontend-only" đã bị thay thế hoàn toàn.

## 1. Sản phẩm

MeetMateAI là trợ lý AI trong cuộc họp (dự án RnD to Startup 2026, tài liệu: `RTS2026 - Bản Mô tả - MeetMateAI`). Chu trình: Talk → Understand → Research → Verify → Create. Điểm khác biệt: gán **trạng thái bằng chứng** cho nhận định (Supported / Partially Supported / Contradicted / Insufficient Evidence) và hiểu hội thoại Việt–Anh.

## 2. Quyết định kiến trúc (Phase 0)

Ba nguồn đang mô tả ba kiến trúc khác nhau, nên chia làm hai lớp:

| Lớp | Nội dung | Trạng thái |
|---|---|---|
| **Demo (MVP hiện tại)** | Chrome extension MV3: nghe tab Meet + micro → Blaze STT → tách chủ đề → Exa → viết lý do → gõ vào chat Meet. Khóa API ở `chrome.storage.local`, không backend. Plan: `docs/plans/2026-11-01-meetmate-extension.md` | Code nằm ở `agents/sidekick/extension/`, build bằng `npm run extension:build` (ở `agents/sidekick`). Đã có unit test, **chưa chạy thử trên cuộc họp Meet thật** |
| **Web console** | Next.js trong repo này, dữ liệu mẫu. Là "bản mô phỏng giao diện mục tiêu", không phải prototype chạy thật, không đấu nối AI | Có, lint + build xanh |
| **Lớp mục tiêu (roadmap)** | Document pipeline + RAG, Supabase (Postgres, pgvector, Storage, RLS), Context Router, Knowledge Card, Measurement & Logging, evidence status | Chưa có; chỉ được viết là "mục tiêu", không viết ở thì hiện tại |

Ảnh kiến trúc System Architecture (MVP) trong tài liệu vẽ **lớp mục tiêu**; khi dùng trong tài liệu phải ghi nhãn đó.

## 2b. Luồng web ↔ extension

Cầu nối duy nhất là `window.postMessage` tới content script `agents/sidekick/extension/src/bridge.ts` (chạy trên `localhost`). Giao thức nằm ở `lib/bridgeProtocol.ts`, **web và extension import cùng một file**. Không khóa API nào đi qua cầu nối.

1. Wizard "Cuộc họp mới" → `InstallExtensionDialog`: ping extension, ba dấu tích do extension trả lời (đã cài, đã có khóa, có tab Meet).
2. "Gửi phiên cho MeetMate" → extension nhận `session.prepare`. Chrome chỉ cho ghi âm tab sau khi người dùng bấm biểu tượng extension, nên bước **Bắt đầu** phải bấm trong popup ở tab Meet.
3. Extension báo `status: Đang chạy` → hộp thoại tự đóng, **không** mở màn hình toàn trang. Theo dõi trực tiếp nằm ở **panel MeetMate ngay trong trang Meet** (`extension/src/content/panel.ts`: trạng thái, vài dòng transcript, chủ đề, nguồn, nút Dừng). Web chỉ hiện thẻ "Đang diễn ra"; "Mở lại phiên" mở `MeetingMonitor` như một góc nhìn phụ, vẫn nhận cùng sự kiện.
4. Kết thúc: từ web (`session.stop`), từ panel/popup (Dừng), khi bấm "Rời cuộc gọi"/tab Meet điều hướng đi/đóng tab (`ended`, lý do `left`/`meet-closed`). Meet **không** tải lại trang khi rời cuộc gọi (chỉ đổi nội dung thành "Bạn đã rời khỏi cuộc họp"), nên content script canh hai tín hiệu: bấm nút theo nhãn chữ, và một đoạn chữ ngắn đứng riêng đúng câu của màn hình đó (`content/leave.ts`). Khi họp kết thúc (`left`/`meet-closed`, không phải Dừng nghe), extension **tự chuyển hướng tab Meet** tới `<origin web>/dashboard/callSessions` (origin lấy từ tab web đã bắt tay, mặc định `http://localhost:3000`); tab Meet đã đóng thì dùng/mở tab web. Panel hiện "Phiên đã kết thúc và được lưu".
5. **Lưu phiên:** extension là nơi lưu (`extension/src/sessionStore.ts`, `chrome.storage.local`, tối đa 50 phiên): transcript, chủ đề, kết quả tìm nguồn, số tin đã vào chat. Web hỏi `sessions.list` mỗi lần mở và mỗi khi một phiên kết thúc rồi gộp vào danh sách cuộc họp, nên phiên diễn ra lúc web đóng hoặc sau khi tải lại trang vẫn còn. Xóa cuộc họp trên web gửi `sessions.delete`. Tab "Nguồn" trong chi tiết dùng chủ đề/nguồn thật của phiên; cuộc họp mẫu có sẵn vẫn dùng dữ liệu mẫu.

**Giao diện extension** tuân `docs/design/MEETMATE-DESIGN.md` (không phải `DESIGN.md`): token và thành phần dùng chung ở `extension/src/ui/theme.css` (popup theo prefers-color-scheme, panel luôn tối), ba họ phông đóng gói trong `extension/static/fonts/` (không gọi Google Fonts), hàng 6 bước ở `ui/stages.ts`, phân loại dải vàng/đỏ ở `ui/status.ts`. Popup là khung cố định 360×520. Panel vẽ nguồn bằng `toChatPosts` của web nên không lệch tin thật. Cố ý **không có icon/logo**: hợp đồng cấm tự vẽ.

**Knowledge Card (giao diện mục tiêu, dữ liệu mẫu).** Kiểu dữ liệu ở `lib/evidence.ts` (dùng chung web + extension), kịch bản `mocks/meeting-claims.json` (ví dụ mục III.3.2 của bản mô tả), kho tài liệu `mocks/kb.json`, API giả `lib/mockApi.ts`. Extension ở chế độ thử phát thẻ qua sự kiện `card`; web hiển thị ở tab Nhận định / Bối cảnh / Artifact của chi tiết cuộc họp và trang Tài liệu; mọi nơi gắn nhãn "Dữ liệu mẫu". Bảng nối backend: `docs/plans/2026-11-04-prototype-gap-plan.md`. Ảnh chụp: `docs/screenshots/` (`node scripts/prototype-shots.mjs`). Bốn trạng thái bằng chứng phân biệt bằng biểu tượng + độ đặc nền + kiểu viền, không thêm màu (xem `docs/design/MEETMATE-DESIGN.md`).

Nút "Chạy thử với dữ liệu mẫu" vẫn có và được gắn nhãn "dữ liệu mẫu" trên monitor.

## 3. Cấu trúc repo

- `app/`, `components/`, `hooks/`, `lib/`, `mocks/`: web console Next.js 16, React 18, TypeScript, không Tailwind. CSS thường (`app/globals.css`, `app/dashboard/dashboard.css`).
- `lib/types.ts`: hợp đồng dữ liệu web ↔ extension (`LIMITS`, `Topic`, `ResearchResult`…). Sửa hằng số ở đây, không sửa ở nơi dùng.
- `lib/mockApi.ts`: chỗ giả lập AI. Chỉ đổi phần bên trong hàm khi nối backend thật, không đổi chữ ký.
- `agents/sidekick/`: code nhập từ dự án hackathon Sidekick (OpenAI/LiveKit/Exa/Ambiguous). Có `package.json` riêng. Phần `extension/` là code MeetMate (dùng lại `ExaProvider` và vitest ở đây); phần còn lại của package là Sidekick gốc, không sửa trừ khi task nêu rõ.
- `docs/design/DESIGN-SUBSCRIPTION.md`: hợp đồng riêng cho trang Gói dịch vụ (`/dashboard/upgrade`, `components/dashboard/UpgradePanel.tsx`). Học **cơ chế bố cục** của một trang giá khác (hạn mức, công tắc kỳ hạn, thẻ gói, bảng so sánh, FAQ), không lấy tên/chữ/phông/màu/biểu tượng của họ. Giá là giả thuyết "Dự kiến", nút chọn gói chỉ báo toast demo. Ảnh chụp: `node scripts/subscription-shots.mjs` → `docs/screenshots/subscription/`.
- `docs/design/` (kèm `docs/design/mockups/`): hợp đồng thiết kế. `DESIGN.md` chỉ là capture tham khảo từ sản phẩm khác, **không** dùng logo, tên, copy, minh họa hay phông chữ từ đó.
- `2026-11-0x-*.md`: kế hoạch và sổ đối chiếu (extension, conflict register, replatform, consistency checklist).

> **Trang `/` đã bị xóa (04/11/2026).** Nó là một "phòng họp" giả lập từ giai đoạn frontend-only và không có trong bản mô tả RTS2026 (tài liệu chỉ nói panel Knowledge Card của extension trong Meet và Web app quản lý tài liệu + lịch sử phiên). `/` giờ chuyển sang `/dashboard/callSessions`. Cùng bị xóa: `components/meeting/`, `components/ai-sidekick/`, `hooks/useMeetMateSession.ts`, `tests/` (test e2e của trang đó), `scripts/stage7-gate.mjs`. Script `dash-smoke.mjs`/`dash-shots.mjs` vẫn dùng được (`npm run dev` rồi `node scripts/dash-smoke.mjs`).

## 4. Lệnh

```sh
npm ci
npm run dev        # web console
npm run lint       # tsc --noEmit
npm run build
```

Trước khi sửa Next.js, đọc `AGENTS.md` và `node_modules/next/dist/docs/` — phiên bản này có breaking changes.

## 5. Quy ước

- Mọi chữ hiển thị cho người dùng bằng **tiếng Việt**. Thương hiệu chỉ là **MeetMate / MeetMateAI**.
- Dữ liệu giả nằm trong `mocks/` hoặc `lib/dashboardData.ts`, không hardcode trong component.
- Web app không bao giờ giữ khóa Blaze/Exa; không có `fetch`/`wss` ra ngoài trong `lib/mockApi.ts` cho đến khi có quyết định backend.
- Không tuyên bố trong UI hoặc tài liệu điều code chưa làm. Số liệu chưa đo gọi là "mục tiêu"/"mô phỏng".
- Nhánh `feature/<tên>`, PR review trước khi merge vào `main`.

## 6. Kiểm tra trước khi nộp

Chạy 9 lệnh grep ở mục 2 của `docs/plans/2026-11-02-consistency-checklist.md`. Trạng thái 04/11/2026: không còn chuỗi hiển thị "Sidekick"/"interview" trong `app components lib`; thư mục `components/ai-sidekick/` đã bị xóa cùng trang `/` cũ.

## 7. Việc tiếp theo

Phase 1: làm tài liệu trung thực. Phase 2: dựng `extension/` theo plan. Phase 3: evidence status. Phase 4: document pipeline + RAG. Chi tiết trong lộ trình đã thống nhất.
