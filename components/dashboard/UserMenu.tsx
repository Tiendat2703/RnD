"use client";

// components/dashboard/UserMenu.tsx — menu tài khoản anchors ở đáy sidebar.
//
// Bốn mục, mỗi mục dẫn tới một surface có thật trong app này: Hồ sơ, Cài đặt,
// Gói & giá, và nhánh Chủ đề màu đổi tại chỗ thay vì lồng flyout thứ hai (rail
// hẹp sẽ bị tràn).
//
// Ba mục của bản cũ — Tutorials, Feedback Hub, Open desktop app — bị bỏ: không có
// walkthrough nào, không có backend nhận góp ý, và không có app desktop. Một mục
// chết trong menu là một lời hứa về thứ không tồn tại.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { ACCOUNT } from "../../lib/dashboardData";
import { useDashboard, type Theme } from "./DashboardContext";
import {
  IconChevronLeft,
  IconLogout,
  IconMore,
  IconPalette,
  IconSettings,
  IconUser,
  IconZap,
} from "./icons";

const THEME_ITEMS: { id: Theme; label: string; note: string }[] = [
  { id: "light", label: "Sáng", note: "Luôn dùng nền sáng" },
  { id: "dark", label: "Tối", note: "Luôn dùng nền tối" },
  { id: "auto", label: "Hệ thống", note: "Theo cài đặt của máy" },
];

export function UserMenu() {
  const { theme, resolvedTheme, setTheme, pushToast } = useDashboard();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (submenu) setSubmenu(false);
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, submenu]);

  const close = () => {
    setOpen(false);
    setSubmenu(false);
  };

  const say = (message: string) => () => {
    close();
    pushToast(message);
  };

  const themeLabel = theme === "auto" ? "Hệ thống" : theme === "dark" ? "Tối" : "Sáng";

  return (
    <div className="menu-anchor sidebar__user" ref={ref}>
      <button
        className="user-btn"
        aria-label="Menu tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-avatar" aria-hidden>
          {ACCOUNT.initials}
        </span>
        <span className="user-meta">
          <strong>{ACCOUNT.name}</strong>
          <span>{ACCOUNT.email}</span>
        </span>
        <IconMore className="user-btn__kebab" />
      </button>

      {open ? (
        submenu ? (
          <div className="menu menu--up" role="menu" aria-label="Chủ đề màu">
            <button className="menu__item menu__item--back" role="menuitem" onClick={() => setSubmenu(false)}>
              <IconChevronLeft />
              Quay lại
            </button>
            <div className="menu__sep" role="separator" />
            {THEME_ITEMS.map((t) => {
              const on = theme === t.id;
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={on}
                  className={cn("menu__item", on && "menu__item--on")}
                  onClick={() => {
                    setTheme(t.id);
                    close();
                  }}
                >
                  <IconPalette />
                  <span className="menu__label">
                    {t.label}
                    <em>{t.note}</em>
                  </span>
                  {on ? (
                    <span className="menu__tick" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="menu menu--up" role="menu" aria-label="Tài khoản">
            <Link className="menu__item" role="menuitem" href="/dashboard/profile" onClick={close}>
              <IconUser />
              Hồ sơ
            </Link>
            <Link className="menu__item" role="menuitem" href="/dashboard/settings" onClick={close}>
              <IconSettings />
              Cài đặt
            </Link>
            <Link className="menu__item" role="menuitem" href="/dashboard/upgrade" onClick={close}>
              <IconZap />
              <span className="menu__label">Gói &amp; giá</span>
              <span className="menu__value">{ACCOUNT.plan}</span>
            </Link>
            <button
              className="menu__item"
              role="menuitem"
              aria-haspopup="menu"
              onClick={() => setSubmenu(true)}
            >
              <IconPalette />
              <span className="menu__label">Chủ đề màu</span>
              <span className="menu__value">
                {theme === "auto" ? `${themeLabel} · ${resolvedTheme === "dark" ? "tối" : "sáng"}` : themeLabel}
              </span>
              <IconChevronLeft className="flip" />
            </button>
            <div className="menu__sep" role="separator" />
            <button
              className={cn("menu__item", "menu__item--danger")}
              role="menuitem"
              onClick={say("Bản demo — trang này chưa nối với hệ thống đăng nhập.")}
            >
              <IconLogout />
              Đăng xuất
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
