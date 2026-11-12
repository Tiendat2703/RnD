"use client";

// components/dashboard/UpgradePanel.tsx — trang Gói dịch vụ.
//
// Bố cục dựng lại theo docs/design/DESIGN-SUBSCRIPTION.md: hàng hạn mức, công tắc kỳ hạn, hàng thẻ
// gói (vùng trên trắng + vùng tính năng xám), bảng so sánh chia nhóm, FAQ accordion.
// Cơ chế được học từ một trang giá khác; tên, chữ, phông, màu và biểu tượng thì không.
// Nội dung vẫn là của MeetMate và lấy từ bảng IV.3.1 của bản mô tả RTS2026:
//  1. Tiền là đồng, viết như tài liệu viết: 199.000đ/tháng. Không đô-la, không "credits".
//  2. Phí tính theo phiên họp có AI, lượt kiểm chứng và lượt xuất báo cáo PDF — không theo phút.
//  3. Không có huy hiệu "phổ biến": chưa có số liệu nào nói gói nào được chọn nhiều.
//
// Toàn trang mang nhãn "Dự kiến": chính bản mô tả ghi bảng giá là giả thuyết, sẽ điều chỉnh
// sau khi đo chi phí thực tế, nên chưa có nút nào ở đây thu tiền.
import { useState } from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import {
  ACCOUNT,
  PLANS,
  PLAN_MATRIX,
  PLAN_MATRIX_GROUPS,
  PLAN_TERMS,
  UPGRADE_FAQ,
  formatVnd,
  type Plan,
} from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Segmented } from "./controls";
import { IconCheck, IconChevronDown, IconInfo, IconPlus, IconX } from "./icons";

type Cycle = "month" | "year";

/** nhãn tiền cho một gói, kèm cả cái bị gạch đi khi có cơ sở so sánh */
function priceOf(p: Plan, cycle: Cycle, people: number) {
  if (p.id === "edu") {
    return {
      big: p.priceQuarterly ? formatVnd(p.priceQuarterly) : "Theo thỏa thuận",
      unit: "/quý",
      struck: null as string | null,
      sub: p.min ?? "không giới hạn người dùng",
    };
  }
  if (p.id === "free") return { big: "0đ", unit: "", struck: null, sub: "không cần thẻ" };

  const monthly = (p.priceMonthly ?? 0) * (p.id === "team" ? people : 1);
  if (cycle === "year" && p.priceYearly) {
    const perMonth = Math.round(p.priceYearly / 12);
    return {
      big: formatVnd(p.priceYearly),
      unit: "/năm",
      struck: formatVnd(monthly * 12),
      sub: `≈ ${formatVnd(perMonth)}/tháng, tiết kiệm ${formatVnd(monthly * 12 - p.priceYearly)}`,
    };
  }
  const base = p.id === "team" ? `${formatVnd(p.priceMonthly ?? 0)} × ${people} người` : "sử dụng không giới hạn";
  return {
    big: formatVnd(monthly),
    unit: p.unit ? `/${p.unit.replace("người/", "")}` : "/tháng",
    struck: null,
    sub: cycle === "year" && !p.priceYearly ? `${base} · giá năm chưa niêm yết` : base,
  };
}

