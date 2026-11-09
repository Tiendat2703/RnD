"use client";

// components/dashboard/SessionActionsMenu.tsx — menu ba chấm trên mỗi hàng.
//
// Ba mục, mỗi mục mở ra một surface có thật: Chi tiết → panel trượt, Sửa → wizard,
// Xoá → dialog xác nhận. Mục "Feedback" của bản cũ bị bỏ: không có backend nào nhận
// góp ý, và bản thân nó chỉ là một banner gài vào danh sách.
//
// Xoá dùng chữ danger, không dùng nền danger — nền đỏ chỉ dành cho nút xác nhận
// trong dialog, theo đúng quy tắc đã ghi ở docs/design/MEETMATE-DESIGN.md.
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { IconInfo, IconMore, IconPencil, IconTrash } from "./icons";

interface Props {
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  label?: string;
}

export function SessionActionsMenu({ onDetails, onEdit, onDelete, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const aria = label ? `Thao tác cho ${label}` : "Thao tác cuộc họp";

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        className="icon-btn"
        aria-label={aria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconMore />
      </button>
      {open ? (
        <div className="menu" role="menu" aria-label={aria}>
          <button className="menu__item" role="menuitem" onClick={run(onDetails)}>
            <IconInfo />
            Chi tiết
          </button>
          <button className="menu__item" role="menuitem" onClick={run(onEdit)}>
            <IconPencil />
            Sửa cuộc họp
          </button>
          <button
            className={cn("menu__item", "menu__item--danger")}
            role="menuitem"
            onClick={run(onDelete)}
          >
            <IconTrash />
            Xoá cuộc họp
          </button>
        </div>
      ) : null}
    </div>
  );
}
