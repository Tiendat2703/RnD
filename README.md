# Sidekick Voice

Phòng gọi âm thanh và video trực tiếp qua LiveKit. Người tham gia cùng tên phòng có thể nghe, nói và chia sẻ camera. Giao diện không phát transcript hay người tham gia giả lập.

## Thử nhanh khi chưa cấu hình backend

1. Tạo project LiveKit Cloud và lấy Project URL dạng `wss://...`.
2. Tạo token tham gia phòng trong [LiveKit Cloud dashboard](https://cloud.livekit.io/) hoặc bằng [LiveKit CLI](https://docs.livekit.io/reference/developer-tools/livekit-cli/). Token cần quyền `roomJoin`, `canPublish` và `canSubscribe` cho phòng bạn muốn thử; nếu giới hạn `canPublishSources`, phải cho phép cả `camera` để bật video. Để gọi agent `sidekick`, tạo token có agent dispatch, chẳng hạn `lk token create --join --room phong-moi --agent sidekick --identity nguoi-thu`.
3. Mở ứng dụng, chọn **Dùng token có sẵn**, dán Project URL và token, rồi bấm **Vào phòng**. FE kết nối trực tiếp tới LiveKit mà không gọi `/api/livekit-token`.
4. Để thử nói chuyện hai chiều, tạo **token thứ hai cho cùng phòng nhưng identity khác**, rồi vào từ tab hoặc thiết bị khác. Không dùng lại một token cho hai người.

Token dán vào form chỉ ở bộ nhớ tab; không đặt token, API key hay API secret trong URL hoặc mã nguồn. Token thủ công phù hợp để thử nghiệm; ứng dụng cần endpoint cấp token cho từng người khi đưa vào sử dụng thực tế.

Dispatch bằng token chỉ chạy khi phòng được tạo lần đầu. Vào lại phòng cũ sau khi agent đã rời sẽ không tự đưa agent trở lại; dùng tên phòng mới hoặc dispatch qua API phía server.

## Chạy local

1. Tạo project trong [LiveKit Cloud](https://cloud.livekit.io/) hoặc dùng LiveKit server của bạn. Lấy WebSocket URL, API key và API secret.
2. Sao chép `.env.example` thành `.env.local`, rồi điền `LIVEKIT_URL`, `LIVEKIT_API_KEY` và `LIVEKIT_API_SECRET`. Đặt `LIVEKIT_AGENT_NAME=sidekick` để token của server dispatch agent khi phòng mới được tạo. Có thể đặt `LIVEKIT_JOIN_CODE` để yêu cầu mã khi vào phòng. Không đưa API secret vào biến `NEXT_PUBLIC_` hoặc commit `.env.local`.
3. Chạy `npm ci` và `npm run dev`; mở `http://localhost:3000`.
4. Mở thêm tab hoặc thiết bị khác, nhập cùng tên phòng và tên người tham gia khác để thử cuộc gọi hai chiều. Với thiết bị khác, ứng dụng cần được phục vụ qua HTTPS để trình duyệt cho phép dùng micro.

Token được tạo tại `/api/livekit-token` trên server, có quyền tham gia, phát micro/camera và nghe/xem trong đúng phòng đã chọn. Camera chỉ được bật khi người dùng bấm nút và cấp quyền cho trình duyệt. Agent muốn hiểu hình ảnh cần được cấu hình xử lý video riêng. Khi triển khai công khai, hãy bật `LIVEKIT_JOIN_CODE` hoặc tích hợp xác thực người dùng trước khi cấp token; endpoint hiện không có cơ chế đăng nhập hay giới hạn tần suất.
