"use client";

// components/dashboard/controls.tsx — shared primitives for the second-pass surfaces:
// modal behaviour hook, Switch, Segmented, and the chrome-aware dialog shell.
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { isTopModal, popModal, pushModal } from "./modalStack";

/** Escape + focus trap + focus restore — the same contract as Dialog.tsx. */
export function useModalBehaviour(
  open: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLDivElement | null>
) {
  const restoreRef = useRef<HTMLElement | null>(null);
  // the caller passes an inline arrow; keeping it in a ref is what stops this
  // effect from tearing down and re-pushing the modal on every parent render
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) pushModal(panel);
    restoreRef.current = document.activeElement as HTMLElement | null;
    const sel = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const first = panel?.querySelector<HTMLElement>(sel);
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
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(sel)).filter(
        (el) => !el.hasAttribute("disabled")
      );
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
  }, [open, panelRef]);
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn("switch", checked && "switch--on")}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" aria-hidden />
    </button>
  );
}

export interface SegOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  compact,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("seg", compact && "seg--compact")} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className="seg__item"
            onClick={() => onChange(o.id)}
          >
            {Icon ? <Icon /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Radio card — the Format/Length/Tone selection unit. */
export function RadioCard({
  selected,
  onSelect,
  title,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn("rcard", selected && "rcard--selected")}
      onClick={onSelect}
    >
      <span className="rcard__dot" aria-hidden />
      <span>
        <span className="rcard__title">{title}</span>
        <span className="rcard__note">{note}</span>
      </span>
    </button>
  );
}

/**
 * Dialog shell for the call surfaces. `chrome="dark"` is the pinned live-call
 * look; `chrome="theme"` leaves the tokens alone so the dialog follows the
 * user's theme — use it whenever the opener is a themed surface.
 */
export function ChromeDialog({
  open,
  onClose,
  ariaLabel,
  className,
  chrome = "dark",
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
  chrome?: "dark" | "theme";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalBehaviour(open, onClose, ref);
  if (!open) return null;
  const dark = chrome === "dark";
  return (
    <div
      className={cn("scrim", dark && "scrim--dark")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn("dcard", dark && "darkchrome", className)}
      >
        {children}
      </div>
    </div>
  );
}

/** Small dark dropdown for menu rows inside dark chrome (text size / theme / language). */
export function DarkMenu({
  open,
  label,
  items,
  value,
  onPick,
}: {
  open: boolean;
  label: string;
  items: { id: string; label: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="dmenu" role="menu" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          role="menuitemradio"
          aria-checked={value === it.id}
          className="dmenu__item"
          onClick={() => onPick(it.id)}
        >
          {it.label}
          {value === it.id ? <span className="dmenu__check" aria-hidden>✓</span> : null}
        </button>
      ))}
    </div>
  );
}
