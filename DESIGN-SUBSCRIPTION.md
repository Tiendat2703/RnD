# DESIGN-SUBSCRIPTION.md — trang Gói dịch vụ (Subscription)

Phạm vi: riêng trang `/dashboard/upgrade` và thẻ gói ở đáy thanh trái. Hai phần:

- **Phần A** — bản ghi tham chiếu (reference capture) trang Subscription của ElevenLabs, đo từ 7 ảnh chụp màn hình.
- **Phần B** — bản đặc tả MeetMate áp dụng: lấy gì, bỏ gì, và thay bằng token của MeetMate.

Hợp đồng thiết kế của sản phẩm vẫn là `MEETMATE-DESIGN.md`; file này chỉ mở rộng cho một trang và **không** thay thế nó.

## Nguồn và giới hạn của phần A

- Trang gốc (`elevenlabs.io/app/subscription/creative`) nằm sau đăng nhập, và trong phiên làm việc không có công cụ clone nào. Nguồn duy nhất là 7 ảnh chụp bạn gửi (thẻ gói ở thanh trái, nút Upgrade, toàn trang, hai thẻ hạn mức, hàng thẻ gói, bảng so sánh, FAQ).
- Số đo lấy bằng cách quét điểm ảnh trên ảnh chụp. Sai số 1–2px, và màu bị ảnh hưởng bởi nén ảnh. **Đây không phải CSS thật.**
- **Phông chữ không xác nhận được.** Chữ trong ảnh là một sans-serif kiểu grotesque (giống Inter) nhưng tôi không có bằng chứng, nên không ghi tên.
- Hover, active, focus, hoạt ảnh chuyển carousel: ảnh tĩnh không cho thấy, **không đo được**.

## Ranh giới sử dụng (theo `CLAUDE.md`)

Cơ chế tương tác và bố cục được tái sử dụng. **Không** lấy: tên, logo, nội dung chữ, phông chữ, màu cam của huy hiệu "Popular", biểu tượng, hay màu nền kẻ sọc của nút Upgrade. MeetMate dùng token, phông, chữ Việt và đơn vị tiền của riêng mình.

---

# Phần A — Bản ghi tham chiếu (ElevenLabs)

## A1. Cấu trúc trang, từ trên xuống

1. Thanh trên: breadcrumb, ô tìm kiếm giữa, nút Feedback / Docs / Ask, chuông, avatar.
2. Tiêu đề trang "Subscription", rồi hàng tab sản phẩm (ElevenCreative / ElevenAgents / ElevenAPI), gạch chân tab đang chọn.
3. **Hàng hạn mức**: hai thẻ cạnh nhau. Trái: "Credits used" + thanh tiến trình, số `0 credits / 10,000 credits` căn phải. Phải: "You're currently on Free plan" + nút phụ có biểu tượng (Billing).
4. **Thanh điều khiển gói**: công tắc `Monthly | Yearly (save 2 months)` bên trái; nút "Talk to Sales" và hai mũi tên cuộn trái/phải bên phải.
5. **Hàng thẻ gói** cuộn ngang (thấy 5 thẻ, tổng 7). Mỗi thẻ gồm vùng trên trắng (tên, giá, ghi chú, nút) và vùng dưới xám (danh sách tính năng).
6. **Compare plans**: tiêu đề, hàng pill chọn nhóm (Text to Speech, Speech to Text…), bảng với cột gói và hàng thuộc tính.
7. **FAQ**: tiêu đề + nút Ask, danh sách câu hỏi accordion, mũi tên chevron.

## A2. Số đo (từ ảnh toàn trang rộng 1919px)

| Thành phần | Đo được |
|---|---|
| Thanh bên | rộng ~255px, nền `#fafafa` |
| Khung nội dung | ~1152px (x 505 → 1657), căn giữa vùng chính |
| Thẻ gói | rộng ~240px, khoảng cách ~20px, bước ~260px |
| Nút trong thẻ gói | cao ~36px; nút chính nền `#0f0f10`, nút phụ nền trắng viền `#e5e5e5` |
| Hàng bảng so sánh | cao ~45px, đường kẻ 1px |
| Hàng FAQ | cao ~53px, đường kẻ 1px, cột rộng ~800px căn giữa |
| Thẻ hạn mức | cao ~80px; thanh tiến trình cao ~12px (vạch ~10px), rộng gần hết thẻ |

## A3. Màu đo được

| Vai trò | Giá trị |
|---|---|
| Nền trang | `#ffffff` |
| Nền thanh bên, vùng tính năng của thẻ gói | `#fafafa` |
| Chữ và nút chính | `#0f0f10` |
| Viền thẻ hạn mức, nền thanh tiến trình | `#e5e5e5` |
| Viền thẻ gói | `#f1f1f1` (nhạt hơn viền thẻ hạn mức) |
| Huy hiệu "Popular" | cam, không dùng lại |

## A4. Hành vi đáng giữ lại

- Thẻ gói **đang dùng** có nút bị vô hiệu kèm dấu ✓ ("Current plan"), thay vì ẩn nút.
- Giá niêm yết gạch ngang kèm giá khuyến mãi, và ghi chú dưới giá.
- Dòng cuối danh sách tính năng của gói cao nói "gồm mọi thứ trong gói thấp hơn" (biểu tượng +), không lặp lại toàn bộ danh sách.
- Tính năng gói thấp **không có** hiển thị gạch ngang kèm ✕.
- Tên thuộc tính trong bảng so sánh có gạch chân chấm: rê chuột để xem giải thích.
- Nút "Upgrade" ở thanh bên là nút phụ nhỏ có biểu tượng, không phải một khối đen.

---

