"use client";

// components/dashboard/UpgradeAside.tsx — cột phải của trang giá: những thứ giúp
// quyết định, không phải giá đang xem.
//
// Ba panel, và cả ba đọc ra từ cùng một nguồn với cột trái nên hai cột không thể
// mâu thuẫn nhau:
//  • Hạn mức còn lại tính bằng đúng ba đơn vị của gói Free. Không có một thanh
//    "đã dùng x%" nào: ba mẫu số khác nhau thì không có tử số chung nào có nghĩa.
//  • Bảng so sánh lấy đơn vị tính phí làm dòng — phiên họp, lượt kiểm chứng,
//    artifact, knowledge base — theo đúng bảng IV.3.1.
//  • Ba điểm chạm nâng cấp là nguyên văn mục IV.3.2, đặt ở đây vì đây là chỗ người
//    đọc đang cân nhắc.
//
// Panel "what a credit buys" của bản cũ bị bỏ: sản phẩm này không bán theo tín dụng.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import {
  ACCOUNT,
  FREE_PLAN,
  PLAN_MATRIX,
  UPGRADE_TOUCHPOINTS,
} from "../../lib/dashboardData";
import type { PlanId, Quota } from "./DashboardContext";
import { IconInfo, IconUser, IconZap } from "./icons";

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="upg__label">{children}</p>;
}

function Cell({ left, max, label }: { left: number; max: number; label: string }) {
  return (
    <div className="quota">
      <span className="quota__n">
        {left}
        <em>/{max}</em>
      </span>
      <span className="quota__l">{label}</span>
      <span
        className="quota__bar"
        role="progressbar"
        aria-valuenow={left}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${left}/${max} ${label}`}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, (left / max) * 100))}%` }} />
      </span>
    </div>
  );
}

export function UpgradeAside({
  plan,
  onPickPlan,
  quota,
  people,
}: {
  plan: PlanId;
  onPickPlan: (p: PlanId) => void;
  quota: Quota;
  people: number;
}) {
  return (
    <div className="upg__aside">
      <section className="upg__panel" aria-labelledby="upg-bal">
        <Eyebrow>
          <span id="upg-bal">Gói Free còn lại</span>
        </Eyebrow>
        <div className="balcard">
          <div className="balcard__now">
            <strong>{ACCOUNT.plan}</strong>
            <span>{ACCOUNT.planNote}</span>
          </div>
          <div className="quota-grid">
            <Cell left={quota.meetingsLeft} max={FREE_PLAN.meetings} label="phiên họp" />
            <Cell
              left={quota.verificationsLeft}
              max={FREE_PLAN.verifications}
              label="lượt kiểm chứng"
            />
            <Cell left={quota.artifactsLeft} max={FREE_PLAN.artifacts} label="artifact" />
          </div>
          <p className="balcard__foot">
            <IconUser />
            {ACCOUNT.method}
            <Link className="link balcard__link" href="/dashboard/profile?tab=plan">
              <IconInfo />
              Xem giới hạn đang áp dụng
            </Link>
          </p>
        </div>
      </section>

      <section className="upg__panel" aria-labelledby="upg-matrix">
        <p className="upg__label">
          <span id="upg-matrix">Bốn gói, cùng một đơn vị đếm</span>
        </p>
        <div className="upg__scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th scope="col" className="matrix__object">
                  <span className="visually-hidden">Đơn vị</span>
                </th>
                {PLAN_MATRIX.columns.map((col) => (
                  <th scope="col" key={col.id} className={cn("matrix__plan", col.id === plan && "is-here")}>
                    <button
                      type="button"
                      className="matrix__pick"
                      aria-pressed={col.id === plan}
                      onClick={() => onPickPlan(col.id)}
                    >
                      {col.label}
                      <em>{col.note}</em>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_MATRIX.rows.map((row) => (
                <tr key={row.object}>
                  <th scope="row">{row.object}</th>
                  {PLAN_MATRIX.columns.map((col) => (
                    <td key={col.id} className={cn(col.id === plan && "is-here")}>
                      {row[col.id] === "—" ? (
                        <span className="matrix__none">
                          <span aria-hidden>—</span>
                          <span className="visually-hidden">Không có ở gói này</span>
                        </span>
                      ) : (
                        row[col.id]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {plan === "team" ? (
          <p className="upg__note">
            <IconZap />
            Cột Team nhân theo <strong>{people} người</strong> — đúng số bạn vừa nhập ở
            cột trái.
          </p>
        ) : null}
        <p className="upg__note">
          <IconInfo />
          "Không ghi trong bảng" nghĩa là tài liệu chưa chốt giới hạn đó, không phải
          không giới hạn.
        </p>
      </section>

      <section className="upg__panel" aria-labelledby="upg-when">
        <p className="upg__label">
          <span id="upg-when">Bao giờ thì cần nâng cấp</span>
        </p>
        <ul className="eqns">
          {UPGRADE_TOUCHPOINTS.map((t) => (
            <li key={t}>
              <IconZap />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
