"use client";

// components/ai-sidekick/StatusBar.tsx — bốn trạng thái suy giảm, khai báo một lần.
//
// Chuỗi hiển thị nằm trong DEGRADED_TEXT (lib/types.ts) và lấy nguyên văn từ
// bản kế hoạch extension, vì extension và web console phải mô tả cùng một sự cố
// bằng cùng một câu. Ở đây chỉ thêm cách VẼ nó: trạng thái suy giảm đổi cả màu
// lẫn chữ và có một biểu tượng riêng — không dùng màu làm tín hiệu duy nhất.
//
// Vì sao trang này chỉ kiểm được một trong bốn trạng thái:
//   - no-mic            → trình duyệt nói cho trang web biết (mediaDevices)
//   - no-keys           → khóa nằm trong chrome.storage.local của popup, web
//                         không đọc được và cũng không được đọc
//   - blaze-credits     → do extension gọi Blaze và nhận 402
//   - chat-unreachable  → do extension không tìm thấy ô chat của Meet
// Ba trạng thái cuối vì vậy không được giả lập ở đây: một banner "thiếu khóa"
// trong web app sẽ gợi ý rằng web app có chỗ nhập khóa — mà nó thì không có.
import { useEffect, useState } from "react";
import { DEGRADED_TEXT, type Degraded } from "../../lib/types";
import { IconAlert, IconMicOff } from "../dashboard/icons";

/** null khi micro dùng được; "no-mic" khi trình duyệt không cung cấp API. */
export function useMicAvailability(): Degraded | null {
  const [degraded, setDegraded] = useState<Degraded | null>(null);

  useEffect(() => {
    const md = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!md?.getUserMedia) setDegraded("no-mic");
  }, []);

  return degraded;
}

export default function StatusBar({ degraded }: { degraded: Degraded | null }) {
  if (!degraded) return null;
  return (
    <div className="status-bar" role="status">
      {degraded === "no-mic" ? <IconMicOff /> : <IconAlert />}
      <span>{DEGRADED_TEXT[degraded]}</span>
    </div>
  );
}
