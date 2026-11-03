"use client";

// components/dashboard/SettingsPanel.tsx — hiển thị, ngôn ngữ, research, vùng làm việc.
//
// Ba mục mà web console này thật sự sở hữu:
//  • Hiển thị đổi bộ token, không đổi bố cục — vệt phân cách là hairline chứ không
//    phải bóng, nên nền tối không cần một bộ rule riêng.
//  • Ngôn ngữ chỉ có một lựa chọn. Bản mô tả ghi "toàn bộ chữ hiển thị cho người dùng
//    viết bằng tiếng Việt"; sao chép danh sách năm thứ tiếng của đối thủ vào đây là
//    một tuyên bố năng lực chưa có bằng chứng.
//  • Tùy chọn nghiên cứu không bị sao chép sang trang này — cùng một dialog với monitor
//    và wizard, mở từ đây, để không tồn tại hai bản của cùng một hạn chế.
//
// Hồ sơ (tên, email) nằm ở /dashboard/profile và hiển thị dạng đọc, vì chưa có backend
// nào ghi được tên mới.
import { useState } from "react";
import { LANGUAGES } from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";
import { Switch } from "./controls";
import { IconContrast, IconMoon, IconSettings, IconSun, IconTrash } from "./icons";

const THEME_OPTIONS = [
  { id: "light", label: "Sáng", icon: IconSun },
  { id: "dark", label: "Tối", icon: IconMoon },
  { id: "auto", label: "Hệ thống", icon: IconContrast },
] as const;

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

export function SettingsPanel() {
  const {
    theme,
    resolvedTheme,
    setTheme,
    meetings,
    clearMeetings,
    prefs,
    setPrefs,
    setPrefsOpen,
    pushToast,
  } = useDashboard();
  const [wipeOpen, setWipeOpen] = useState(false);

  return (
    <>
      <section className="settings-section">
        <h2>Hiển thị</h2>
        <Row
          title="Chủ đề màu"
          note={
            theme === "auto"
              ? `Theo hệ thống — đang hiển thị ${resolvedTheme === "dark" ? "nền tối" : "nền sáng"}.`
              : "Đổi bộ token; bố cục, khoảng cách và kiểu chữ giữ nguyên."
          }
        >
          <div className="theme-choice" role="group" aria-label="Chủ đề màu">
            {THEME_OPTIONS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
                  <Icon />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Row>
      </section>

      <section className="settings-section">
        <h2>Ngôn ngữ</h2>
        <Row
          title="Ngôn ngữ giao diện"
          note="Bản ghi và kết quả research giữ nguyên ngôn ngữ của câu đang bàn, kể cả khi hội thoại pha tiếng Anh."
        >
          <span className="pill pill--type">{LANGUAGES[0]}</span>
        </Row>
      </section>

      <section className="settings-section">
        <h2>Nghiên cứu</h2>
        <Row
          title="Tùy chọn nghiên cứu"
          note="Số nguồn mỗi chủ đề, ngôn ngữ truy vấn, cỡ chữ kết quả và giới hạn tin nhắn. Một nơi duy nhất, dùng chung cho mọi phiên."
        >
          <button className="btn btn--outline" onClick={() => setPrefsOpen(true, "wizard")}>
            <IconSettings />
            Mở tùy chọn
          </button>
        </Row>
        <Row
          title="Tự động gửi vào chat Meet"
          note="Tắt thì kết quả vẫn hiện ở màn theo dõi, nhưng không có chữ nào tự gõ vào cuộc họp."
        >
          <Switch
            checked={prefs.autoPost}
            onChange={(v) => setPrefs({ autoPost: v })}
            label="Tự động gửi vào chat Meet"
          />
        </Row>
      </section>

      <section className="settings-section settings-section--danger">
        <h2>Vùng làm việc</h2>
        <Row
          title="Xoá toàn bộ cuộc họp"
          note={`Gỡ ${meetings.length} cuộc họp cùng bản ghi và kết quả research khỏi vùng làm việc này.`}
        >
          <button
            className="btn btn--danger"
            disabled={meetings.length === 0}
            onClick={() => setWipeOpen(true)}
          >
            <IconTrash />
            Xoá tất cả
          </button>
        </Row>
      </section>

      <Dialog
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        title="Xoá toàn bộ cuộc họp?"
        description="Mọi bản ghi, chủ đề và kết quả research trong vùng làm việc này sẽ bị gỡ. Không hoàn tác được."
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setWipeOpen(false)}>
              Giữ lại tất cả
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                clearMeetings();
                setWipeOpen(false);
                pushToast("Đã xoá toàn bộ cuộc họp.");
              }}
            >
              Xoá {meetings.length} cuộc họp
            </button>
          </>
        }
      >
        <div className="alert-error">
          <IconTrash />
          <span>
            Thao tác này chỉ gỡ dữ liệu mẫu khỏi trang web. Nó không đụng tới Chrome
            extension hay tài khoản Blaze / Exa của bạn.
          </span>
        </div>
      </Dialog>
    </>
  );
}
