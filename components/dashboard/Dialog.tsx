"use client";

// components/dashboard/Dialog.tsx — modal primitive: scrim, esc, focus trap
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { isTopModal, popModal, pushModal } from "./modalStack";
import { IconX } from "./icons";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, description, wide, children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2, 8)}`);
  // see useModalBehaviour: an inline onClose must not re-register this effect
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) pushModal(panel);
    restoreRef.current = document.activeElement as HTMLElement | null;
    const first = panel?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      // a dialog buried under another dialog does not get the key
      if (panel && !isTopModal(panel)) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (panel) popModal(panel);
      restoreRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        tabIndex={-1}
        className={cn("dialog", wide && "dialog--wide")}
      >
        <div className="dialog__head">
          <div>
            <h2 className="dialog__title" id={titleId.current}>
              {title}
            </h2>
            {description ? <p className="dialog__desc">{description}</p> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <IconX />
          </button>
        </div>
        <div className="dialog__body dash-scroll">{children}</div>
        {footer ? <div className="dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}