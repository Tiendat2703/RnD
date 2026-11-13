# Kế hoạch triển khai Presentation mode — MeetMate

Ngày lập: 13/11/2026.
Trạng thái: MVP đã triển khai; đang Review/QA. Meet thật, chia sẻ màn hình và đánh giá trên tập lớn còn chờ.
Nguồn yêu cầu: `C:/Users/THONG/Downloads/2026-11-13-presentation-mode.md`.
Baseline khảo sát: `E:/RnD-main`, main/auto-check tại `ae25725`.

## 1. Mục tiêu và phạm vi

Thêm mode Thuyết trình bên cạnh Assistant và Teacher: chuẩn bị checklist có nguồn từ tài liệu, theo dõi phần người dùng trình bày trên Google Meet, nhắc riêng nội dung thiếu hoặc lệch, xuất tổng kết sau phiên.

MVP:
- Một người thuyết trình trên một máy; dùng micro của người đó để đánh dấu nội dung.
- Chọn các tài liệu hiện được hệ thống đọc hỗ trợ; không thêm OCR trong task này.
- AI đề xuất checklist; người dùng sửa, thêm, bỏ và xác nhận trước khi bắt đầu.
- Tự đánh dấu ý đã đề cập, có câu nói và thời điểm làm căn cứ; cho đánh dấu/bỏ đánh dấu thủ công.
- Sai lệch phải có trích dẫn nguồn; không đồng nhất “đã nhắc đến” với “nói đúng”.
- Nút “Còn thiếu gì?” và nhắc nhẹ khi có tín hiệu kết thúc; không chen tiếng AI.
- Báo cáo checklist, các ý bỏ sót và sai lệch; tải PDF qua chức năng hiện có.
- Không tự gửi bất kỳ nội dung checklist hay gợi ý nào vào chat Google Meet.

Chưa thuộc MVP: chấm kỹ năng nói, chấm phát âm tiếng Anh, AI trả lời khán giả, slide tự chuyển, theo dõi nhiều diễn giả, cam kết panel vô hình khi chia sẻ toàn màn hình, hosting sản xuất.

## 2. Cơ sở kỹ thuật và điểm cần xác minh

Có thể tái sử dụng:
- Tài liệu: `lib/documents.ts`, backend `meetmate-server/documents.ts`, extension `src/docs/session.ts`.
- Giao thức/lưu phiên: `lib/bridgeProtocol.ts`, extension `background.ts`, `sessionStore.ts`.
- Thu âm/STT: extension `offscreen.ts` và các module capture/STT hiện có.
- Truy hồi và kiểm chứng nguồn: extension `doccheck.ts`, kho chunk/BM25.
- Hiển thị: wizard, monitor web, panel Meet và side panel extension.
- Lưu báo cáo: backend session service/store, `lib/report.ts`, route xuất PDF.

Không coi thành phần đã có là đáp ứng sẵn mode mới:
- Pipeline hiện yêu cầu keyword “trợ lý”; Presentation phải chủ động theo dõi nhưng chỉ trong mode này.
- Cần kiểm tra transcript có giữ nguồn micro/tab đến hết pipeline không; metadata source hiện hữu chưa đủ chứng minh tách được người nói.
- Tài liệu ý tưởng nhắc `feature/auto-check`; chưa thấy nhánh đó trong inventory đã đọc. Kiểm tra remote ở P0, không merge mù hoặc phụ thuộc vào một nhánh chưa xác minh.
- Panel trong trang Meet có thể bị thấy nếu chia sẻ cùng tab hoặc toàn màn hình. Riêng tư ở đây là không broadcast vào chat; UI phải chỉ rõ giới hạn chia sẻ màn hình.

## 3. Quy tắc quản lý

