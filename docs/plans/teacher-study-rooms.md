# Teacher — phòng học trên web

Luồng tạo mới bắt đầu bằng chọn **Assistant** hoặc **Teacher**. Assistant giữ luồng Google Meet/extension. Teacher mở phòng học có micro nhận lời nói và chat; Teacher trả lời bằng chữ, chưa phát âm thanh.

## Hành vi đã triển khai

- Tạo phòng cá nhân hoặc nhóm với môn học, trình độ, mục tiêu và tên hiển thị.
- Tải PDF có lớp chữ, DOCX, PPTX, TXT, Markdown; xem phần văn bản đã đọc và vị trí trang/slide/đoạn. Mỗi tệp tối đa 10 MB, 80.000 ký tự; mỗi phòng tối đa 12 tệp và 240.000 ký tự. DOC/PPT cũ cần chuyển định dạng. Không OCR, không diễn giải hình, đồ thị hay công thức chỉ có trong ảnh.
- Chọn tài liệu rồi hỏi/giải thích, giảng bài, ra bài tập, hướng dẫn giải bài hoặc chủ động tìm tài liệu web. Bài tập mặc định có gợi ý, chưa đưa đáp án ngay.
- Trích dẫn chỉ giữ khi câu trích có thật trong đoạn gửi cho model. URL nguồn chỉ giữ khi có trong kết quả Exa. Phần văn bản câu trả lời vẫn do model sinh, cần người học kiểm tra.
- Phòng nhóm có liên kết tham gia, tên thành viên, file và hội thoại chung; tự đọc cập nhật khoảng 2,5 giây một lần. Tối đa 30 người/phòng. Mỗi người bật micro riêng để hỏi Teacher. Chưa có cuộc gọi video/audio giữa thành viên, phân quyền lớp học hoặc chấm điểm tự động.
- Bật micro trên web, nói “trợ lý, giảng slide này”, “trợ lý, ra bài tập”, “trợ lý, giải bài tập số 2”, “trợ lý, tìm tài liệu về chủ đề này”. Micro dùng lại giao thức Blaze realtime của Assistant; thu mono PCM16 / 16 kHz bằng AudioWorklet, chuyển qua API cùng origin đến backend. Khóa STT không xuống trình duyệt. Lời nói thường chỉ làm ngữ cảnh, không tự gọi AI. Nói riêng “trợ lý” cho phép một câu tiếp theo trong 10 giây; mỗi yêu cầu cần gọi lại từ khóa. Câu hỏi đã gọi và tối đa bốn câu ngữ cảnh trước đó được lưu theo người hỏi để Teacher hiểu câu hỏi; câu hỏi/câu trả lời đồng bộ vào hội thoại chung. Audio không lưu thành file; các câu nói còn lại chỉ được giữ tạm để nhận dạng và lấy ngữ cảnh.
- Dừng nghe, rời phòng hoặc đóng trang sẽ giải phóng micro. Backend đóng phiên STT sau 30 giây không có gói âm thanh; mỗi thành viên chỉ có một micro hoạt động trong một phòng. HTTP gửi lại một gói hoặc nhận lại một câu đã chép không tạo thêm yêu cầu. Mất kết nối có thể tự nối lại STT; lỗi thiết bị/quyền/mạng được báo rõ và cho bật lại.
- Phòng và nội dung trích xuất lưu JSON ở `<MEETMATE_DATA_DIR>/teacher-rooms`; không lưu tệp gốc. Token thành viên lưu trong trình duyệt, không xuất trong dữ liệu phòng. Phòng cá nhân cần trình duyệt đã tạo; phòng nhóm cho phép người có liên kết tham gia. Đây là cơ chế chia sẻ của môi trường thử nghiệm, chưa có đăng nhập, quản lý tổ chức hay phân quyền sản xuất.
- Các yêu cầu trong cùng phòng xử lý nối tiếp để giữ đúng lịch sử. `requestId` giúp thử lại không tạo trùng lượt. Lỗi AI không làm mất file, câu hỏi hay lịch sử.

## Chạy và cấu hình

```powershell
# Repo root — frontend
npm.cmd run dev
# agents/sidekick — backend
npm.cmd run meetmate:server
```

Trong `agents/sidekick/.env.local`, cấu hình `BLAZE_API_KEY` cho Teacher và micro, `EXA_API_KEY` nếu muốn tìm tài liệu web. Có thể đặt `BLAZE_STT_API_KEY` riêng cho micro; mặc định dùng cùng khóa Blaze. Các khóa không đi vào web hoặc link mời. Thiếu khóa thì UI báo dịch vụ chưa sẵn sàng; vẫn tạo phòng, tham gia nhóm và đọc file được, không có câu trả lời AI giả. Trình duyệt cần quyền micro, AudioWorklet và HTTPS hoặc localhost. Khi dùng IP LAN qua HTTP, cần bổ sung HTTPS để thu micro.

Web dùng `/api/teacher/*` cùng origin, chuyển tới backend bằng biến server-only `MEETMATE_BACKEND_URL` (mặc định `http://127.0.0.1:3001`). Khi nhiều thiết bị cùng học, mở web qua cùng địa chỉ server hoặc IP LAN và chia sẻ link từ địa chỉ đó; link `localhost` chỉ dùng trên chính máy đang chạy. Backend có thể tiếp tục nghe loopback khi Next.js trên cùng máy. Chưa triển khai hosting công khai.

## Kiểm tra

```powershell
# agents/sidekick
npx.cmd vitest run meetmate-server/teacher*.test.ts
npm.cmd run check
# Repo root, với hai server đang chạy
npm.cmd run lint
npx.cmd playwright test tests/teacher.spec.ts
npx.cmd playwright test tests/teacher-voice.spec.ts
```

Unit test dùng model/search/STT giả để kiểm tra hợp đồng, lỗi, nguồn, xử lý đồng thời, phiên micro và phân luồng từ lời nói; worklet được kiểm tra với nhiều tần số thiết bị. Browser test dùng web/backend thật để tạo phòng, đọc file, tham gia từ trình duyệt độc lập, đồng bộ file và tải lại phòng. Kiểm tra micro dùng thiết bị giả của Chromium, AudioWorklet thật và phản hồi STT/model giả để kiểm tra cấp quyền, keyword, gửi audio, không gửi trùng và dừng thu âm. Không gọi nhà cung cấp thật khi chưa có khóa. Cần kiểm tra thêm nhận dạng giọng nói thật, bài giảng và chất lượng sư phạm với khóa thật và tài liệu học thật.
