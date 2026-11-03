"use client";

// components/dashboard/UpgradePanel.tsx — trang giá, dựng lại từ bảng IV.3.1 của
// bản mô tả RTS2026, không dựng lại từ trang giá của đối thủ.
//
// Ba khác biệt so với bản cũ, và cả ba đều do tài liệu sản phẩm quyết định:
//  1. Đơn vị tiền là đồng, viết theo cách bản mô tả viết: 199.000đ/tháng. Không có
//     đô-la, không có "credits", không có mã giảm giá — chưa tồn tại giao dịch nào
//     để mà giảm.
//  2. Phí tính theo phiên họp có AI, lượt kiểm chứng và artifact; không tính theo
//     phút và không tính theo lượt gọi. Bảng so sánh vì vậy lấy ba đơn vị đó làm
//     dòng, chứ không phải một danh sách tính năng marketing.
//  3. Bốn bậc Free / Pro / Team / Edu là một hàng radio, không phải ba tab mô hình
//     định giá. Sản phẩm chỉ có một mô hình.
//
// Toàn bộ trang mang nhãn "dự kiến" ngay trên tiêu đề, vì chính bản mô tả ghi:
// "Bảng giá là giả thuyết, sẽ được điều chỉnh sau khi đo chi phí thực tế".
import { useState } from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import {
  formatVnd,
  PLANS,
  type Plan,
} from "../../lib/dashboardData";
import { useDashboard, type PlanId } from "./DashboardContext";
import { UpgradeAside } from "./UpgradeAside";
import { Segmented } from "./controls";
import { IconCheck, IconInfo, IconX, IconZap } from "./icons";

const TABS: { id: PlanId; label: string }[] = PLANS.map((p) => ({ id: p.id, label: p.name }));

/** nhãn tiền cho một gói, kèm cả cái bị gạch đi khi có cơ sở so sánh */
function priceOf(p: Plan, cycle: "month" | "year", people: number) {
  if (p.id === "edu") {
    return {
      big: p.priceQuarterly ? formatVnd(p.priceQuarterly) : "Theo thỏa thuận",
      unit: "/quý",
      struck: null as string | null,
      sub: `tối đa ${p.min?.replace("tối đa ", "") ?? "15"} người`,
    };
  }
  const monthly = (p.priceMonthly ?? 0) * (p.id === "team" ? people : 1);
  if (p.id === "free") {
    return { big: "0đ", unit: "", struck: null, sub: "không cần thẻ" };
  }
  if (cycle === "year" && p.priceYearly) {
    const perMonth = Math.round(p.priceYearly / 12);
    return {
      big: formatVnd(p.priceYearly),
      unit: "/năm",
      struck: formatVnd(monthly * 12),
      sub: `≈ ${formatVnd(perMonth)}/tháng — tiết kiệm ${formatVnd(monthly * 12 - p.priceYearly)}`,
    };
  }
  return {
    big: formatVnd(monthly),
    unit: p.unit ? `/${p.unit}` : "/tháng",
    struck: null,
    sub: p.id === "team" ? `${formatVnd(p.priceMonthly ?? 0)} × ${people} người` : "hạn mức reset hằng tháng",
  };
}

/** hàng downsell: bước nhỏ hơn kế tiếp, lấy ra từ chính danh sách PLANS */
function nextStepDown(id: PlanId): { to: PlanId; lead: string } | null {
  if (id === "team")
    return { to: "pro", lead: "Chỉ một người dùng?" };
  if (id === "edu") return { to: "team", lead: "Nhóm dưới 3 người?" };
  if (id === "pro") return { to: "free", lead: "Muốn dùng thử đã?" };
  return null;
}

