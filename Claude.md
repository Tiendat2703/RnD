# CLAUDE.md — MeetMateAI

Nguồn sự thật cho dev và AI coding agent. Cập nhật 03/11/2026 (Phase 0), gộp với nhánh `main` 12/11/2026. Bản cũ mô tả "AI Meeting Sidekick frontend-only" đã bị thay thế hoàn toàn.

## 1. Sản phẩm

MeetMateAI là trợ lý AI trong cuộc họp (dự án RnD to Startup 2026, tài liệu: `RTS2026 - Bản Mô tả - MeetMateAI`). Chu trình: Talk → Understand → Research → Verify → Create. Điểm khác biệt: gán **trạng thái bằng chứng** cho nhận định (Supported / Partially Supported / Contradicted / Insufficient Evidence) và hiểu hội thoại Việt–Anh.

## 2. Quyết định kiến trúc (Phase 0)

Ba nguồn đang mô tả ba kiến trúc khác nhau, nên chia làm hai lớp:

| Lớp | Nội dung | Trạng thái |
|---|---|---|
| **Demo (MVP hiện tại)** | Chrome extension MV3: nghe tab Meet + micro → Blaze STT → đối chiếu lời nói với PDF đã tải lên, trả lời "MeetMate ơi, …", tách chủ đề → Exa → gõ vào chat Meet. Khóa API ở `chrome.storage.local`. Không có backend trên đường nghe; backend chỉ nhận phiên sau họp (mục 2b.6). Plan: `docs/plans/2026-11-01-meetmate-extension.md`, `agents/sidekick/docs/superpowers/plans/2026-11-09-meetmate-tai-lieu.md` | Code ở `agents/sidekick/extension/`, build bằng `npm run extension:build` (ở `agents/sidekick`). Lõi nghe/đối chiếu/khung bên là bản của nhánh `main`, **đã chạy trên Meet thật** (v0.2.2, Cốc Cốc). Phần gộp vào ngày 12/11/2026 (cầu nối web, lưu phiên, panel trong Meet, chuyển về web khi rời họp) có unit test và đã thử cầu nối với web thật, **chưa chạy trên cuộc họp Meet thật** |
| **Web console** | Next.js trong repo này, dữ liệu mẫu. Là "bản mô phỏng giao diện mục tiêu", không phải prototype chạy thật, không đấu nối AI | Có, lint + build xanh |
| **Lớp mục tiêu (roadmap)** | Document pipeline + RAG, Supabase (Postgres, pgvector, Storage, RLS), Context Router, Knowledge Card, Measurement & Logging, evidence status | Chưa có; chỉ được viết là "mục tiêu", không viết ở thì hiện tại |

Ảnh kiến trúc System Architecture (MVP) trong tài liệu vẽ **lớp mục tiêu**; khi dùng trong tài liệu phải ghi nhãn đó.

## 2b. Luồng web ↔ extension

Cầu nối duy nhất là `window.postMessage` tới content script `agents/sidekick/extension/src/bridge.ts` (chạy trên `localhost`). Giao thức nằm ở `lib/bridgeProtocol.ts`, **web và extension import cùng một file**. Không khóa API nào đi qua cầu nối.