Trạng thái task: Todo → In progress → Review → Done; dùng Blocked khi có phụ thuộc cụ thể.
Mỗi task chuyển Review phải có: đường dẫn commit/PR, cách kiểm tra, kết quả thực tế và vấn đề còn lại.
Các task đánh dấu [x] đã có code và kiểm thử được ghi trong nhật ký dưới đây. Task còn [ ] có điều kiện nghiệm thu thực tế chưa đạt; không coi toàn bộ kế hoạch đã hoàn tất.
Mỗi phase chỉ nghiệm thu khi các task bắt buộc và tiêu chí phase đều đạt.

| Phase | Kết quả | Phụ thuộc | Ước lượng ngày công | Trạng thái |
|---|---|---|---|---|---|
| P0 | Xác minh thu âm, nhánh và UX riêng tư | Không | 1–2 | Review |
| P1 | Hợp đồng dữ liệu và lifecycle mode | P0 | 1–2 | Done |
| P2 | Chuẩn bị/checklist có nguồn | P1 | 2–3 | Done |
| P3 | Theo dõi và kiểm chứng lời trình bày | P2 | 3–5 | Review |
| P4 | UI nhắc bài và tích hợp phiên | P1, P2; hoàn tất sau P3 | 2–3 | Review |
| P5 | Lưu, phục hồi, báo cáo và PDF | P3, P4 | 1–2 | Done |
| P6 | QA thực tế và phát hành | P0–P5 | 2–3 | Review |

Tổng sơ bộ: 12–20 ngày công cho một người làm full stack. Đây là ước lượng lập kế hoạch, cần cập nhật sau P0; chưa gồm thời gian chờ dịch vụ hoặc review. P4 có thể dựng giao diện bằng fixture song song với P3 sau khi chốt schema.

## 4. Task theo từng phase

### P0 — Xác minh nền tảng và chốt hành vi

- [x] **P0.1 — Audit pipeline và auto-check**
  - Đọc luồng capture → STT → pipeline → panel → persistence; fetch danh sách remote để xác minh `feature/auto-check`.
  - Đầu ra: bảng tái sử dụng/thay đổi, ghi rõ thành phần chưa có; nếu có nhánh thì so sánh diff và chọn phần cần dùng.
  - Nghiệm thu: không còn phụ thuộc ngầm vào nhánh hoặc API chưa xác minh.
- [ ] **P0.2 — Thử micro và phân nguồn**
  - Thử micro được cấp quyền, bị từ chối, không có thiết bị, mất thiết bị; đồng thời phát âm thanh từ tab.
  - Đầu ra: ghi nhận nguồn STT thực tế và phương án giữ track micro riêng.
  - Nghiệm thu: tiếng khán giả từ tab không làm tick checklist; nếu chỉ nghe được tab, báo degraded và không bật auto-tick sai nguồn.
- [x] **P0.3 — Chốt trải nghiệm và phạm vi riêng tư**
  - Chốt chọn mode, người trình bày, tài liệu, checkpoint xác nhận, cách nhắc kết thúc và thao tác sửa tay.
  - Chọn side panel Chrome làm nơi nhắc chính; overlay trong Meet là tùy chọn và có cảnh báo khi chia sẻ màn hình.
  - Nghiệm thu: mô tả rõ khi nào nhắc, ai thấy, không có đường tự post chat/TTS trong Presentation.

Gate P0: xác định được cách nhận đúng lời diễn giả và mô hình hiển thị riêng tư; nếu chưa đạt thì giải quyết trước P3.

### P1 — Schema, protocol và vòng đời

- [x] **P1.1 — Định nghĩa dữ liệu**
  - Thêm `mode: assistant | presentation` cho phiên extension, thiếu trường hiểu là assistant; Teacher giữ lifecycle riêng hiện có.
  - Checklist gồm ID ổn định, nội dung, mức ưu tiên, nguồn chunk/trang/quote, trạng thái coverage và correctness độc lập.
  - Ví dụ: coverage `pending | partial | covered | skipped`; correctness `unchecked | supported | contradicted | uncertain`.
  - Lưu evidence: transcript ID, source, thời điểm, trích lời; thêm nguồn thay đổi `auto | manual`.
  - Nghiệm thu: ý đã nói sai vẫn có coverage nhưng còn cảnh báo; phần trăm không được trình bày như độ chính xác.
