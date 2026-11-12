# KẾ HOẠCH TRIỂN KHAI DỰ ÁN ỨNG DỤNG BÁN HÀNG SAO MAI
Phiên bản 1.3, cập nhật ngày 05 tháng 11 năm 2026

## 1. Mục tiêu dự án

Ra mắt ứng dụng bán hàng đa kênh cho chuỗi cửa hàng Sao Mai, thay thế quy trình đặt hàng qua điện thoại và Zalo. Mục tiêu sau 3 tháng kể từ ngày ra mắt là đạt 5.000 người dùng hoạt động hằng tháng, 30% đơn hàng của chuỗi đi qua ứng dụng, và tỷ lệ giữ chân người dùng sau 30 ngày đạt tối thiểu 40%.

## 2. Nhân sự

Trưởng dự án phía Sao Mai là ông Phạm Quốc Bảo. Quản lý dự án phía Blue River là bà Đỗ Minh Châu.

Đội phát triển gồm 7 người: 1 quản lý dự án, 2 lập trình viên backend, 2 lập trình viên di động, 1 lập trình viên frontend web và 1 kỹ sư kiểm thử. Thiết kế giao diện do bạn Võ Thanh Hà đảm nhận theo hình thức bán thời gian.

## 3. Các mốc thời gian

Mốc 1: hoàn thành thiết kế giao diện và nguyên mẫu bấm thử trước ngày 27 tháng 11 năm 2026.

Mốc 2: bản thử nghiệm nội bộ trên iOS và trang quản trị vào ngày 15 tháng 12 năm 2026.

Mốc 3: nghiệm thu giai đoạn 1 vào ngày 15 tháng 01 năm 2027.

Mốc 4: bản thử nghiệm công khai trên Android vào ngày 20 tháng 02 năm 2027, mời 200 khách hàng thân thiết dùng thử.

Mốc 5: bàn giao toàn bộ hệ thống vào ngày 31 tháng 03 năm 2027 và ra mắt chính thức ngày 10 tháng 04 năm 2027.

## 4. Ngân sách vận hành

Ngân sách marketing cho đợt ra mắt là 350.000.000 đồng, trong đó 60% dành cho quảng cáo trên mạng xã hội, 25% cho khuyến mãi trong ứng dụng và 15% cho sự kiện tại cửa hàng.

Chi phí máy chủ đám mây dự kiến 18.000.000 đồng mỗi tháng trong năm đầu, do Sao Mai chi trả trực tiếp cho nhà cung cấp.

## 5. Công nghệ

Ứng dụng di động viết bằng React Native. Backend dùng Node.js với cơ sở dữ liệu PostgreSQL, triển khai trên máy chủ đám mây đặt tại Việt Nam. Thanh toán trong ứng dụng hỗ trợ VNPay và MoMo; ví ZaloPay để giai đoạn sau.

## 6. Chỉ số đo lường

Thời gian tải trang chủ của ứng dụng dưới 2 giây trên mạng 4G. Tỷ lệ phiên bị lỗi sập ứng dụng dưới 0,5%. Điểm đánh giá trung bình trên cửa hàng ứng dụng đạt từ 4,5 sao trở lên.

## 7. Rủi ro và phương án xử lý

Rủi ro 1: dữ liệu kho của Sao Mai không đồng nhất giữa các cửa hàng. Phương án: dành 2 tuần đầu tháng 12 để chuẩn hóa mã sản phẩm trước khi kết nối API kho.

Rủi ro 2: Apple duyệt ứng dụng chậm. Phương án: nộp bản xét duyệt sớm ít nhất 10 ngày trước mỗi mốc phát hành.

Rủi ro 3: nhân sự kiểm thử chỉ có 1 người. Phương án: thuê thêm 1 kỹ sư kiểm thử theo hợp đồng ngắn hạn trong tháng 3 năm 2027.

## 8. Quy trình làm việc

Đội làm việc theo chu kỳ 2 tuần. Công việc được theo dõi trên Jira, thiết kế lưu trên Figma. Báo cáo tiến độ gửi Sao Mai vào chiều thứ Sáu hằng tuần. Họp tiến độ với khách hàng vào sáng thứ Năm lúc 9 giờ 30.
