"use client";

// components/dashboard/PlanCard.tsx — thẻ hạn mức ở đáy rail.
//
// Ba ô là ba đơn vị tính phí thật của bảng giá IV.3.1 — phiên họp, lượt kiểm
// chứng, artifact — không phải một con số "tín dụng" gộp lại. Gộp là mất thông
// tin: hết lượt kiểm chứng giữa cuộc họp và hết phiên là hai vấn đề khác nhau,
// và điểm chạm nâng cấp thứ nhất của sản phẩm là cái thứ hai.
//
// Mỗi ô tự có bar theo trần của chính nó. Không có bar tổng vì không tồn tại
// tỉ lệ "bao nhiêu phần trăm gói đã dùng" nào có nghĩa khi mẫu số khác nhau.
import Link from "next/link";
import { IconZap } from "./icons";

export function PlanCard() {
  return (
    <div className="credit-card credit-card--bare">
      <Link className="btn btn--outline btn--block credit-card__cta" href="/dashboard/upgrade">
        <span className="credit-card__ico" aria-hidden>
          <IconZap />
        </span>
        Nâng cấp
      </Link>
    </div>
  );
}
