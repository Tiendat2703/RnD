# Kế hoạch: lưu phiên ở extension, bấm "Lưu phiên" để gửi backend tạo báo cáo

Ngày: 2026-11-11. Trạng thái: bước 1–4 đã làm, đã chạy thử với LLM giả; chưa chạy với khóa Blaze thật và chưa chạy trên cuộc họp Meet thật. Thay thế bản trước (backend realtime + SQLite + SSE + mã phiên), vì bản đó nặng và không giảm độ trễ: độ trễ chủ yếu nằm ở STT chốt câu, LLM và Exa, không nằm ở backend.

## 1. Quyết định đã chốt

- Chạy local, một người dùng, chưa đăng nhập.
- **Không có PDF trong đợt này.** Không upload, không đối chiếu tài liệu. Đưa vào lại ở đợt sau.
- Trong cuộc họp, extension tự làm hết như hiện nay: nghe, Blaze STT, tách chủ đề, research Exa. Không có backend trên đường nghe.
- **Lưu phiên thủ công:** sau họp, người dùng bấm "Lưu phiên" trên web.
- **Backend lưu bằng tệp JSON.**
- **Báo cáo chỉ dựa trên transcript:** ai làm gì, những gì đã diễn ra, kế hoạch tiếp theo.

## 2. Luồng

1. **Web**: tạo cuộc họp, gửi `session.prepare` cho extension (đã có).
2. **Extension**: bấm Bắt đầu trong popup tại tab Meet. Audio đi thẳng tới Blaze STT; partial hiển thị ngay, `final` được lưu và đưa vào tách chủ đề/research.
3. **Lưu liên tục**: mỗi sự kiện (`line`, `topic`, `research`, `card`, `posted`, `ended`) được ghi vào `chrome.storage.local` trước khi gửi cho web (`background.ts`). Đóng tab, tắt máy hay đóng web giữa chừng vẫn giữ phần đã nghe; mất tối đa câu chưa có `final`.
4. **Kết thúc**: phiên có `syncedAt = null` (chưa gửi). Web hiện "Chờ lưu".
5. **Bấm "Lưu phiên"**: web lấy phiên từ extension (`sessions.list`) và gửi backend một lần.
6. **Backend**: ghi tệp JSON của phiên, gọi LLM một lần trên toàn bộ transcript, ghi báo cáo, trả về cho web.
7. **Web → extension** `sessions.markSynced`: chỉ gửi sau khi backend xác nhận đã lưu báo cáo. Từ lúc này extension mới được phép dọn phiên đó.
8. **Lỗi**: gửi hoặc tạo báo cáo lỗi thì dữ liệu vẫn ở extension; web hiện lỗi và nút Thử lại.

## 3. Báo cáo

Ba phần, đều rút từ transcript:

| Phần | Nội dung |
| --- | --- |
| Những gì đã diễn ra | Tóm tắt theo diễn biến, các chủ đề đã bàn |
| Ai làm gì | Việc được giao và người nhận, kèm câu transcript làm căn cứ |
| Kế hoạch tiếp theo | Việc cần làm, hạn chót nếu có nhắc, câu hỏi còn bỏ ngỏ |

Nguồn research của phiên được liệt kê riêng ở cuối, không trộn vào ba phần trên.

**Giới hạn về "ai":** extension trộn audio tab và micro thành một luồng trước khi gửi STT (`LineSource = "mixed"`), nên transcript không biết câu nào của ai. LLM chỉ ghi tên người khi transcript nói rõ ("Lan sẽ gửi báo giá thứ Sáu"). Không có tên thì ghi "chưa rõ người nhận", không đoán. Muốn phân biệt "Bạn" / "Người khác" phải tách hai luồng STT cho micro và tab (tốn gấp đôi phiên STT); chưa làm ở đợt này.

Không biến đề xuất của AI thành quyết định của nhóm: chỉ ghi là việc được giao khi transcript có lời giao hoặc nhận việc.

## 4. Gói gửi backend

`SavedSession` như extension đang lưu: id, tên, loại, thời gian, `lines` (transcript `final`), `topics` (chủ đề + kết quả research), `cards`.

## 5. Backend tối thiểu

| API | Mục đích |
| --- | --- |
| `POST /api/sessions` | Nhận phiên, ghi JSON, tạo báo cáo. Gửi lại cùng id thì ghi đè phiên, không tạo bản trùng |
| `GET /api/sessions` | Danh sách phiên đã lưu |
| `GET /api/sessions/:id` | Phiên kèm báo cáo |
| `POST /api/sessions/:id/report/retry` | Tạo lại báo cáo khi lỗi |

- Express/TypeScript trong `agents/sidekick`, cổng 3001, chỉ nghe loopback, kiểm tra origin.
- Lưu `data/sessions/<id>.json` và `data/reports/<id>.json`. Ghi ra tệp tạm rồi đổi tên, để tắt đột ngột không để lại tệp hỏng. Kiểm tra id chỉ chứa ký tự an toàn trước khi ghép đường dẫn.
- Khóa LLM ở backend (`.env`, không commit). Khóa Blaze STT và Exa ở extension như hiện nay. Web không giữ khóa nào.
- Báo cáo hiển thị trên web và cho tải Markdown.

## 6. Thứ tự triển khai

1. **[Đã làm]** Cờ `syncedAt` trong `SavedSession`, tin nhắn `sessions.markSynced`, `prune` chỉ dọn phiên đã lưu backend. Test: `extension/src/sessionStore.test.ts`.
2. **[Đã làm]** Backend `agents/sidekick/meetmate-server/`: nhận phiên, ghi JSON, tạo báo cáo, retry. Test: `meetmate-server/*.test.ts`.
3. **[Đã làm]** Web: nút "Lưu phiên" trên thẻ, pill Chờ lưu / Đã lưu, tab "Báo cáo" trong chi tiết cuộc họp (`SessionReport.tsx`), tải `.md`. Lớp gọi backend ở `lib/backendApi.ts` (tách khỏi `mockApi.ts` vì đây là chức năng mới, không thay hàm giả nào).
4. **[Đã làm]** Cập nhật `CLAUDE.md` mục 2b, 3, 4, 5.
5. Chạy với khóa Blaze thật, rồi chạy toàn luồng trên Meet thật.

Mốc xem thử: họp → phiên hiện "Chờ lưu" → bấm Lưu phiên → thấy báo cáo.

## 7. Nghiệm thu

- Đóng tab Meet hoặc web giữa cuộc họp: transcript đã chốt vẫn còn.
- Phiên đang chạy hoặc chưa gửi không bị dọn, kể cả khi đã có hơn 50 phiên.
- Bấm Lưu phiên nhiều lần chỉ có một bản phiên và một báo cáo trên backend.
- Backend tắt: bấm Lưu phiên báo lỗi, dữ liệu vẫn ở extension; bật lại và thử lại thành công.
- "Ai làm gì" chỉ có tên khi transcript nói rõ; mỗi mục có câu căn cứ.

## 8. Đợt sau

- Upload PDF, đối chiếu tài liệu trong cuộc họp (pipeline `doccheck` của `main`).
- Tách luồng STT micro/tab để biết câu nào của người dùng.
