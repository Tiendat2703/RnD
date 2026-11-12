# MeetMate: đối chiếu và hỏi đáp tài liệu trong cuộc họp

## Quyết định đã chốt (09/11/2026)
- Kết quả hiện ở **side panel và chat Meet** (mọi người đều thấy). Riêng loại "tài liệu không có thông tin" trong chế độ tự động chỉ hiện ở side panel, để chat không bị spam.
- Tài liệu: **chỉ PDF có lớp chữ**, khoảng 3 file, mỗi file khoảng 20 trang.
- Trả lời **cả hai kiểu**: tự động với mọi câu hỏi liên quan tới tài liệu, và luôn trả lời khi có người gọi "MeetMate ơi". STT nghe tên này thành "Mít mết ơi", nên phần nhận diện bắt theo cách viết phiên âm. Khi đối chiếu, chỉ báo **sai lệch**, không báo "khớp".
- Giữ tính năng research web bằng Exa, có công tắc bật/tắt ở side panel.
- LLM: `openai/gpt-6-luna`, đo được khoảng 2,9 giây cho một lượt đối chiếu khoảng 2.000 token.
- Tài liệu không nhạy cảm, được phép gửi các đoạn liên quan lên Blaze.

## Giữ STT chạy realtime khi còn gọi LLM
- **Âm thanh và STT không bao giờ chờ LLM.** AudioWorklet gửi frame 100 ms vào WebSocket Blaze một cách liên tục. Mỗi câu đã chốt chỉ được đẩy vào hàng đợi rồi hàm trả về ngay. LLM chạy bất đồng bộ trong một worker riêng.
- **Hàng đợi LLM có ưu tiên:** câu gọi "MeetMate ơi" chạy ngay, có thể chạy song song với một lượt tự động đang dở. Các câu tự động đến lúc LLM đang bận được gộp vào lượt kế tiếp, không xếp hàng vô hạn, nên độ trễ không cộng dồn.
- **Tự kết nối lại STT:** nếu socket Blaze rớt giữa cuộc họp, extension tự kết nối lại sau 1, 2, 4… giây (tối đa 15 giây) và báo trạng thái ở side panel. Audio trong lúc chờ kết nối bị bỏ qua, không bị dồn lại.
- Câu tạm (`partial`) chỉ dùng để hiện transcript trực tiếp. Chỉ câu đã chốt (`final`) mới được đưa cho LLM.

**Mục tiêu:** extension Chrome chạy local (Load unpacked). Người dùng tải tài liệu lên extension. Trong lúc họp Google Meet, MeetMate nghe cuộc họp và làm hai việc:
1. **Đối chiếu:** khi có người nhắc tới nội dung trong tài liệu (con số, mốc thời gian, điều khoản, tên người...), MeetMate so với tài liệu và báo khi có **sai lệch**, kèm trích dẫn nguyên văn và vị trí (tên file, trang hoặc mục).
2. **Hỏi đáp:** khi có người hỏi về tài liệu, MeetMate trả lời dựa trên tài liệu, có trích dẫn. Nếu tài liệu không có thông tin thì nói rõ là không có, không đoán.

Plan này kế thừa plan ngày 01/11 (`2026-11-01-meetmate-extension.md`). Các module đã có và đã chạy thật (`stt.ts`, `llm.ts`, `transcript.ts`, `topic.ts`, `research.ts`) được giữ nguyên.

## Những gì đã kiểm chứng (09/11/2026)
- Blaze STT (`wss://api.blaze.vn/v1/stt/realtime`) nhận dạng đúng tiếng Việt, chốt câu ngay khi người nói ngừng.
- Blaze LLM `openai/gpt-5.6-luna`: trả JSON đúng định dạng trong khoảng 2,8 giây, context 1,05 triệu token.
- Blaze **không có model embedding**, nên phần tìm đoạn liên quan sẽ làm local bằng BM25 (xem Task 4).

## Kiến trúc

```
Side panel (UI chính)  ──  tải tài liệu, nhập khóa, Bắt đầu/Dừng, transcript trực tiếp, thẻ kết quả
      │
Background (service worker) ── lấy streamId của tab Meet, mở/đóng offscreen, chuyển tin nhắn
      │
Offscreen document ── audio tab + micro → PCM 16 kHz → Blaze STT → TranscriptWindow
      │                   │
      │                   └─ DocChecker: BM25 chọn đoạn liên quan → Blaze LLM → kiểm chứng trích dẫn
      │                   └─ (tuỳ chọn) Research web bằng Exa như plan cũ
      ▼
Kết quả → side panel (luôn có) và chat Meet (tuỳ cấu hình, qua content script)
```

- **Side panel thay cho popup:** popup tự đóng khi bấm ra ngoài, không dùng được để theo dõi suốt buổi họp. Side panel mở cạnh tab Meet và giữ nguyên trong cả buổi họp.
- **Tài liệu lưu trong IndexedDB** của extension (không dùng `chrome.storage`, vì giới hạn dung lượng). Tài liệu chỉ nằm trên máy. Lên Blaze chỉ có **các đoạn liên quan** của mỗi lượt kiểm tra, không gửi cả file.
- **Khóa API** vẫn nhập ở UI, lưu ở `chrome.storage.local`, không bao giờ nằm trong mã nguồn hay bản build.

## Luồng xử lý tài liệu trong cuộc họp