- [x] **P1.2 — Bridge và validation**
  - Mở rộng prepare/event/snapshot cho checklist, tick tay, hỏi thiếu ý và trạng thái degraded; kiểm tra payload runtime ở ranh giới web/extension/backend.
  - Gắn session ID, revision và event ID để không áp kết quả cũ hoặc nhận trùng.
  - Nghiệm thu: phiên cũ đọc được; dữ liệu thiếu/sai bị từ chối rõ; không lộ khóa API qua bridge.
- [x] **P1.3 — Lifecycle và hủy tác vụ**
  - Chuẩn bị → xác nhận checklist → nghe → tạm dừng/tiếp tục → kết thúc → lưu.
  - Khóa snapshot tài liệu/checklist khi bắt đầu; bản mới cần revision và chạy lại đánh giá phù hợp.
  - Nghiệm thu: đổi phiên/dừng phiên hủy AI đang chờ, không ghi kết quả sang phiên mới.

Gate P1: schema/version tương thích ngược và state machine có kiểm tra hợp đồng.

### P2 — Chuẩn bị checklist

- [x] **P2.1 — Chọn mode và tài liệu**
  - Bổ sung lựa chọn Presentation trong wizard và truyền snapshot tài liệu sang extension.
  - Nghiệm thu: thiếu tài liệu, file lỗi hoặc nội dung không trích xuất được đều có thông báo; không sinh checklist giả.
- [x] **P2.2 — Sinh checklist có căn cứ**
  - Model trả JSON theo schema; mỗi ý sinh tự động phải có trích dẫn được kiểm tra trong snapshot nguồn.
  - Gộp ý trùng, ưu tiên ý quan trọng; không tự thêm tính năng/con số ngoài tài liệu.
  - Nghiệm thu: citation sai bị loại hoặc yêu cầu tạo lại; tài liệu chứa chỉ dẫn không thay đổi quy tắc hệ thống.
- [x] **P2.3 — Editor và xác nhận**
  - Thêm/sửa/xóa/sắp xếp, chọn bắt buộc/tùy chọn và đánh dấu ý tự thêm chưa có nguồn.
  - Ý sửa làm đổi dữ kiện phải kiểm tra lại nguồn, không giữ nhãn “có căn cứ” cũ.
  - Nghiệm thu: lưu nháp/tải lại giữ nguyên chỉnh sửa; không bắt đầu theo dõi trước xác nhận.

Gate P2: có checklist người dùng đã xác nhận và nguồn kiểm chứng được.

### P3 — Theo dõi nội dung và sai lệch

- [x] **P3.1 — Adapter transcript dành cho Presentation**
  - Chỉ xử lý final transcript của micro người trình bày; bỏ duplicate, gom theo lượt nói/cửa sổ ngắn.
  - Presentation không cần keyword; Assistant giữ hành vi keyword cũ.
  - Nghiệm thu: partial, audio tab và câu lặp không làm tick trùng hoặc gọi AI vô hạn.
- [x] **P3.2 — Đối sánh checklist**
  - Dùng diễn đạt ngữ nghĩa thay vì chỉ keyword; phân biệt nhắc chủ đề với đã diễn giải đủ ý.
  - Chỉ cập nhật item ID có thật; evidence phải trỏ câu đã nhận; mức không chắc giữ pending/partial.
  - Nghiệm thu: paraphrase đúng được tick, chỉ nhắc tên chủ đề chưa đủ không được tick covered.
- [x] **P3.3 — Phát hiện lệch tài liệu**
  - Dùng truy hồi và check nguồn hiện có; chuẩn hóa số, đơn vị, làm tròn, khoảng xấp xỉ, thời gian và phạm vi khẳng định.
  - “2 giây” so với “1,8 giây” không mặc định sai: phân biệt con số chính xác với cách nói xấp xỉ; cấu hình chính sách dung sai và thử với dữ liệu thực.
  - Không cảnh báo mâu thuẫn cho câu giả định/đề xuất/câu hỏi hoặc tài liệu không nói đến.
  - Nghiệm thu: cảnh báo gồm câu đã nói + dữ kiện nguồn + vị trí; không có citation hợp lệ thì không khẳng định người dùng sai.