# Phần B — MeetMate áp dụng

## B1. Bảng ánh xạ

| ElevenLabs | MeetMate | Lý do |
|---|---|---|
| Tab sản phẩm | **Bỏ** | Sản phẩm chỉ có một mô hình định giá |
| "Credits used" 1 thanh | **Ba ô** phiên họp / lượt kiểm chứng / artifact, mỗi ô một thanh | Ba mẫu số khác nhau thì không có thanh tổng nào có nghĩa (bảng IV.3.1) |
| "You're on Free plan" + Billing | "Bạn đang dùng gói Free" + link **Xem giới hạn** | Chưa có thanh toán nên không có Billing |
| Monthly / Yearly (save 2 months) | **Theo tháng / Theo năm (tiết kiệm 2 tháng)** | Đúng "ưu đãi trả năm tương đương hai tháng miễn phí" của tài liệu |
| Talk to Sales | **Liên hệ pilot** | Gói Edu / Pilot B2B ký theo quý |
| Carousel 7 thẻ | **Lưới 4 thẻ** (Free, Pro, Team, Edu); cuộn ngang có snap khi hẹp | Chỉ có 4 gói, vừa một hàng |
| Huy hiệu "Popular" cam | **Bỏ** | "Nhiều người chọn" chưa có số liệu nào đỡ; nguyên tắc: không tuyên bố điều chưa có |
| Giá USD, credits | **Đồng**, viết `199.000đ/tháng` | Tài liệu dùng đồng, không có "credits" |
| Compare plans: pill nhóm | Pill nhóm: **Phiên họp và kiểm chứng**, **Tài liệu và nhóm** | Hàng bảng lấy từ `PLAN_MATRIX` |
| FAQ accordion | FAQ **7 câu, mỗi câu dựa vào bản mô tả** | Không viết câu trả lời không có trong tài liệu |
| Nút Upgrade có nền kẻ sọc | Nút phụ có biểu tượng, **không kẻ sọc** | Hợp đồng: không trang trí, không gradient |

## B2. Token (không dùng giá trị của ElevenLabs)

| Vai trò | Token MeetMate | Ghi chú |
|---|---|---|
| Nền trang | `--mm-ground` | Xám lạnh, không trắng thuần: MeetMate đứng cạnh chrome xám của Meet |
| Thẻ, thân thẻ gói | `--canvas` | Bề mặt "tờ giấy" |
| Vùng tính năng của thẻ gói, hàng lẻ | `--surface-subtle` | Thay cho `#fafafa` |
| Viền | `--hairline` cho chia vùng; `--mm-boundary` cho viền control | Viền hairline 1.31:1 không đủ cho control |
| Chữ, nút chính, thanh tiến trình | `--ink`, `--muted-ink` | Thanh hạn mức là "một sự thật về tiền của bạn", **không petrol** |
| Bo góc | thẻ 16px, pill 9999px, nút 24px | Theo `rounded` của hợp đồng; ElevenLabs bo ~8px, không lấy |
| Phông | Be Vietnam Pro (thân), Overpass (tiêu đề, nhãn), Overpass Mono (số) | Chữ Việt có dấu |

Petrol **không** xuất hiện trên trang này: không có gì ở đây do MeetMate "viết ra và chịu trách nhiệm".

## B3. Nội dung

- Giá và hạn mức lấy từ bảng IV.3.1 qua `PLANS` / `PLAN_MATRIX` trong `lib/dashboardData.ts`. Không thêm giá, không thêm gói.
- Dải **"Dự kiến"** ở đầu trang giữ nguyên: tài liệu ghi bảng giá là giả thuyết, nên chưa có nút nào thu tiền thật.
- Nút chọn gói chỉ hiện thông báo "bản demo, chưa nối thanh toán".
- Gói Team nhân giá theo số người (tối thiểu 3, tối đa 15) ngay trên thẻ. Chưa có giá năm cho Team trong tài liệu, nên chế độ "theo năm" ghi rõ "giá năm chưa niêm yết".
- Câu về lưu dữ liệu 24 giờ trong FAQ nói theo thiết kế của bản mô tả và ghi rõ "chưa triển khai trong bản mẫu".

## B4. Bố cục và đáp ứng

| Chiều rộng | Bố cục |
|---|---|
| ≥ 1100px | Khung tối đa 1180px căn giữa; hàng hạn mức 2 cột; 4 thẻ gói một hàng |
| 760–1100px | 2 thẻ gói mỗi hàng; hạn mức xếp 1 cột |
| < 760px | 1 thẻ gói mỗi hàng; bảng so sánh cuộn trong hộp riêng, không cuộn ngang cả trang |

FAQ rộng tối đa 800px, căn giữa như bản tham chiếu.

## B5. Khả năng tiếp cận

- Công tắc kỳ hạn và pill nhóm bảng so sánh là `radiogroup` / `tablist` thật, có phím mũi tên.
- Mỗi câu FAQ là `<details>`: mở/đóng bằng bàn phím, đọc được bởi trình đọc màn hình.
- Bảng dùng `<th scope>`; ô "không có" vừa hiện dấu — vừa có chữ ẩn "Không có ở gói này".
- Thanh hạn mức là `role="progressbar"` có `aria-valuenow/min/max`.
- Viền control dùng `--mm-boundary` (≥ 3:1); focus là vòng 2px.

## B6. Chưa quyết định

- Hover / active của thẻ gói và nút: vẫn là đề xuất của hợp đồng (`needs-design-decision`), không lấy từ ảnh vì ảnh không cho thấy.
- Có nên làm carousel có mũi tên thật hay chỉ cuộn ngang khi có thêm gói: với 4 gói chưa cần.
