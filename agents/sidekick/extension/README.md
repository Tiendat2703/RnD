# MeetMate (Chrome extension)

Nghe cuộc họp Google Meet tiếng Việt, ghi transcript và tra cứu tài liệu PDF hoặc web khi người dùng gọi “trợ lý”, trả lời ngay trong side panel và chat Meet. Thiết kế chi tiết: `docs/superpowers/plans/2026-11-09-meetmate-tai-lieu.md`.

## Cài đặt (local)

```bash
npm install
npm run extension:build
```

1. Mở `chrome://extensions`, bật **Developer mode**, bấm **Load unpacked** rồi chọn thư mục `agents/sidekick/dist-extension`.
2. Vào một cuộc họp Google Meet, bấm biểu tượng MeetMate trên thanh công cụ để mở side panel.
3. Trong **Cài đặt**, nhập khóa Blaze (bắt buộc) và khóa Exa (nếu muốn research web).
4. Trong **Tài liệu**, thêm các file PDF có lớp chữ.
5. Bấm **Bắt đầu nghe**. Lần đầu Chrome sẽ hỏi quyền micro. Nên đeo tai nghe khi dùng.

Để tìm kiếm, nói **"Trợ lý ơi, …"** rồi đặt câu hỏi. Chỉ từ khóa **"trợ lý"** mới kích hoạt xử lý; gọi "MeetMate ơi" không kích hoạt nữa. Nếu nói riêng "Trợ lý ơi", câu tiếp theo trong vòng 10 giây được dùng làm câu hỏi. Mỗi lần gọi chỉ xử lý một câu hỏi; muốn hỏi tiếp phải gọi lại từ khóa.

Câu hỏi được phân loại theo nguồn trước khi trả lời, dựa vào câu mới nhất, ngữ cảnh và các đoạn tài liệu liên quan:

- “Trợ lý ơi, Ngũ Hành Sơn nằm ở đâu?”, “Trợ lý, Đại học Duy Tân ở đâu?”, “Trợ lý, cách truy cập cloud?” → tìm web ngay, kể cả khi chưa tải tài liệu. Cần bật **Research web** và có khóa Exa.
- “Trợ lý, phí bảo trì trong hợp đồng bao nhiêu?” hoặc câu hỏi về dữ kiện riêng của nhóm → tra tài liệu và trích dẫn file/trang; không tìm dữ kiện nội bộ trên web khi file thiếu thông tin.
- “Trợ lý, cái này ở đâu?” khi chưa rõ đối tượng → yêu cầu nói rõ, không trả nhầm “tài liệu không đề cập”.

Hội thoại không có từ khóa vẫn được ghi transcript và giữ làm ngữ cảnh, nhưng không gọi LLM phân nguồn, không đối chiếu tài liệu và không tự research web theo chủ đề. Chỉ sau khi gọi “trợ lý”, câu hỏi mới được phân nguồn và tìm kiếm.

## Kiểm thử

- `npm test`: unit test. Không cần mạng.
- `BLAZE_API_KEY=... npm run extension:simulate`: chạy một cuộc họp có kịch bản qua Blaze TTS, STT và LLM thật, rồi chấm điểm từng câu.
- `BLAZE_API_KEY=... npm run extension:e2e`: nạp extension đã build vào Chromium, dùng micro giả và trang Meet giả để chạy toàn bộ luồng. Trước đó cần tạo file âm thanh bằng lệnh `npx tsx scripts/simulate-meeting.ts --wav extension/.cache/meeting.wav --wav-only`.

Nếu đã có `meeting.wav` từ phiên bản cũ, cần tạo lại bằng lệnh trên để kịch bản dùng từ khóa “trợ lý”.

`npm run extension:e2e` không kiểm tra được hai phần: ghi âm tab Meet thật (cần bấm biểu tượng thật) và giao diện chat của Meet thật. Hai phần này cần thử tay trên một cuộc họp thật.