export function UpgradePanel() {
  // gói được chọn sống trên shell: rail và monitor cùng mở trang này ở đúng một gói
  const { planFocus: plan, setPlanFocus: setPlan, quota, pushToast } = useDashboard();
  const [cycle, setCycle] = useState<"month" | "year">("year");
  const [people, setPeople] = useState(3);

  const p = PLANS.find((x) => x.id === plan) ?? PLANS[0];
  const q = priceOf(p, cycle, people);
  const down = nextStepDown(p.id);

  const buy = () =>
    pushToast(
      p.id === "free"
        ? "Bạn đang ở gói Free — đây là dữ liệu mẫu, chưa có gói nào để chuyển."
        : "Bản demo — trang này chưa nối với hệ thống thanh toán nào.",
      p.id === "free" ? "success" : "error"
    );

  const showCycle = Boolean(p.priceYearly);
  const showPeople = p.id === "team";

  return (
    <div className="upg">
      <div className="offerbar" role="note">
        <span className="offerbar__code">Dự kiến</span>
        <p>
          Bảng giá lấy từ mục IV.3.1 của bản mô tả sản phẩm. Chính tài liệu ghi nó là{" "}
          <strong>giả thuyết</strong>, sẽ điều chỉnh sau khi đo chi phí thực tế — nên
          chưa có nút nào ở đây thu tiền bạn.
        </p>
      </div>

      <div className="upg__grid">
        <div className="upg__buy">
          <Segmented<PlanId>
            options={TABS}
            value={plan}
            onChange={setPlan}
            ariaLabel="Chọn gói"
          />

          <div className={cn("pcard", p.current && "pcard--plain")}>
            <div className="pcard__head">
              <div>
                <h2 className="dc-title-sm">{p.name}</h2>
                <p className="pcard__tag">{p.audience}</p>
              </div>
              {p.current ? (
                <span className="pcard__badge pcard__badge--now">Gói hiện tại</span>
              ) : p.id === "pro" ? (
                <span className="pcard__badge">
                  <IconZap />
                  Nhiều người chọn
                </span>
              ) : null}
            </div>

            <div className="pcard__bar">
              {showCycle ? (
                <Segmented<"month" | "year">
                  options={[
                    { id: "month", label: "Trả theo tháng" },
                    { id: "year", label: "Trả theo năm" },
                  ]}
                  value={cycle}
                  onChange={setCycle}
                  ariaLabel="Kỳ hạn"
                  compact
                />
              ) : null}
              {showPeople ? (
                <div className="ppl" role="group" aria-label="Số người dùng">
                  <button
                    className="ppl__btn"
                    aria-label="Bớt một người"
                    disabled={people <= 3}
                    onClick={() => setPeople((n) => Math.max(3, n - 1))}
                  >
                    −
                  </button>
                  <span className="ppl__n">
                    {people} <em>người</em>
                  </span>
                  <button
                    className="ppl__btn"
                    aria-label="Thêm một người"
                    disabled={people >= 15}
                    onClick={() => setPeople((n) => Math.min(15, n + 1))}
                  >
                    +
                  </button>
                </div>
              ) : null}
            </div>

            <p className="price">
              {q.struck ? <s>{q.struck}</s> : null}
              <strong>{q.big}</strong>
              <span>{q.unit}</span>
              <em>{q.sub}</em>
            </p>

            {p.min && !showPeople ? <p className="pcard__min">{p.min}</p> : null}

            <ul className="rules">
              {p.limits.map((l) => (
                <li key={l}>
                  <IconCheck />
                  {l}
                </li>
              ))}
              {p.id === "free" ? (
                <li className="rules__off">
                  <IconX />
                  Không có knowledge base, không chia sẻ cho nhóm
                </li>
              ) : null}
            </ul>

            <button
              className={cn("btn", "btn--block", p.current ? "btn--outline" : "btn--ink")}
              onClick={buy}
            >
              {p.current
                ? "Đang dùng gói này"
                : `Chọn ${p.name} · ${q.big}${q.unit}`}
            </button>

            <p className="pcard__fine">
              <IconInfo />
              {p.id === "edu"
                ? "Bậc Edu / Pilot B2B ký theo quý cho cả đơn vị, kèm hỗ trợ triển khai và báo cáo hiệu quả sử dụng."
                : "Một lượt kiểm chứng là một lần MeetMate tách chủ đề, tìm nguồn và viết lý do chọn nguồn. Một artifact là một bản brief, báo cáo, slide hoặc bảng tính xuất từ kết quả đó."}
            </p>

            {down ? (
              <p className="downsell">
                {down.lead}{" "}
                <button type="button" className="link" onClick={() => setPlan(down.to)}>
                  Xem gói {PLANS.find((x) => x.id === down.to)?.name}
                </button>
              </p>
            ) : (
              <p className="downsell">
                Bạn ở bậc thấp nhất.{" "}
                <button type="button" className="link" onClick={() => setPlan("pro")}>
                  Xem Pro
                </button>
              </p>
            )}
          </div>

          <p className="upg__foot">
            <IconInfo />
            {/* `.upg__foot` là flex: icon + một item. Nếu để câu chữ và link là hai
                item, link bị đẩy sang phải thành một khối rời — câu "Liên hệ triển
                khai pilot: hồ sơ của bạn" đọc thành hai mảnh. Một span bọc lại là
                đủ để link chảy trong câu, đúng như `wiz__note`. */}
            <span>
              Chưa có hoá đơn, chưa có mã giảm giá, chưa có chính sách hoàn tiền — vì chưa
              có sản phẩm nào để bán. Liên hệ triển khai pilot:{" "}
              <Link className="link" href="/dashboard/profile?tab=plan">
                hồ sơ của bạn
              </Link>
              .
            </span>
          </p>
        </div>

        <UpgradeAside plan={plan} onPickPlan={setPlan} quota={quota} people={people} />
      </div>
    </div>
  );
}
