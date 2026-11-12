"use client";

// components/dashboard/ProfilePanel.tsx — trang hồ sơ, nơi menu tài khoản dẫn tới.
//
// Ba mục: bạn là ai, gói của bạn còn lại gì, và dữ liệu của bạn đi đâu.
//
// Tab "Billing" của bản cũ bị bỏ cùng danh sách hoá đơn: chưa có checkout nào, chưa
// có giao dịch nào, và một bảng "Paid" màu xanh là cách nhanh nhất để một bản demo
// trông như đang thu tiền. Hạn mức ở đây hiển thị bằng đúng ba đơn vị của bảng giá
// IV.3.1 — phiên họp, lượt kiểm chứng, artifact — và không gộp thành một phần trăm
// dùng chung, vì ba mẫu số khác nhau thì không có tử số chung nào có nghĩa.
//
// Mục "Dữ liệu của bạn" giữ nguyên tên tiếng Việt vì tài liệu III.2.8 mô tả đúng nội
// dung đó: chế độ xử lý và phạm vi lưu giữ, không phải mật khẩu hay phiên đăng nhập.
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import {
  ACCOUNT,
  DATA_ROWS,
  formatVnd,
  PLANS,
  PRIVACY_MODES,
} from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { RadioCard, Switch } from "./controls";
import { IconDownload, IconShield, IconUser, IconZap } from "./icons";

