# Teacher — phiên học trong Google Meet

Teacher dùng chung luồng tạo phiên, chọn tài liệu, micro và âm thanh tab của Assistant. Không còn mục Teacher riêng ở sidebar. Các URL `/dashboard/teacher` cũ chuyển về danh sách cuộc họp; API và dữ liệu phòng cũ được giữ để tránh mất dữ liệu.

## Luồng sử dụng

1. Tải PDF có lớp chữ, Word DOCX hoặc slide PPTX ở **Tài liệu** (tối đa 40 MB/file); cũng có thể dán văn bản. PDF scan chưa có OCR. DOC/PPT cũ cần chuyển sang định dạng mới.
2. Bấm **+ Cuộc họp mới → Teacher**, nhập tên phiên và môn học nếu muốn, chọn tài liệu. Không hỏi trình độ, mục tiêu, tên người học hoặc hình thức cá nhân/nhóm.
3. Chọn tùy chọn và **Gửi phiên cho MeetMate**. Extension nhận loại assistant và đúng nội dung tài liệu của phiên.
4. Trong tab Google Meet, bấm biểu tượng MeetMate trên thanh công cụ để bắt đầu nghe. Lần đầu cần cấp quyền micro. Chọn phiên Teacher trong extension nếu có nhiều phiên chờ.
5. Nói “trợ lý, giảng trang 3”, “trợ lý, giải thích tính đóng gói”, “trợ lý, ra bài tập”, “trợ lý, giải bài tập số 2” hoặc “trợ lý, tìm tài liệu về OOP”. Teacher trả lời bằng chữ ở khung extension và chat Meet khi bật tự gửi. Người học cùng cuộc gọi đọc được bài giảng trong chat Meet.

Chỉ từ khóa “trợ lý” kích hoạt yêu cầu. Gọi riêng từ khóa cho phép một câu tiếp theo trong 10 giây. Teacher không tự chạy bước đối chiếu nhận định của Assistant. Bài giảng dài được chia thành các tin nhắn chat, thay vì cắt bỏ nội dung. Teacher chưa phát âm thanh.

Teacher ưu tiên tài liệu của phiên, phân biệt kiến thức bổ sung và hỏi lại nếu thiếu đề bài. Bài tập mặc định có gợi ý, chưa đưa đáp án. Trích dẫn được kiểm tra với đoạn văn thực sự gửi cho model; URL nguồn phải có trong kết quả Exa. Nội dung giảng do model sinh, chưa có đánh giá chất lượng sư phạm tự động.

## Chạy và cấu hình

```powershell
# Thư mục gốc: web
npm.cmd run dev
# agents/sidekick: backend lưu tài liệu và phiên
npm.cmd run meetmate:server
# agents/sidekick: build extension
npm.cmd run extension:build
```

Nạp hoặc Reload `agents/sidekick/dist-extension` tại `chrome://extensions` (bản 0.4.1 trở lên), rồi tải lại web và tab Meet. Trong **Cài đặt extension**, nhập khóa Blaze cho STT/LLM. Tìm tài liệu web cần khóa Exa và bật Research web. Teacher trong extension dùng cùng cấu hình khóa như Assistant; không dùng khóa của các phòng Teacher web cũ.

Bản 0.4.1 yêu cầu đầu ra JSON cho Teacher, dùng công thức dạng chữ dễ đọc trong chat và tự tạo lại một lần nếu phản hồi sai định dạng. Lỗi đã tái hiện với PDF đạo hàm 67 trang: AI có trả bài giảng nhưng ký hiệu LaTeX chưa escape làm JSON không đọc được. Đã kiểm tra bản sửa với cùng PDF và AI thật; lỗi này thuộc bước xử lý phản hồi, không phải thiếu tài liệu.

Tải tài liệu dùng API cùng origin `/api/documents/*`, proxy tới `MEETMATE_BACKEND_URL` (server-only, mặc định `http://127.0.0.1:3001`). PDF/DOCX/PPTX gửi nguyên byte cho backend đọc. Web và backend dùng chung giới hạn dung lượng; lỗi file rỗng, quá nhiều chữ, PDF scan/hỏng và vượt dung lượng được phân biệt.

## Kiểm tra

```powershell
# agents/sidekick
npm.cmd test
npm.cmd run check
npm.cmd run extension:build
# Thư mục gốc, với web/backend đang chạy
npm.cmd run lint
npm.cmd run build
npx.cmd playwright test tests/teacher.spec.ts
```

Unit test kiểm tra keyword, chức năng dạy học, trích dẫn, tìm web, chia tin dài và truyền chế độ Teacher tới offscreen. Browser test tải một PDF hợp lệ đúng 2 MiB qua web/backend thật, chọn tài liệu và kiểm tra thông điệp tạo phiên Teacher qua bridge giả; kiểm tra cả Assistant và chuyển hướng URL cũ. Đây là file thử nghiệm, chưa phải file PDF gốc người dùng báo lỗi. Thu âm tab và gửi chat trong Google Meet thật cần kiểm tra thủ công bằng Chrome.
