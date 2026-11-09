# Plan lấp khoảng trống prototype (mục III.3.3)

Ngày: 04/11/2026. Nguồn yêu cầu: PO giao điền bảng III.3.3 và chèn ảnh "meeting workspace, thẻ claim kèm trạng thái bằng chứng, artifact được tạo". Hiện trạng và ảnh: `docs/screenshots/README.md`.

Quy ước: **[FS]** full-stack (extension + web + backend), **[AI]** hai AI Engineer (prompt, đánh giá), **[PM]**. Cỡ: S ≤ 1 ngày, M 2–3 ngày, L ~1 tuần.

## 00. Đã dựng giao diện mô phỏng cho phần còn thiếu (04/11)

Để có ảnh cho Hình 3 mà không phải đợi backend: giao diện đầy đủ cho bốn phần chưa có (thẻ claim + trạng thái bằng chứng, bối cảnh phiên, kho tài liệu + truy xuất, artifact) đã được dựng trên **dữ liệu mẫu** và tự gắn nhãn "Dữ liệu mẫu". Ảnh và cách ghi chú thích trung thực: `docs/screenshots/README.md`. Đây không làm các module đó thành "đã chạy"; chúng ở mức **Giao diện mẫu**.

### Khi có backend hoặc khóa thì thay chỗ nào

Hợp đồng dữ liệu (`lib/evidence.ts`: `KnowledgeCard`, `EvidenceStatus`, `Citation`) và giao thức (`card` trong `lib/bridgeProtocol.ts`) **giữ nguyên**; chỉ thay phần sinh dữ liệu.

| Phần giả hiện nay | Thay bằng | Ai |
|---|---|---|
| `extension/src/mock.ts` phát kịch bản `mocks/meeting-claims.json` | Pipeline thật: STT → phát hiện nhận định → truy xuất → đối chiếu, phát cùng các sự kiện `line`, `stage`, `card` | FS + AI |
| `lib/mockApi.ts` `searchKnowledgeBase` (khớp từ khóa trên `mocks/kb.json`) | Truy vấn Supabase pgvector (Context Router: đưa trực tiếp hay top-k) | FS + AI |
| `initialDocs` đọc từ `mocks/kb.json`; nút "Thêm tài liệu" chỉ giữ trong trang | Tải lên → trích xuất → chia đoạn → embedding → lập chỉ mục | FS |
| `sessionCards` của cuộc họp mẫu seed từ JSON trong `DashboardShell.tsx` | Đã nối sẵn: phiên do extension ghi mang `cards`, web gộp qua `sessions.list` | (xong) |
| Nút Hữu ích / Không hữu ích chỉ đổi trạng thái cục bộ | Gửi `meetmate.feedback` về backend và ghi log | FS |
| `reportMarkdown` dựng báo cáo từ thẻ | Sinh artifact thật (sau MVP) | AI + FS |
| Nhãn "Dữ liệu mẫu" (`ev-sample`, pill panel) | Bỏ khi dữ liệu thật; panel đọc cờ `mock` từ sự kiện trạng thái | FS |

## 0. Hiện trạng một dòng cho PO

| Phần PO đòi | Có chưa |
|---|---|
| Meeting workspace | **Có** (panel trong Meet + web), chưa chụp được từ Meet thật |
| Thẻ claim kèm trạng thái bằng chứng | **Giao diện mẫu** (ảnh 02, 12, 13) — chưa có phát hiện claim, tài liệu, truy xuất hay đối chiếu thật |
| Artifact được tạo | **Giao diện mẫu** (ảnh 05) — bản xem trước và tải .md dựng từ thẻ mẫu; tài liệu ghi là sau MVP |

## 1. Việc làm ngay để có ảnh thật (≈ 1 ngày) — [FS]

| # | Task | Xong khi |
|---|---|---|
| 1.1 | Lấy khóa Blaze + Exa; chạy extension trên một cuộc Meet thật (2 người) | Chạy hết luồng: nghe → chủ đề → nguồn → tin vào chat |
| 1.2 | Ghi lại và sửa những gì lệch: selector chat Meet, nút Rời cuộc gọi, tên model LLM (`GET /v1/models`), STT có cần `commit` | `config.ts`, `selectors.ts` chốt theo thử thật |
| 1.3 | Chụp lại ảnh 10 từ **Meet thật** (panel + chat có tin `MeetMate:`), và ảnh web với phiên thật | Thay các ảnh "mô phỏng" |
| 1.4 | Sau đó mới đổi cột trạng thái module 1, 4, 7 từ "Đang phát triển" lên "Đã chạy" nếu thử thật đạt | Căn cứ ghi rõ ngày và cách thử |

