# Sidekick Voice — hướng dẫn phát triển

## Mục tiêu hiện tại

Ứng dụng là phòng gọi **âm thanh trực tiếp** giữa nhiều người qua LiveKit. Người dùng có thể vào bằng token do server cấp, hoặc dán LiveKit URL và token đã tạo thủ công để thử nghiệm khi chưa có backend. Sau đó có thể nói, nghe, bật/tắt micro, mời người khác và rời phòng. Không dùng người tham gia, transcript hoặc âm thanh giả lập.

## Kiến trúc

- Next.js App Router + TypeScript.
- `components/meeting/MeetingRoom.tsx`: form vào phòng với hai chế độ: gọi endpoint cấp token hoặc dán token có sẵn. `LiveKitRoom` quản lý kết nối; `RoomAudioRenderer` phát âm thanh từ người khác; `TrackToggle` điều khiển micro thật; các hook LiveKit hiển thị người tham gia và trạng thái đang nói.
- `app/api/livekit-token/route.ts`: endpoint Node.js ký access token cho đúng tên phòng, với identity riêng cho mỗi người. API secret chỉ ở server.
- `.env.local`: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`; tùy chọn `LIVEKIT_JOIN_CODE`. Xem `.env.example` và `README.md`.

## Quy tắc

- Không đưa LiveKit API secret vào bundle trình duyệt, biến `NEXT_PUBLIC_` hoặc Git.
- Không đưa mock participant/transcript trở lại UI cuộc gọi. Muốn transcript thật cần tích hợp dịch vụ speech-to-text riêng.
- Trước khi triển khai công khai, bổ sung xác thực và giới hạn tần suất cho endpoint cấp token. Mã vào phòng là hàng rào cơ bản, chưa thay cho tài khoản và phân quyền.
- Trình duyệt cần HTTPS hoặc `localhost` để lấy micro. Hai người phải vào cùng tên phòng trên cùng LiveKit project.
