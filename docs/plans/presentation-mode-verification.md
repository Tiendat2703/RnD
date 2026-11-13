# Presentation mode — hướng dẫn và nghiệm thu

Ngày: 13/11/2026. Baseline: main/auto-check `ae25725`. Extension: 0.4.0.

## Sử dụng

1. Chạy frontend `npm run dev` tại root và backend `npm run meetmate:server` tại `agents/sidekick`.
2. Backend cần `BLAZE_API_KEY` trong `.env.local` để tạo checklist. Extension dùng khóa Blaze riêng đã nhập trong Cài đặt; Exa không cần cho Presentation.
3. Thêm tài liệu tại trang Tài liệu. Tạo Cuộc họp mới → Thuyết trình → chọn tài liệu → Tạo checklist.
4. Sửa/sắp xếp/thêm/xóa ý, chọn bắt buộc và xác nhận checklist. Sửa nội dung sẽ bỏ nguồn đã xác minh của ý đó, tránh gắn nguồn cũ cho dữ kiện mới.
5. Gửi phiên sang extension. Cần bản 0.4.0 trở lên; build bằng `npm run extension:build` trong `agents/sidekick`, reload tại `chrome://extensions` và tải lại web/Meet sau khi nâng phiên bản.
6. Trong Meet, chọn đúng phiên ở side panel và bấm biểu tượng MeetMate để bắt đầu. Cấp micro nếu được yêu cầu. Presentation chỉ thu micro, không đưa track âm thanh tab vào STT. Nên dùng tai nghe để giảm tiếng loa lọt vật lý vào micro.
7. Xem checklist ở side panel hoặc web. Có thể sửa coverage bằng tay, bật lại theo dõi tự động, hỏi “Còn thiếu gì?”, tạm dừng và tắt nhắc kết thúc. Tạm dừng ngừng xử lý/ghi các câu mới vào checklist, không tắt thiết bị micro; nút Dừng/Kết thúc giải phóng thiết bị.
8. Kết thúc, mở Chi tiết → Thuyết trình để xem lại và tải PDF. Tab Báo cáo có thể lưu lên backend; báo cáo Presentation được tính từ snapshot, không cần gọi model để đếm.

Coverage và correctness độc lập: “đã nói” không có nghĩa là “nói đúng”. Ý skipped vẫn hiện trong tổng số ý bắt buộc và được thống kê riêng. Ý không có nguồn không được AI gắn nhãn contradicted/supported.

## Riêng tư và phạm vi

- Presentation không gửi chat hoặc phát TTS. Background kiểm tra mode trước mỗi lần gửi chat, kể cả cấu hình auto-post cũ bật.
- Không dựng overlay trong trang Meet cho mode này; checklist chỉ có ở side panel và web. Không có công tắc bật overlay trong MVP.
- Side panel/web không bảo đảm vô hình nếu chia sẻ toàn màn hình hoặc cửa sổ chứa chúng. Chọn chia sẻ riêng slide/tab nội dung, kiểm tra preview chia sẻ trước khi nói.
- Nội dung micro được gửi Blaze để nhận dạng và đối chiếu. Snapshot tài liệu/checklist và transcript được lưu trong extension; khi bấm Lưu phiên sẽ gửi backend.
- Bản nháp checklist nằm trong localStorage trình duyệt theo bộ ID tài liệu. Có thể xóa trong dữ liệu website; không có cam kết tự xóa theo thời gian.
- Đổi tài liệu sau xác nhận: tạo checklist/phiên mới. Không thêm tài liệu vào phiên Presentation đang chạy hoặc draft đã khóa.
- Một người trình bày. Không gán tên diễn giả từ audio trộn và không chấm cách nói/phát âm.

## Kiến trúc

- `lib/presentation.ts`: schema runtime, kiểu dùng chung, thống kê, hint có căn cứ, Markdown.
- `meetmate-server/presentation.ts`: tạo checklist qua Blaze từ tài liệu backend; mỗi quote kiểm tra nguyên văn.
- `POST /api/presentation/checklist`: nhận ID tài liệu đã tải lên; tối đa 80.000 ký tự để tạo checklist, thông báo lỗi thay vì cắt ngầm nguồn.
- `PresentationSetup`: editor, bản nháp, xác nhận. Snapshot nguồn cố định gửi cùng phiên.
- `presentation-pipeline.ts`: hàng đợi một request, gom lời final micro, đối sánh ngữ nghĩa, truy hồi BM25 để kiểm tra sai lệch ngoài checklist, ghi nhận lời tự sửa, evidence, sửa tay ưu tiên, hủy khi pause/stop, dedupe và cooldown.
- `presentation.action`: session ID + revision để chặn thao tác sai phiên. Snapshot sequence dùng bỏ event cũ/trùng ở kho phiên và UI.
- `audio.ts`: đường microphoneOnly không gọi getUserMedia cho tab, lỗi micro không fallback sang lời khán giả.
- Background: giữ snapshot, chuyển cho web, chặn chat; content script chỉ theo dõi rời Meet, không dựng UI riêng tư lên tab.
- Backend kiểm tra evidence trỏ vào transcript micro có thật, giữ snapshot và tạo thống kê xác định. Kho transcript giữ lại câu được checklist dùng làm evidence dù vượt cửa sổ transcript thông thường.
- Phiên cũ không có mode vẫn là Assistant; Teacher không đổi luồng.