## 2. Thẻ claim + trạng thái bằng chứng (phần PO đòi nhưng chưa có) — ≈ 2 tuần

Đây là lõi MVP theo tài liệu. Làm theo lát cắt dọc: dùng tài liệu nạp cục bộ (đường "Direct Context"), chưa cần Supabase.

| # | Task | Owner | Cỡ | Xong khi |
|---|---|---|---|---|
| 2.1 | Hợp đồng dữ liệu `Claim`, `EvidenceStatus` (4 trạng thái), `KnowledgeCard` trong `lib/types.ts` | FS + AI | S | Hai bên cùng import, web và extension biên dịch |
| 2.2 | Prompt phát hiện Question / Claim / Assumption / Decision + loại câu trùng, thuật ngữ Việt–Anh | AI | M | Precision/recall đo được trên 30–50 câu gán nhãn tay |
| 2.3 | Prompt đối chiếu → 4 trạng thái + trích dẫn tên tài liệu/mục, theo ranh giới 20%/50% của tài liệu; "Chưa đủ căn cứ" khi tài liệu không nhắc | AI | M | Ví dụ "API 20 bản ghi" so với đặc tả 50 → Contradicted |
| 2.4 | Nạp tài liệu cục bộ (txt, md, docx) ở web, lưu IndexedDB, extension đọc | FS | M | Tải một PRD lên là dùng được trong họp |
| 2.5 | Thay `topic.ts`/`research.ts` bằng `claim.ts`/`verify.ts`; giữ Exa sau cờ tắt mặc định | FS | M | Panel nhận nhận định thay vì chủ đề |
| 2.6 | Knowledge Card ở panel và web (trạng thái, tóm tắt, trích dẫn, nút Hữu ích / Không hữu ích) theo giải phẫu bài đăng của `MEETMATE-DESIGN.md` | FS | M | Card hiện đủ 4 trạng thái |
| 2.7 | Chụp ảnh thẻ claim từ cuộc họp thật với tài liệu thật | FS + PM | S | Thay chỗ trống Hình 3 |

**Nếu PO cần ảnh trước khi xong mục 2:** chỉ có hai lựa chọn trung thực: (a) chụp panel hiện tại (nguồn web, không phải claim) kèm chú thích đúng; (b) một bản thiết kế mục tiêu, ghi rõ "thiết kế, chưa phải sản phẩm". Không dùng dữ liệu mẫu làm ảnh "đã chạy".

## 3. Knowledge base thật (module 3) — ≈ 2 tuần, sau mục 2

| # | Task | Owner | Cỡ |
|---|---|---|---|
| 3.1 | Supabase: schema, đăng nhập, RLS theo người dùng/phiên | FS | L |
| 3.2 | Tải lên PDF/DOCX/XLSX → trích xuất → chia đoạn → embedding → pgvector; trang Tài liệu hết dữ liệu mẫu | FS | L |
| 3.3 | Context Router (đưa trực tiếp hay top-k), đo Recall@5 | AI | M |
| 3.4 | API `verify` ở backend giữ khóa LLM; extension chỉ gọi API bằng token | FS | M |

## 4. Artifact (module 6) và nghiên cứu nguồn ngoài (module 4)

Theo tài liệu thuộc **sau MVP** (T2/2027 trở đi). Chưa lên lịch. Việc cần làm bây giờ chỉ là sửa tài liệu: ghi "định hướng sau MVP" ở bảng III.3.3 thay vì "Đang phát triển", và gắn nhãn "giao diện mẫu" cho tab Artifact trên web nếu đưa ảnh vào.

## 5. Phần tài liệu — [PM]

- Dùng bảng trạng thái ở `docs/screenshots/README.md` thay bảng hiện tại; đổi "Nhóm xác nhận" thành "Căn cứ kiểm chứng".
- Các số ở mục V.3.3 (F1 83,9%, độ trễ 8,4 giây…) đang ghi "mô phỏng": chưa có phép đo nào sinh ra chúng trong repo. Hoặc đo thật (mục 2.2–2.3 + bộ dữ liệu vàng), hoặc ghi rõ "mục tiêu".
- Điền các ô `CẦN ĐIỀN` ở mục VII (số buổi phỏng vấn, người thử, cuộc họp đã chạy…).

## Thứ tự đề xuất

1.1 → 1.4 (hôm nay/ngày mai) → 2.1 → 2.2/2.3 song song với 2.4/2.5 → 2.6 → 2.7 → mục 3.