- [x] **P3.4 — Giữ quyền sửa tay và giảm nhiễu**
  - Sửa tay có ưu tiên; kết quả AI đến muộn không ghi đè. Cho hoàn tác hoặc bật lại tự theo dõi từng ý.
  - Dedupe/cooldown cảnh báo; giới hạn concurrency, coalesce hàng đợi và hủy khi kết thúc.
  - Nghiệm thu: replay event, reconnect và phản hồi AI đảo thứ tự không làm sai trạng thái.

Gate P3: đạt bộ kịch bản gold đã gắn nhãn coverage/correctness; ghi riêng false positive và false negative, không chỉ tỷ lệ tick.

### P4 — UI nhắc riêng

- [x] **P4.1 — Checklist realtime**
  - Hiện ý bắt buộc đã nói/tổng số, pending/partial, evidence và nút tick tay; tách rõ ý skipped.
  - Side panel là chính; web monitor đồng bộ; overlay chỉ khi người dùng bật.
  - Nghiệm thu: một panel mỗi trang, bàn phím dùng được, nội dung không tràn; báo micro mất hoặc AI lỗi mà không xóa checklist.
- [x] **P4.2 — Nút “Còn thiếu gì?”**
  - Chọn các ý chưa nói quan trọng nhất, gợi ý câu nối ngắn dựa vào tài liệu; không bịa dữ kiện.
  - Nghiệm thu: thao tác có trạng thái chờ/lỗi; không bật mic, phát tiếng hoặc gửi chat ngoài yêu cầu.
- [x] **P4.3 — Nhắc khi sắp kết thúc**
  - Phát hiện tín hiệu kết thúc trong lời diễn giả, xét ngữ cảnh; chỉ gợi ý nếu còn ý bắt buộc thiếu.
  - Một lời nhắc ngắn có cooldown và có thể bỏ qua; câu “ở phần kết tôi sẽ…” chưa được coi là kết thúc.
  - Nghiệm thu: không nhắc lại dồn dập, không ngắt lời, có nút tắt tự nhắc.
- [ ] **P4.4 — Chặn đường broadcast**
  - Chặn post chat từ tầng điều phối theo mode, không chỉ ẩn nút; tắt mặc định overlay và giải thích chọn vùng chia sẻ.
  - Nghiệm thu: spy/test xác nhận không gọi gửi chat trong Presentation kể cả cấu hình autoPost cũ đang bật; thử chia sẻ tab/cửa sổ/toàn màn hình thực tế và ghi giới hạn.

Gate P4: người trình bày theo dõi được mà không spam hoặc gửi nhầm dữ liệu cho khán giả.

### P5 — Lưu, phục hồi và báo cáo

- [x] **P5.1 — Persist snapshot/event và phục hồi**
  - Lưu checklist, revision, evidence, manual overrides, nhắc và trạng thái phiên vào kho phiên hiện có; backend nhận dữ liệu tương ứng.
  - Nghiệm thu: tải lại web, đóng/mở panel, service worker ngủ rồi tỉnh không mất checklist; phiên Assistant/Teacher cũ vẫn đọc được.
- [x] **P5.2 — Tổng kết đúng dữ liệu**
  - Số ý bắt buộc đã nói/tổng, partial, bỏ sót, skipped, sai lệch chưa xử lý; link về câu nói và nguồn.
  - Tính thống kê bằng code từ snapshot, không để LLM tự đếm; nhận xét AI là phần tách riêng.
  - Nghiệm thu: denominator và thao tác sửa tay được phản ánh đúng; checklist rỗng không chia cho 0.
- [x] **P5.3 — PDF và xử lý lỗi**
  - Dùng route PDF hiện có, thêm nội dung tổng kết; thông báo thành công chỉ khi có file tải thật.
  - Nghiệm thu: tiếng Việt, nguồn, phân trang, nội dung dài và tải lại hoạt động; backend/PDF lỗi vẫn giữ nguyên phiên, không giới hạn lượt tải.