const TABS = [
  { id: "account", label: "Tài khoản", icon: IconUser },
  { id: "plan", label: "Gói hiện tại", icon: IconZap },
  { id: "data", label: "Dữ liệu của bạn", icon: IconShield },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Row({ title, note, children }: { title: string; note: string; children?: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <strong>{title}</strong>
        <span>{note}</span>
      </div>
      {children}
    </div>
  );
}

export function ProfilePanel() {
  const { openPricing, pushToast } = useDashboard();
  const [tab, setTab] = useState<TabId>("account");
  const [mode, setMode] = useState<string>(
    PRIVACY_MODES.find((m) => m.on)?.id ?? PRIVACY_MODES[0].id
  );
  const [data, setData] = useState<Record<string, boolean>>(
    Object.fromEntries(DATA_ROWS.map((r) => [r.id, r.on]))
  );

  // deep link: trang giá trỏ về đây khi người đọc muốn xem giới hạn đang áp dụng
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "plan" || wanted === "data" || wanted === "account") setTab(wanted);
  }, []);

  const current = PLANS.find((p) => p.current) ?? PLANS[0];

  return (
    <>
      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Các mục hồ sơ">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className="tab"
                onClick={() => setTab(t.id)}
              >
                <Icon />
                {t.label}
              </button>
            );
          })}
        </div>
        <span className="pill pill--free tabs-row__aside">{current.name}</span>
      </div>

      {tab === "account" ? (
        <section className="settings-section">
          <h2>Tài khoản</h2>
          <div className="acct">
            <span className="user-avatar user-avatar--lg" aria-hidden>
              {ACCOUNT.initials}
            </span>
            <div className="acct__who">
              <strong>{ACCOUNT.name}</strong>
              <span>{ACCOUNT.email}</span>
              <span>
                {ACCOUNT.role} · {ACCOUNT.team}
              </span>
              <time>{ACCOUNT.joined}</time>
            </div>
            <button
              className="btn btn--outline"
              onClick={() => pushToast("Bản demo — email đăng nhập đang cố định.", "error")}
            >
              Đổi email
            </button>
          </div>
          <Row
            title="Vùng làm việc"
            note="Cuộc họp, bản ghi và tài liệu của bạn nằm ở đây. Theo thiết kế, nội dung phiên được xóa tối đa 24 giờ sau phiên."
          >
            <span className="pill pill--type">{ACCOUNT.team}</span>
          </Row>
          <Row
            title="Extension Chrome"
            note="MeetMate nghe cuộc họp từ extension. Trang này chỉ hiển thị những gì extension ghi lại — nó không tự bật hay tắt được extension."
          >
            <span className="pill pill--ended">Chưa cài trong bản demo</span>
          </Row>
        </section>
      ) : null}

      {tab === "plan" ? (
        <>
          <section className="settings-section">
            <h2>Gói dịch vụ</h2>
            <div className="plan-strip">
              <div className="plan-strip__now">
                <strong>{ACCOUNT.plan}</strong>
                <span>{ACCOUNT.planNote}</span>
              </div>
              <div className="quota-grid quota-grid--strip">
                <p>Phiên họp, thời lượng và kiểm chứng không giới hạn</p>
                <p>Tải PDF không giới hạn</p>
              </div>
              <div className="plan-strip__cta">
                <button className="btn btn--primary" onClick={() => openPricing("pro")}>
                  <IconZap />
                  Xem gói Pro
                </button>
                <Link className="btn btn--outline" href="/dashboard/upgrade">
                  So sánh cả bốn gói
                </Link>
              </div>
            </div>
            <Row
              title="Phương thức thanh toán"
              note={ACCOUNT.method}
            >
              <span className="pill pill--credit">Chưa có</span>
            </Row>
            <Row
              title={`Gói Pro: ${formatVnd(current.priceMonthly ?? 199_000)}/tháng`}
              note="Phiên họp, thời lượng và kiểm chứng không giới hạn, tải PDF không giới hạn, biểu đồ PNG và knowledge base cá nhân. Giá trong bảng IV.3.1 là giả thuyết chưa chốt."
            >
              <button className="btn btn--outline" onClick={() => openPricing("pro")}>
                Chi tiết
              </button>
            </Row>
            <p className="dp__footnote">
              Chưa có hoá đơn nào để tải: gói chưa mở bán, và trang này chưa nối với
              hệ thống thanh toán nào.
            </p>
          </section>
        </>
      ) : null}

      {tab === "data" ? (
        <>
          <section className="settings-section">
            <h2>Chế độ xử lý</h2>
            <p className="settings-section__lead">
              Ba chế độ đã chốt trong thiết kế, chọn một. Chúng khác nhau ở chỗ âm
              thanh và bản ghi đi tới đâu — không phải ở độ riêng tư chung chung.
            </p>
            <div className="radios" role="radiogroup" aria-label="Chế độ xử lý">
              {PRIVACY_MODES.map((m) => (
                <RadioCard
                  key={m.id}
                  selected={mode === m.id}
                  onSelect={() => setMode(m.id)}
                  title={m.title}
                  note={m.note}
                />
              ))}
            </div>
            <div className={cn("mm-band", mode === "private" && "mm-band--warn")}>
              <IconShield />
              <span>
                {mode === "private"
                  ? "Riêng tư (xử lý hoàn toàn trong Chrome) là định hướng sau MVP, chưa phải năng lực đã xác nhận. Hybrid vẫn gửi audio cho Blaze Voice trên cloud."
                  : "Chọn chế độ ở trang này chưa đổi được hành vi của extension — phần đó chưa được viết. Nó ghi lại lựa chọn của bạn để đối chiếu sau này."}
              </span>
            </div>
          </section>

          <section className="settings-section">
            <h2>Dữ liệu của bạn</h2>
            {DATA_ROWS.map((r) => (
              <Row key={r.id} title={r.title} note={r.note}>
                <Switch
                  checked={!!data[r.id]}
                  onChange={(v) => setData((prev) => ({ ...prev, [r.id]: v }))}
                  label={r.title}
                />
              </Row>
            ))}
          </section>

          <section className="settings-section settings-section--danger">
            <h2>Xuất và xoá</h2>
            <Row
              title="Xuất toàn bộ"
              note="Bản ghi, chủ đề, kết quả research và danh sách tài liệu của vùng làm việc này."
            >
              <button
                className="btn btn--outline"
                onClick={() => pushToast("Bản demo — chưa có file nào được tạo ra để tải.", "error")}
              >
                <IconDownload />
                Yêu cầu xuất
              </button>
            </Row>
            <Row
              title="Xoá tài khoản"
              note="Gỡ vùng làm việc, mọi cuộc họp và mọi bản ghi. Không hoàn tác được."
            >
              <button
                className="btn btn--danger"
                onClick={() => pushToast("Bản demo — xoá tài khoản chưa được nối.", "error")}
              >
                Xoá tài khoản
              </button>
            </Row>
          </section>
        </>
      ) : null}
    </>
  );
}