export function UpgradePanel() {
  const { pushToast } = useDashboard();
  const [cycle, setCycle] = useState<Cycle>("month");
  const [people, setPeople] = useState(3);
  const [group, setGroup] = useState(PLAN_MATRIX_GROUPS[0].id);

  const choose = (p: Plan) =>
    pushToast(`Bản demo — trang này chưa nối với hệ thống thanh toán nào, nên chưa chọn được gói ${p.name}.`, "error");

  const rows = PLAN_MATRIX.rows.filter((r) =>
    (PLAN_MATRIX_GROUPS.find((g) => g.id === group)?.rows ?? []).includes(r.object)
  );
  const currentId = PLANS.find((p) => p.current)?.id;

  return (
    <div className="sub">
      {/* hạn mức: ba đơn vị tính phí, mỗi đơn vị một thanh, không có thanh tổng */}
      <section className="sub__usage" aria-label="Quyền sử dụng">
        <div className="sub__card">
          <h3 className="sub__label">Sử dụng không giới hạn</h3>
          <div className="sub__meters">
            <p>Phiên họp, thời lượng và kiểm chứng không giới hạn</p>
            <p>Tải PDF không giới hạn</p>
          </div>
        </div>
        <div className="sub__card sub__card--now">
          <div>
            <strong className="sub__now">Bạn đang dùng gói {ACCOUNT.plan}</strong>
            <p className="sub__muted">{ACCOUNT.planNote}</p>
          </div>
          <Link className="btn btn--outline btn--sm" href="/dashboard/profile?tab=plan">
            <IconInfo />
            Xem gói hiện tại
          </Link>
        </div>
      </section>

      <div className="sub__toolbar">
        <Segmented<Cycle>
          options={[
            { id: "month", label: "Theo tháng" },
            { id: "year", label: "Theo năm (tiết kiệm 2 tháng)" },
          ]}
          value={cycle}
          onChange={setCycle}
          ariaLabel="Kỳ hạn thanh toán"
          compact
        />
        <Link className="btn btn--outline btn--sm" href="/dashboard/profile?tab=plan">
          Liên hệ pilot
        </Link>
      </div>

      {/* hàng thẻ gói: vùng trên trắng (giá + nút), vùng dưới xám (tính năng) */}
      <ul className="tiers" aria-label="Các gói">
        {PLANS.map((p) => {
          const q = priceOf(p, cycle, people);
          return (
            <li key={p.id} className={cn("tier", p.current && "tier--now")} data-tier={p.id}>
              <div className="tier__top">
                <div className="tier__name">
                  <h3>{p.name}</h3>
                  {p.current ? <span className="tier__tag">Gói hiện tại</span> : null}
                </div>
                <p className="tier__aud">{p.audience}</p>

                <p className="tier__price">
                  {q.struck ? <s>{q.struck}</s> : null}
                  <strong>{q.big}</strong>
                  <span>{q.unit}</span>
                </p>
                <p className="tier__sub">{q.sub}</p>

                {p.id === "team" ? (
                  <div className="ppl" role="group" aria-label="Số người dùng">
                    <button
                      type="button"
                      className="ppl__btn"
                      aria-label="Bớt một người"
                      disabled={people <= 1}
                      onClick={() => setPeople((n) => Math.max(1, n - 1))}
                    >
                      −
                    </button>
                    <span className="ppl__n">
                      {people} <em>người</em>
                    </span>
                    <button
                      type="button"
                      className="ppl__btn"
                      aria-label="Thêm một người"
                      onClick={() => setPeople((n) => n + 1)}
                    >
                      +
                    </button>
                  </div>
                ) : null}

                {p.current ? (
                  <button type="button" className="btn btn--outline btn--block" disabled>
                    <IconCheck />
                    Đang dùng gói này
                  </button>
                ) : p.id === "edu" ? (
                  <Link className="btn btn--outline btn--block" href="/dashboard/profile?tab=plan">
                    Liên hệ triển khai
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cn("btn", "btn--block", p.id === "pro" ? "btn--ink" : "btn--outline")}
                    onClick={() => choose(p)}
                  >
                    Chọn {p.name}
                  </button>
                )}
              </div>

              <ul className="tier__features">
                {p.limits.map((l) => (
                  <li key={l}>
                    <IconCheck />
                    {l}
                  </li>
                ))}
                {p.min && p.id !== "edu" ? (
                  <li className="tier__min">
                    <IconInfo />
                    {p.min}
                  </li>
                ) : null}
                {p.id === "free" ? (
                  <li className="tier__off">
                    <IconX />
                    <s>Knowledge base, chia sẻ cho nhóm</s>
                  </li>
                ) : null}
                {p.inherits ? (
                  <li className="tier__inherit">
                    <IconPlus />
                    Gồm mọi thứ trong {p.inherits}
                  </li>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ul>

      {/* bảng so sánh chia nhóm */}
      <section className="sub__compare" aria-labelledby="sub-compare">
        <h3 id="sub-compare" className="sub__h">
          So sánh các gói
        </h3>
        <Segmented<string>
          options={PLAN_MATRIX_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
          value={group}
          onChange={setGroup}
          ariaLabel="Nhóm thuộc tính"
          compact
        />
        <div className="sub__scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col" className="cmp__object">
                  <span className="visually-hidden">Thuộc tính</span>
                </th>
                {PLAN_MATRIX.columns.map((col) => (
                  <th scope="col" key={col.id} className={cn(col.id === currentId && "is-here")}>
                    {col.label}
                    <em>{col.note}</em>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.object}>
                  <th scope="row">
                    {PLAN_TERMS[row.object] ? (
                      <span className="cmp__term" title={PLAN_TERMS[row.object]} tabIndex={0}>
                        {row.object}
                      </span>
                    ) : (
                      row.object
                    )}
                  </th>
                  {PLAN_MATRIX.columns.map((col) => (
                    <td key={col.id} className={cn(col.id === currentId && "is-here")}>
                      {row[col.id] === "—" ? (
                        <span className="cmp__none">
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
        <p className="sub__note">
          <IconInfo />
          Số phiên họp, thời lượng, lượt kiểm chứng và tải báo cáo không giới hạn ở mọi gói.
          {" "}Cột Team nhân theo số người dùng.
        </p>
      </section>

      <section className="faq" aria-labelledby="sub-faq">
        <h3 id="sub-faq" className="sub__h">
          Câu hỏi thường gặp
        </h3>
        <div className="faq__list">
          {UPGRADE_FAQ.map((f) => (
            <details className="faq__item" key={f.q}>
              <summary>
                <span>{f.q}</span>
                <IconChevronDown />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="sub__foot">
        <IconInfo />
        <span>
          Chưa có hoá đơn, chưa có mã giảm giá, chưa có chính sách hoàn tiền — vì chưa có sản phẩm nào để
          bán. Liên hệ triển khai pilot:{" "}
          <Link className="link" href="/dashboard/profile?tab=plan">
            hồ sơ của bạn
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