## Kiểm thử

```powershell
# Root
npm run lint
npx playwright test tests/presentation.spec.ts tests/teacher.spec.ts tests/teacher-voice.spec.ts
npm run build

# agents/sidekick
npm run check
npm test
npm run extension:build
# Synthetic content, gọi Blaze thật và có chi phí nhà cung cấp:
npx tsx --env-file=.env.local scripts/verify-presentation.ts
```

Kết quả đã quan sát:
- Production Next build và extension build 0.4.0 pass.
- Bộ unit/regression hiện có cùng test mới: 510 test pass.
- 5 browser test pass: tạo/thay đổi checklist, PDF thật, mobile, reload giữ snapshot; Assistant setup, Teacher nhóm và micro/denied-micro vẫn chạy.
- Blaze thật: tạo 10 ý từ tài liệu tổng hợp; 5/5 ca kiểm tra pass: paraphrase có số viết chữ, sai số chính xác, làm tròn xấp xỉ, câu hỏi giả định, chỉ nhắc tên chủ đề.
- Thời gian final text → snapshot ở 5 mẫu: Lần cuối 3.359–4.283 giây, gồm 1,2 giây gom câu. Lượt trước có mẫu 6.462 giây vượt mục tiêu 5 giây; chưa đạt/chưa chứng minh mục tiêu p95 ≤5 giây hoặc precision/recall trên tập lớn.
- PDF đã đọc lại được tiếng Việt, kiểm tra header `%PDF-` và render ảnh để xem bố cục.

Giới hạn kiểm chứng: browser test dùng bridge/STT/model giả ở phần cần kiểm soát; kiểm tra Blaze thật chỉ dùng văn bản tổng hợp, chưa chứng minh STT/micro và chia sẻ màn hình trên Google Meet thật.

## Nghiệm thu Meet thật còn chờ

- [ ] Kết nối Chrome của người dùng vào chat; reload extension 0.4.0.
- [ ] Cuộc Meet thử không có người khác; thu micro thật có/không có tai nghe.
- [ ] Phát tiếng tab khi người trình bày im lặng: không tự tick do track tab.
- [ ] Quyền micro bị từ chối, mất thiết bị, rớt mạng rồi nối lại: lỗi đúng, checklist không mất.
- [ ] Khán giả nhìn vùng chia sẻ thử: không lộ checklist trong cách chia sẻ đã chọn.
- [ ] Rời cuộc gọi ngay trong Meet: phiên kết thúc, micro được giải phóng, snapshot đọc lại được.
- [ ] Dùng tài liệu thực đã được phép gửi model để đo false positive/negative, tự sửa lời, kết thúc giả và chi phí thực tế.

## Rollback

Đặt `NEXT_PUBLIC_PRESENTATION_ENABLED=false` ở môi trường frontend để ẩn lựa chọn mới (khởi động/build lại), và `MEETMATE_PRESENTATION_ENABLED=false` ở backend để ngừng tạo checklist mới. Dữ liệu phiên cũ vẫn xem/xuất được. Nếu cần tắt hoàn toàn thu âm, dừng phiên rồi vô hiệu hóa extension; không xóa kho phiên khi rollback.

## Nghiệm thu Google Meet thật — 13/11/2026

- Chrome đã kết nối; web xác nhận extension 0.4.0, khóa Blaze có sẵn và một tab Meet đang tham gia.
- Dùng tài liệu demo tổng hợp đã gắn nhãn; AI tạo 8 ý. Phiên `m-1794570375430` trên phòng thử do người dùng cung cấp.
- Micro thật nhận được 37 dòng; tất cả được lưu với source mic. Kết quả cuối: 6/8 ý covered, 2 partial. Không sửa tay trạng thái để nâng kết quả.
- Hai partial tương ứng STT nhận “phản hồi” thành “văn học”, và “sản phẩm” thành “thời gian”; hệ thống giữ uncertain thay vì tự tick chắc chắn.
- Transcript có câu kết thúc; UI hiện gợi ý bổ sung hai ý còn thiếu. Không quan sát thấy overlay Meet trong trạng thái đã kiểm tra.
- Chưa xác nhận ca nói sai số bằng micro thật: transcript chỉ có mức 100.000 đồng, không có câu thử 200 nghìn. Không coi không có cảnh báo là lỗi phát hiện mâu thuẫn khi đầu vào chưa chứa câu thử.
- Đã dừng ghi thử từ web, lưu backend: reportStatus ok. Không rời/tắt cuộc gọi Meet của người dùng.
- Download PDF đã được xác nhận trên đĩa: `C:/Users/THONG/Downloads/bao-cao-thuyet-trinh.pdf`, 65.207 byte. Bộ chờ sự kiện download của công cụ browser timeout, nhưng file đã tải thành công.
- Cần kiểm tra tiếp: cố ý sai số rồi tự sửa, track tab độc lập/tiếng loa lọt mic, từ chối hoặc mất thiết bị, mất mạng, screen sharing và tự kết thúc khi rời Meet.
- Ghi nhận lỗi UX cần xử lý tiếp: tab Bản ghi hiện 0 dòng trong khi phiên còn chạy, dù snapshot đang lưu transcript; transcript chỉ hiện sau khi kết thúc.