Gate P5: mở lại phiên và tải được báo cáo khớp dữ liệu đã chốt.

### P6 — Kiểm thử và phát hành

- [ ] **P6.1 — Bộ fixture và đánh giá chất lượng**
  - Tài liệu demo có 8–12 ý, bản nói đủ, thiếu, paraphrase, nói sai số, xấp xỉ hợp lệ, tự sửa, audience nhắc hộ và kết thúc giả.
  - Gắn nhãn thủ công; chốt ngưỡng chất lượng trước pilot. Gợi ý ban đầu: precision auto-tick ≥95%, recall ≥85% trên tập demo; chưa phải cam kết cho mọi cuộc họp.
- [x] **P6.2 — Unit/integration và regression**
  - Kiểm tra schema, nguồn, matching, số/đơn vị, dedupe, manual override, hủy tác vụ, persistence và privacy guard.
  - Chạy kiểm tra frontend/backend/extension hiện có và luồng Assistant keyword + Teacher micro.
  - Nghiệm thu: kiểm tra liên quan pass; fixture không thay thế kiểm chứng nhà cung cấp thật.
- [ ] **P6.3 — E2E Chrome và thử Meet thật**
  - Chrome với mic giả để tự động hóa; phiên Google Meet thật để kiểm tra mic/tab, mở panel, mất mạng, stop/restart và screen sharing.
  - Đo từ final STT đến cập nhật checklist, lỗi và chi phí/phiên; mục tiêu thử nghiệm p95 ≤5 giây trong điều kiện ghi rõ, điều chỉnh sau đo.
  - Nghiệm thu: không gửi chat ngoài ý muốn, không tick từ tiếng khán giả, dữ liệu lưu lại đúng, lỗi hiển thị rõ.
- [ ] **P6.4 — Tài liệu vận hành và release**
  - Hướng dẫn chọn tài liệu, cấp micro, tải extension, chia sẻ vùng an toàn, cấu hình khóa, khôi phục lỗi và xóa dữ liệu.
  - Feature flag cho mode mới, tăng version extension, changelog, hướng dẫn reload; tắt mode mới để rollback mà không xóa dữ liệu cũ.
  - Nghiệm thu: demo hoàn chỉnh chuẩn bị → nói → nhắc → kết thúc → PDF trên build release.

## 5. Milestone để quản lý

| Mốc | Bao gồm | Bằng chứng hoàn tất |
|---|---|---|
| M0 — Feasibility | P0 | Mic/tab tách đúng; chốt UX và dependency |
| M1 — Chuẩn bị được | P1–P2 | Tạo, sửa, xác nhận checklist có nguồn |
| M2 — Theo dõi được | P3 | Kịch bản gắn nhãn chạy đúng, không mất sửa tay |
| M3 — Demo được | P4–P5 | Nhắc riêng và báo cáo/PDF xuyên suốt |
| M4 — Pilot được | P6 | E2E + Meet thật, số liệu chất lượng/độ trễ/chi phí |

## 6. Rủi ro và quyết định

| Rủi ro | Cách xử lý | Task chịu trách nhiệm |
|---|---|---|
| Không lấy được micro hoặc lẫn audience | Kiểm chứng sớm, giữ nguồn track, degraded rõ | P0.2, P3.1 |
| Tick nhầm làm người nói bỏ ý | Evidence bắt buộc, threshold bảo thủ, sửa tay | P3.2, P3.4 |
| Nhắc sai do STT hoặc làm tròn số | Giữ uncertainty, kiểm đơn vị/phạm vi/xấp xỉ | P3.3 |
| Lộ gợi ý khi chia sẻ màn hình | Side panel chính, không post chat, cảnh báo đúng giới hạn | P0.3, P4.4 |
| AI chậm/chi phí tăng khi nghe liên tục | Gom câu, truy hồi hẹp, hủy request cũ, đo chi phí | P3.4, P6.3 |
| Tài liệu đổi sau khi tick | Snapshot + revision, không trộn nguồn | P1.3 |
| Lộ dữ liệu sản phẩm | Chỉ gửi context cần thiết; khóa ở cấu hình riêng; quy định lưu/xóa | P6.4 |