1. Mỗi khi có câu đã chốt từ STT, câu đó được thêm vào `TranscriptWindow` (bỏ câu trùng do loa ngoài, như cũ).
2. **Bộ lọc rẻ, chạy local, không gọi LLM:** BM25 chấm điểm các câu gần nhất so với các đoạn tài liệu. Chỉ gọi LLM khi có một trong các điều kiện sau:
   - điểm BM25 vượt ngưỡng;
   - câu có dấu hiệu hỏi ("bao nhiêu", "khi nào", "có phải", "tài liệu ghi gì"...);
   - có người nhắc tên tài liệu;
   - có con số hoặc ngày tháng trùng chủ đề với tài liệu.

   Bộ lọc này giúp không tốn credit khi mọi người nói chuyện phiếm.
3. **Gọi LLM** với các câu vừa nói, khoảng 6 đoạn tài liệu có điểm cao nhất (kèm mã đoạn) và các kết quả đã báo trước đó (để không báo lại). LLM trả JSON:
   ```json
   {"items": [{"kind": "contradiction|answer|not_in_doc",
               "utterance": "câu trong cuộc họp",
               "quote": "trích nguyên văn từ tài liệu",
               "chunkId": "doc1#p3-2",
               "explanation": "giải thích ngắn bằng tiếng Việt"}]}
   ```
4. **Kiểm chứng phía code (ranh giới tin cậy, giống cách lọc URL bịa):** `quote` phải thật sự xuất hiện trong đoạn `chunkId`, so khớp sau khi chuẩn hóa khoảng trắng và dấu câu. Kết quả có trích dẫn bịa sẽ bị loại. Vị trí hiển thị (file, trang) lấy từ dữ liệu của đoạn, không lấy từ LLM.
5. **Chống spam:** một sai lệch đã báo thì không báo lại trong buổi họp. Mỗi kiểu kết quả chỉ báo tối đa một lần trong khoảng 20 giây. Các lượt gọi LLM chạy nối tiếp nhau, và lượt cũ bị hủy khi lượt mới có ngữ cảnh mới hơn.

## Các task

| # | Task | Kiểm tra được bằng |
|---|---|---|
| 1 | Khung extension: manifest MV3, side panel, background, offscreen, xin quyền micro, script build esbuild | `npm run extension:build` ra `dist-extension/`, Load unpacked được, side panel mở |
| 2 | Âm thanh: ghi tab và micro, **phát lại âm thanh tab** để người dùng vẫn nghe được, AudioWorklet chuyển sang PCM16, nối vào `BlazeStt` | Unit test `pcm.ts`; side panel hiện transcript trực tiếp khi họp thật |
| 3 | Nạp tài liệu: PDF (pdf.js), DOCX (mammoth), TXT/MD; chia đoạn khoảng 800 ký tự có chồng lấn, giữ số trang hoặc mục; lưu IndexedDB; UI danh sách, xem, xóa | Unit test parser và chunker với file mẫu tiếng Việt |
| 4 | Tìm đoạn liên quan: BM25 cho tiếng Việt (chuẩn hóa, tách âm tiết, bigram, thêm bản bỏ dấu để chịu được lỗi STT) | Unit test: câu hỏi trả về đúng đoạn trong top 3 |
| 5 | `DocChecker`: bộ lọc gọi LLM, prompt, đọc JSON, kiểm chứng trích dẫn, chống báo trùng | Unit test với LLM giả, gồm JSON hỏng, trích dẫn bịa, báo trùng |
| 6 | Điều phối phiên họp: nối STT, DocChecker và (tuỳ chọn) research web; hủy lượt cũ; hiện lỗi Blaze ở side panel | Unit test với đồng hồ giả |
| 7 | Hiển thị: thẻ kết quả trong side panel (sai lệch màu đỏ, trả lời màu xanh, có trích dẫn và vị trí); gửi chat Meet qua content script nếu bật | Playwright: nạp extension vào Chromium, dùng một trang Meet giả local để kiểm tra content script gõ chat |
| 8 | Chạy thật end-to-end | (a) Script `simulate-meeting.ts`: Blaze TTS đọc một kịch bản họp có cài sẵn sai lệch so với tài liệu mẫu, đi qua STT thật và DocChecker thật, rồi tự đánh giá số sai lệch và câu hỏi bắt được. (b) Bạn chạy thử trên Google Meet thật theo checklist |

Mỗi task: viết test trước, code, chạy toàn bộ test và `tsc`, rồi commit lên `feature/meetmate-extension`.

## Rủi ro đã biết
- **Lỗi STT với con số** (ví dụ "2" và "hai", "15 triệu" và "mười lăm triệu"): con số sẽ được chuẩn hóa trước khi so, và prompt yêu cầu LLM coi các cách viết tương đương là khớp.
- **Báo nhầm sai lệch** khi người nói chỉ đang đề xuất thay đổi ("hay mình đổi thành 20%?"): prompt phân biệt "đề xuất" với "khẳng định". Kịch bản ở Task 8 có câu loại này để kiểm tra.
- **Selector chat Meet thay đổi** theo phiên bản Meet: chỉ ảnh hưởng tính năng gửi chat, side panel vẫn hoạt động.
- **PDF scan (ảnh)** không có lớp chữ nên không đọc được nếu không có OCR (xem câu hỏi 2).
- `chrome.tabCapture` cần thao tác bấm của người dùng trên tab Meet, nên luồng Bắt đầu phải đi qua lượt bấm icon extension.