1. Wizard "Cuộc họp mới" → `InstallExtensionDialog`: ping extension, ba dấu tích do extension trả lời (đã cài, đã có khóa Blaze, có tab Meet). Khóa Exa không bắt buộc: thiếu thì chỉ tắt research web.
2. "Gửi phiên cho MeetMate" → extension nhận `session.prepare`. Chrome chỉ cho ghi âm tab ngay trong cú bấm biểu tượng extension (nút trong khung bên không được tính), nên **bắt đầu = bấm biểu tượng MeetMate trên thanh công cụ ở tab Meet**: khung bên mở và extension bắt đầu nghe luôn. Extension không còn popup.
3. Extension báo `status: Đang chạy` → hộp thoại tự đóng, **không** mở màn hình toàn trang. Theo dõi trực tiếp nằm ở hai chỗ trong Chrome: **khung bên** (`extension/src/sidepanel.ts`: tải PDF, transcript, thẻ đối chiếu/trả lời/research, cài đặt khóa, nút Dừng) và **panel MeetMate trong trang Meet** (`extension/src/content/panel.ts`: trạng thái, vài dòng transcript, thẻ, chủ đề, nguồn, nút Dừng). Sự kiện của pipeline được chuyển sang giao thức web ở `extension/src/webEvents.ts`. Web chỉ hiện thẻ "Đang diễn ra"; "Mở lại phiên" mở `MeetingMonitor` như một góc nhìn phụ, vẫn nhận cùng sự kiện.
4. Kết thúc: từ web (`session.stop`), từ panel/popup (Dừng), khi bấm "Rời cuộc gọi"/tab Meet điều hướng đi/đóng tab (`ended`, lý do `left`/`meet-closed`). Meet **không** tải lại trang khi rời cuộc gọi (chỉ đổi nội dung thành "Bạn đã rời khỏi cuộc họp"), nên content script canh hai tín hiệu: bấm nút theo nhãn chữ, và một đoạn chữ ngắn đứng riêng đúng câu của màn hình đó (`content/leave.ts`). Khi họp kết thúc (`left`/`meet-closed`, không phải Dừng nghe), extension **tự chuyển hướng tab Meet** tới `<origin web>/dashboard/callSessions` (origin lấy từ tab web đã bắt tay, mặc định `http://localhost:3000`); tab Meet đã đóng thì dùng/mở tab web. Panel hiện "Phiên đã kết thúc và được lưu".
5. **Lưu phiên trong lúc họp:** extension ghi từng sự kiện ngay khi có (`extension/src/sessionStore.ts`, `chrome.storage.local`): transcript, chủ đề, kết quả tìm nguồn, số tin đã vào chat. Web hỏi `sessions.list` mỗi lần mở và mỗi khi một phiên kết thúc rồi gộp vào danh sách cuộc họp, nên phiên diễn ra lúc web đóng hoặc sau khi tải lại trang vẫn còn. Xóa cuộc họp trên web gửi `sessions.delete` (chỉ xóa bản trong extension, không xóa bản trên backend). Tab "Nguồn" trong chi tiết dùng chủ đề/nguồn thật của phiên; cuộc họp mẫu có sẵn vẫn dùng dữ liệu mẫu.
6. **Lưu phiên lên backend (thủ công):** phiên đã kết thúc hiện "Chờ lưu". Người dùng bấm "Lưu phiên" (thẻ cuộc họp hoặc tab "Báo cáo", `components/dashboard/SessionReport.tsx`) → web gửi `SavedSession` tới backend MeetMate (`lib/backendApi.ts`) → backend ghi JSON và tạo báo cáo bằng một lượt LLM: những gì đã diễn ra, ai làm gì, kế hoạch tiếp theo (`lib/report.ts`, dùng chung web + backend). Chỉ khi báo cáo đã lưu, web mới gửi `sessions.markSynced`. Extension chỉ dọn (giới hạn 50) phiên đã có `syncedAt`; phiên đang chạy hoặc chưa gửi không bao giờ bị dọn. Transcript không phân biệt người nói, nên "ai" chỉ có khi tên được nhắc trong câu căn cứ; câu căn cứ không có thật trong transcript thì mục bị loại. Kế hoạch: `docs/plans/2026-11-11-backend-session-integration.md`.

**Giao diện extension.** Panel trong Meet tuân `docs/design/MEETMATE-DESIGN.md` (không phải `DESIGN.md`): token ở `extension/src/ui/theme.css` (panel luôn tối), ba họ phông đóng gói trong `extension/static/fonts/` (không gọi Google Fonts), hàng 6 bước ở `ui/stages.ts`, phân loại dải vàng/đỏ ở `ui/status.ts`; panel vẽ nguồn bằng `toChatPosts` của web nên không lệch tin thật. Khung bên và trang quyền micro là bản của nhánh `main` (`static/sidepanel.css`), **chưa** theo hợp đồng thiết kế, và có biểu tượng `static/icon-*.png` + ô `.logo` — mâu thuẫn với điều khoản "không tự vẽ icon/logo" của hợp đồng, cần quyết định. Pipeline hiện không phát sự kiện `stage`, nên hàng 6 bước của panel luôn đứng ở "Đang lắng nghe".

