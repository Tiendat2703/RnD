# Ảnh prototype cho mục III.3.3 — nguồn gốc từng ảnh

Chụp ngày 04/11/2026 bằng `node scripts/prototype-shots.mjs` (Playwright + Chrome). Chạy lại script sau khi sửa giao diện để cập nhật ảnh (cần `npm run dev` và `npm run extension:build` ở `agents/sidekick`).

**Đọc trước khi dán vào tài liệu.** Mọi ảnh dưới đây là **giao diện thật chạy trên dữ liệu mẫu**, không phải một cuộc họp thật với dịch vụ thật. Cuộc họp mẫu là kịch bản BA – PM – developer ở mục III.3.2 của bản mô tả (`mocks/meeting-claims.json`), tài liệu mẫu là `mocks/kb.json`. Giao diện tự gắn nhãn **"Dữ liệu mẫu"** nên ảnh mang sẵn chú thích trung thực. Chú thích trong tài liệu phải nói đúng như vậy, ví dụ: *"Giao diện prototype với dữ liệu mẫu; chưa nối Knowledge Base và mô hình thật."* Đừng viết như thể đã chạy thật, và đừng để cột trạng thái ghi "Đã chạy" cho những module chỉ có giao diện.

| Ảnh | Cho thấy | Module trong bảng III.3.3 | Loại |
|---|---|---|---|
| `01-web-danh-sach-cuoc-hop.png` | Danh sách cuộc họp; cuộc họp mẫu đầu tiên | Session Context Memory (lịch sử) | Giao diện thật, dữ liệu mẫu |
| `02-web-the-doi-chieu-nhan-dinh.png` | **Thẻ claim kèm trạng thái bằng chứng** (mâu thuẫn, ủng hộ một phần, chưa đủ căn cứ, được ủng hộ), câu hỏi có trích dẫn, quyết định, phụ thuộc, giả định | Nhận diện câu hỏi/claim/giả định; Fact-check và trạng thái bằng chứng | Giao diện thật, dữ liệu mẫu |
| `03-web-boi-canh-phien.png` | Bối cảnh phiên: đếm theo trạng thái, quyết định, phụ thuộc, giả định, nhận định còn mở | Session Context Memory | Giao diện thật, dữ liệu mẫu |
| `04-web-ban-ghi.png` | Bản ghi cuộc họp | Tiếp nhận và phiên âm hội thoại | Giao diện thật, dữ liệu mẫu |
| `05-web-artifact-bao-cao.png` | **Artifact**: bản xem trước báo cáo cuộc họp dựng từ các thẻ, có nút Tải .md | Tạo artifact | Giao diện thật, dữ liệu mẫu. Chưa xuất DOCX/PPTX/XLSX; thuộc sau MVP theo tài liệu |
| `06-web-tai-lieu-truy-xuat.png` | Kho tài liệu (PDF/DOCX/XLSX, số đoạn, đã lập chỉ mục) và ô kiểm tra truy xuất trả về đoạn kèm tên tài liệu + vị trí | Truy xuất knowledge base người dùng | Giao diện thật; truy xuất chỉ **khớp từ khóa** trên 5 đoạn có sẵn |
| `07-web-cuoc-hop-moi-kiem-tra-extension.png` | Tạo cuộc họp mới, bước kiểm tra extension | (luồng) | Giao diện thật. Extension chưa cài trong lần chụp nên chưa có dấu tích |
| `08`–`11-extension-popup-*.png` | Popup extension 360×520: sẵn sàng, đang nghe, cảnh báo mic, thiếu khóa | Tiếp nhận và phiên âm | Giao diện thật; `chrome.*` được giả lập để dựng trang |
| `12-extension-panel-the-doi-chieu-mo-phong.png` | **Panel trong Meet**: transcript, thẻ đối chiếu, nhãn "Dữ liệu mẫu", 6 bước | Meeting workspace + thẻ claim | Panel thật trên **nền Meet dựng**; nội dung là dữ liệu mẫu |
| `13-extension-panel-the-mau-thuan-mo-phong.png` | Như trên, cuộn tới thẻ "Mâu thuẫn" kèm trích dẫn đặc tả | Fact-check và trạng thái bằng chứng | Như trên |

**Muốn ảnh panel trên Meet thật:** nạp lại extension, mở popup, tick "Chế độ thử", vào một cuộc Meet và bấm "Bắt đầu nghe". Panel sẽ chạy đúng kịch bản mẫu ngay trên trang Meet thật (nhãn "Dữ liệu mẫu" vẫn hiện, không ghi âm, không gõ vào chat). Chụp từ đó sẽ có nền Meet thật; chú thích vẫn phải ghi là dữ liệu mẫu.

## Bảng III.3.3 — đề xuất nội dung theo đúng hiện trạng

Ba mức: **Đã chạy** (đã chạy end-to-end với dịch vụ thật), **Giao diện mẫu** (giao diện hoàn chỉnh trên dữ liệu mẫu, chưa có backend), **Đang phát triển** (có code, chưa kiểm chứng với dịch vụ thật), **Chưa bắt đầu**. Chưa module nào ở mức "Đã chạy". Cột "Nhóm xác nhận" nên đổi thành "Căn cứ kiểm chứng".

| Module | Trạng thái | Căn cứ kiểm chứng |
|---|---|---|
| Tiếp nhận và phiên âm hội thoại | Đang phát triển | Code thu âm tab + micro → PCM 16 kHz → client Blaze STT, có test đơn vị. Chưa chạy với khóa Blaze và Meet thật |
| Nhận diện câu hỏi, claim, giả định | Giao diện mẫu | Thẻ phân loại câu hỏi / nhận định / giả định / quyết định / phụ thuộc hiển thị trên dữ liệu mẫu (ảnh 02, 12). Chưa có mô hình phát hiện thật |
| Truy xuất knowledge base người dùng | Giao diện mẫu | Kho tài liệu và ô truy xuất trả đoạn kèm trích dẫn (ảnh 06) chạy trên dữ liệu mẫu và khớp từ khóa. Chưa có tải lên, embedding, pgvector |
| Nghiên cứu web và so sánh nguồn | Đang phát triển | Có tìm nguồn Exa + lý do chọn + loại URL bịa (có test). Chưa chạy thật; thuộc sau MVP theo tài liệu |
| Fact-check và trạng thái bằng chứng | Giao diện mẫu | Bốn trạng thái và trích dẫn hiển thị đủ (ảnh 02, 12, 13) trên dữ liệu mẫu. Chưa có phép đối chiếu thật |
| Tạo artifact | Giao diện mẫu | Bản xem trước báo cáo và tải .md dựng từ các thẻ mẫu (ảnh 05). Chưa xuất DOCX/PPTX/XLSX; thuộc sau MVP |
| Session Context Memory | Đang phát triển | Cửa sổ transcript, lưu phiên và đồng bộ lên web có test; bối cảnh phiên hiển thị trên dữ liệu mẫu (ảnh 03). Chưa chạy trên Meet thật |
