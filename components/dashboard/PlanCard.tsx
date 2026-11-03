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
import { FREE_PLAN } from "../../lib/dashboardData";
import type { Quota } from "./DashboardContext";
import { IconGift } from "./icons";

export function PlanCard({ quota }: { quota: Quota }) {
  const cells = [
    { n: quota.meetingsLeft, max: FREE_PLAN.meetings, label: "cuộc họp" },
    { n: quota.verificationsLeft, max: FREE_PLAN.verifications, label: "lượt kiểm chứng" },
    { n: quota.artifactsLeft, max: FREE_PLAN.artifacts, label: "artifact" },
  ];

  return (
    <div className="credit-card">
      <div className="credit-card__row">
        <span className="credit-card__label credit-card__label--free">
          <IconGift />
          Free
        </span>
      </div>

      <div className="quota-grid">
        {cells.map((c) => (
          <div className="quota" key={c.label}>
            <strong className="quota__n">{c.n}</strong>
            <span className="quota__l">{c.label}</span>
            <span
              className="quota__bar"
              role="progressbar"
              aria-valuenow={c.n}
              aria-valuemin={0}
              aria-valuemax={c.max}
              aria-label={`${c.n}/${c.max} ${c.label}`}
            >
              <i style={{ width: `${Math.min(100, (c.n / c.max) * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>

      <p className="credit-card__count">
        <span>Mỗi phiên tối đa {FREE_PLAN.meetingCapMin} phút</span>
      </p>

      <Link className="btn btn--ink btn--block credit-card__cta" href="/dashboard/upgrade">
        Nâng cấp
      </Link>
    </div>
  );
}