Không hứa tự xóa sau 24 giờ nếu chưa có cơ chế và kiểm tra thực tế. Bỏ giới hạn gói không đồng nghĩa bỏ giới hạn kỹ thuật như kích thước file, context model, retry hoặc concurrency.

## 7. Mẫu cập nhật cho từng task

```text
Task ID / tiêu đề:
Owner:
Trạng thái: Todo
Phụ thuộc:
Phạm vi:
Điều kiện nghiệm thu:
Commit / PR:
Cách kiểm tra + kết quả:
Rủi ro hoặc blocker:
Ngày cập nhật:
```

Bước tiếp theo: kết nối Chrome, chạy nghiệm thu Meet thật cho P0.2/P4.4/P6.3 và đánh giá chất lượng diện rộng P6.1 trước khi phát hành P6.4.


## 8. Nhật ký triển khai — 13/11/2026

- M0: đã xác minh main và feature/auto-check cùng commit ae25725, không merge thêm. Code cũ trộn micro/tab; Presentation đã có đường chỉ micro, denied mic không fallback. Phần phần cứng/Meet thật còn chờ nên P0 ở Review.
- M1: schema/validation, checklist từ nguồn, editor và xác nhận đã chạy. Thêm mode Thuyết trình trong wizard; tài liệu và revision cố định khi bắt đầu.
- M2: đối sánh không cần keyword, tách coverage/correctness, evidence trỏ lời micro, sửa tay ưu tiên, hủy tác vụ, kiểm tra cả sai lệch ngoài checklist và lời tự sửa. Unit và 5 ca Blaze thật pass; precision/recall trên tập rộng chưa đo nên gate P3 còn Review.
- M3: side panel + web, không chèn overlay vào Meet. Đây là quyết định MVP về riêng tư; chưa cung cấp tùy chọn bật overlay. Chặn post chat ở background; cần thử chia sẻ màn hình thật để nghiệm thu P4.4.
- M3: lưu snapshot, giữ câu evidence khi cắt cửa sổ transcript, báo cáo xác định và PDF thật. Browser test kiểm tra reload, mobile và file %PDF-; PDF được render/đọc lại tiếng Việt.
- M4: frontend TypeScript, backend TypeScript; 510 unit/regression test pass, 5 browser test pass, extension build 0.4.0 và production Next build pass.
- Blaze thật: tài liệu tổng hợp 10 ý; 5/5 ca cuối pass. Lần cuối 3.359–4.283 giây/câu (có debounce); lượt trước đã có 6.462 giây. Chưa thể kết luận đạt p95 ≤5 giây hoặc chi phí phiên thực tế từ số mẫu nhỏ này.
- Các gate còn chờ: P0.2, P4.4, P6.1, P6.3, P6.4. Chưa công bố đã kiểm tra micro, khán giả, chia sẻ màn hình hoặc phát hành lên Chrome của người dùng.
- Các thay đổi hiện nằm trong working tree E:/RnD-main; chưa commit/push trong task này.

Chi tiết chạy, phạm vi test, rollback và checklist Meet thật: [presentation-mode-verification.md](presentation-mode-verification.md).

### Cập nhật nghiệm thu Meet thật

Đã nối Chrome, dùng micro thật, tự tick 6/8 ý (2 partial vì STT nhận sai từ), nhắc thiếu khi kết thúc, lưu backend và tải PDF thật. Ca sai số 200 nghìn chưa có trong transcript nên vẫn để mở. Không đánh dấu xong kiểm tra audience/tab, chia sẻ màn hình, mất thiết bị/mạng hoặc rời Meet tự đóng phiên. Chi tiết bằng chứng trong presentation-mode-verification.md.