**Knowledge Card.** Kiểu dữ liệu ở `lib/evidence.ts` (dùng chung web + extension). Nguồn thẻ duy nhất là bước đối chiếu tài liệu của extension (`doccheck.ts`), chuyển ở `webEvents.ts`: mâu thuẫn với tài liệu → Contradicted, tài liệu không nói tới → Insufficient Evidence, câu trả lời về tài liệu → Câu hỏi (không trạng thái). **Chưa có gì sinh Supported / Partially Supported.** Tài liệu PDF tải lên ở khung bên extension (lưu trong extension), không phải trang Tài liệu của web. Dữ liệu và API giả cho thẻ (`mocks/meeting-claims.json`, `mocks/kb.json`, `lib/mockApi.ts`) **đã bị xóa (11/11/2026)**, cùng các cuộc họp mẫu trên web: danh sách cuộc họp và kho tài liệu bắt đầu rỗng, chỉ có phiên thật do extension ghi. Các tab Nhận định / Bối cảnh và phần Artifact chỉ hiện khi phiên có thẻ. Bốn trạng thái bằng chứng phân biệt bằng biểu tượng + độ đặc nền + kiểu viền, không thêm màu (xem `docs/design/MEETMATE-DESIGN.md`). Ảnh trong `docs/screenshots/` chụp từ bản còn dữ liệu mẫu, đã cũ.

Nút "Chạy thử với dữ liệu mẫu" trên web vẫn có và được gắn nhãn "dữ liệu mẫu" trên monitor. Chế độ thử của extension (bật trong popup cũ) đã bị bỏ khi gộp với `main`.

## 3. Cấu trúc repo

- `app/`, `components/`, `hooks/`, `lib/`, `mocks/`: web console Next.js 16, React 18, TypeScript, không Tailwind. CSS thường (`app/globals.css`, `app/dashboard/dashboard.css`).
- `lib/types.ts`: hợp đồng dữ liệu web ↔ extension (`LIMITS`, `Topic`, `ResearchResult`…). Sửa hằng số ở đây, không sửa ở nơi dùng.
- `agents/sidekick/`: code nhập từ dự án hackathon Sidekick (OpenAI/LiveKit/Exa/Ambiguous). Có `package.json` riêng. Phần `extension/` là code MeetMate (dùng lại `ExaProvider` và vitest ở đây): lõi của nhánh `main` (`pipeline.ts`, `live-stt.ts`, `doccheck.ts`, `assistant.ts`, `wake.ts`, `docs/`, `sidepanel.ts`, `extension/README.md`) cộng phần nối với web (`bridge.ts`, `sessionStore.ts`, `webEvents.ts`, `content/panel.ts`, `content/leave.ts`); `meetmate-server/` là backend MeetMate (Express, cổng 3001, chỉ loopback, lưu tệp JSON ở `.meetmate-data/`, LLM Blaze `openai/gpt-6-luna` như nhánh main, khóa `BLAZE_API_KEY` trong `agents/sidekick/.env.local`); phần còn lại của package là Sidekick gốc, không sửa trừ khi task nêu rõ.
- `lib/backendApi.ts`: lời gọi duy nhất từ web tới backend MeetMate (`NEXT_PUBLIC_MEETMATE_API`, mặc định `http://localhost:3001`).
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

# backend MeetMate (trong agents/sidekick)
npm run meetmate:server
npx vitest run meetmate-server extension
npm run extension:build
BLAZE_API_KEY=... npm run extension:e2e   # cần extension/.cache/meeting.wav, xem đầu e2e/meetmate.spec.ts
```

Trước khi sửa Next.js, đọc `AGENTS.md` và `node_modules/next/dist/docs/` — phiên bản này có breaking changes.

## 5. Quy ước

- Mọi chữ hiển thị cho người dùng bằng **tiếng Việt**. Thương hiệu chỉ là **MeetMate / MeetMateAI**.
- Dữ liệu giả còn lại (chỉ cho nút "Chạy thử") nằm trong `mocks/` và `lib/dashboardData.ts`, không hardcode trong component.
- Web app không bao giờ giữ khóa Blaze/Exa. Khóa STT/Exa ở extension, khóa LLM tạo báo cáo ở backend. Lời gọi backend thật chỉ nằm trong `lib/backendApi.ts`.
- Không tuyên bố trong UI hoặc tài liệu điều code chưa làm. Số liệu chưa đo gọi là "mục tiêu"/"mô phỏng".
- Nhánh `feature/<tên>`, PR review trước khi merge vào `main`.

## 6. Kiểm tra trước khi nộp

Chạy 9 lệnh grep ở mục 2 của `docs/plans/2026-11-02-consistency-checklist.md`. Trạng thái 04/11/2026: không còn chuỗi hiển thị "Sidekick"/"interview" trong `app components lib`; thư mục `components/ai-sidekick/` đã bị xóa cùng trang `/` cũ.

## 7. Việc tiếp theo

Phase 1: làm tài liệu trung thực. Phase 2: dựng `extension/` theo plan. Phase 3: evidence status. Phase 4: document pipeline + RAG. Chi tiết trong lộ trình đã thống nhất.
