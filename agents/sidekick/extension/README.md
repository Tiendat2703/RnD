# MeetMate (Chrome extension)

Nghe cuộc họp Google Meet tiếng Việt, đối chiếu lời nói với tài liệu PDF bạn tải lên, báo sai lệch và trả lời câu hỏi về tài liệu, ngay trong side panel và chat Meet. Thiết kế chi tiết: `docs/superpowers/plans/2026-11-09-meetmate-tai-lieu.md`.

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

Để hỏi trực tiếp, nói "MeetMate ơi, …" rồi đặt câu hỏi.

## Kiểm thử

- `npm test`: unit test. Không cần mạng.
- `BLAZE_API_KEY=... npm run extension:simulate`: chạy một cuộc họp có kịch bản qua Blaze TTS, STT và LLM thật, rồi chấm điểm từng câu.
- `BLAZE_API_KEY=... npm run extension:e2e`: nạp extension đã build vào Chromium, dùng micro giả và trang Meet giả để chạy toàn bộ luồng. Trước đó cần tạo file âm thanh bằng lệnh `npx tsx scripts/simulate-meeting.ts --wav extension/.cache/meeting.wav --wav-only`.

`npm run extension:e2e` không kiểm tra được hai phần: ghi âm tab Meet thật (cần bấm biểu tượng thật) và giao diện chat của Meet thật. Hai phần này cần thử tay trên một cuộc họp thật.
