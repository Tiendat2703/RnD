"use client";

// components/dashboard/DashboardShell.tsx — khung shell: rail, topbar, toast,
// theme, và các surface vòng đời phiên (wizard → cài tiện ích → monitor →
// rời/kết thúc, tùy chọn nghiên cứu, panel chi tiết). Bảng giá không nằm ở đây:
// nó là route /dashboard/upgrade, nên "Nâng cấp" trên rail là một link.
//
// Thương hiệu là MeetMate. Rail chỉ còn công việc của trợ lý cuộc họp; suite tìm
// việc (Mock/Resume/Headshot), hộp thoại hỗ trợ và chuông thông báo đã xoá vì
// chúng thuộc sản phẩm khác.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  FREE_PLAN,
  defaultPrefs,
  initialMeetings,
  sampleLines,
  type MeetingKind,
  type MeetingLine,
  type MeetingRecord,
  type ResearchPrefs,
} from "../../lib/dashboardData";
import {
  DashboardContext,
  type LiveState,
  type PendingMeeting,
  type PlanId,
  type PrefsFrom,
  type Quota,
  type ResolvedTheme,
  type Theme,
  type Toast,
  type ToastKind,
  type WizardState,
} from "./DashboardContext";
import { CreateSessionWizard } from "./CreateSessionWizard";
import { InstallExtensionDialog } from "./InstallExtensionDialog";
import { MeetingMonitor } from "./MeetingMonitor";
import { ResearchPreferencesDialog } from "./ResearchPreferencesDialog";
import { MeetingDetailPanel } from "./MeetingDetailPanel";
import { UserMenu } from "./UserMenu";
import { NewMeetingButton } from "./NewMeetingButton";
import { PlanCard } from "./PlanCard";
import {
  IconCheck,
  IconFolder,
  IconLogo,
  IconMoon,
  IconPanel,
  IconSun,
  IconTranscript,
  IconX,
} from "./icons";

// Rail là việc cần làm, không phải tủ hàng. "Cuộc họp mới" nằm ở topbar — một
// hàng rail trùng CTA chính là khuôn của đối thủ, không phải của sản phẩm này.
const NAV_GROUPS: {
  label: string;
  items: { label: string; href: string; icon: typeof IconTranscript; count?: boolean }[];
}[] = [
  {
    label: "Trợ lý cuộc họp",
    items: [
      { label: "Cuộc họp", href: "/dashboard/callSessions", icon: IconTranscript, count: true },
      { label: "Tài liệu", href: "/dashboard/documents", icon: IconFolder },
    ],
  },
];

// topbar mang tên trang và một dòng mô tả — cột nội dung không có heading thứ hai
const TITLES: Record<string, { title: string; note: string }> = {
  "/dashboard/callSessions": {
    title: "Cuộc họp",
    note: "Mọi cuộc họp MeetMate đã nghe, số chủ đề và số nguồn đã gửi vào chat Meet.",
  },
  "/dashboard/documents": {
    title: "Tài liệu",
    note: "Tài liệu để đối chiếu trong cuộc họp. Lớp mục tiêu — MeetMate chưa truy xuất những file này.",
  },
  "/dashboard/settings": {
    title: "Cấu hình",
    note: "Hồ sơ, giao diện và dữ liệu của vùng làm việc này.",
  },
  "/dashboard/profile": {
    title: "Tài khoản",
    note: "Thông tin tài khoản, gói đang dùng và những gì MeetMate lưu.",
  },
  "/dashboard/upgrade": {
    title: "Gói dịch vụ",
    note: "Bảng giá dự kiến theo bản mô tả — chưa mở bán, không thu khoản nào ở đây.",
  },
};

export function DashboardShell({
  children,
  fontClassName,
}: {
  children: ReactNode;
  fontClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setThemeState] = useState<Theme>("light");
  const [systemDark, setSystemDark] = useState(false);
  const resolvedTheme: ResolvedTheme = theme === "auto" ? (systemDark ? "dark" : "light") : theme;
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [meetings, setMeetings] = useState<MeetingRecord[]>(initialMeetings);
  const [quota, setQuota] = useState<Quota>({
    meetingsLeft: FREE_PLAN.meetings,
    verificationsLeft: FREE_PLAN.verifications,
    artifactsLeft: FREE_PLAN.artifacts,
  });
  const [planFocus, setPlanFocus] = useState<PlanId>("pro");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  /* --- lifecycle surfaces --- */
  const [prefs, setPrefsState] = useState<ResearchPrefs>(defaultPrefs);
  const [wizard, setWizard] = useState<WizardState>({ open: false });
  const [installFor, setInstallFor] = useState<PendingMeeting | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [liveLines, setLiveLines] = useState<MeetingLine[]>([]);
  // mọi phiên đã chạy đều có bản ghi, nên "Xem chi tiết"/"Xem bản ghi" trên thẻ
  // không dẫn vào chỗ trống; phiên live đang giữa họp nên mới tích dần. Lọc theo
  // "kết thúc" từng bỏ sót hai phiên trạng thái ready — panel của chúng mở ra
  // với 0 dòng, đúng cái người dùng không có cách nào phân biệt với "chưa ghi".
  const [transcripts, setTranscripts] = useState<Record<string, MeetingLine[]>>(() => ({
    "m-01": sampleLines.slice(0, 7),
    ...Object.fromEntries(
      initialMeetings
        .filter((m) => m.status !== "live")
        .map((m, i) => [m.id, i % 2 === 0 ? sampleLines : sampleLines.slice(7)])
    ),
  }));
  const [prefsOpen, setPrefsOpenState] = useState(false);
  const [prefsFrom, setPrefsFrom] = useState<PrefsFrom>("live");
  // tùy chọn mở từ hai surface có khung khác nhau, nên ai mở phải đi kèm cờ
  const setPrefsOpen = useCallback((open: boolean, from?: PrefsFrom) => {
    if (open && from) setPrefsFrom(from);
    setPrefsOpenState(open);
  }, []);
  const [detailOf, setDetailOf] = useState<{ meeting: MeetingRecord; tab: string } | null>(null);
  const [banked, setBanked] = useState<Record<string, number>>({});

  // restore theme after mount to avoid SSR mismatch
  useEffect(() => {
    const saved = window.localStorage.getItem("meetmate-theme");
    if (saved === "dark" || saved === "light" || saved === "auto") setThemeState(saved);
  }, []);

  // only read the OS preference while the user actually chose "auto"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem("meetmate-theme", t);
  }, []);

  // bảng giá là một trang, nên "mở" nghĩa là đi tới đó. Gói được nhấn đi qua
  // shell thay vì query string: shell giữ state nên /dashboard/upgrade mở nguội
  // vẫn đọc đúng.
  const openPricing = useCallback(
    (plan?: PlanId) => {
      if (plan) setPlanFocus(plan);
      setNavOpen(false);
      router.push("/dashboard/upgrade");
    },
    [router]
  );

  const pushToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const renameMeeting = useCallback((id: string, title: string) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));
  }, []);

  const deleteMeeting = useCallback((id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearMeetings = useCallback(() => setMeetings([]), []);

  const addMeeting = useCallback((m: MeetingRecord) => {
    setMeetings((prev) => [m, ...prev]);
  }, []);

  const updateMeeting = useCallback((id: string, patch: Partial<MeetingRecord>) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // Một lượt kiểm chứng = một chủ đề được nghiên cứu. Đây là đơn vị tính phí thật
  // của sản phẩm (mục IV.3.1), không phải "tín dụng cuộc gọi".
  const useVerification = useCallback(
    (n: number = 1) => {
      setQuota((q) => {
        const left = Math.max(0, q.verificationsLeft - n);
        if (q.verificationsLeft > 0 && left === 0) {
          pushToast("Hết lượt kiểm chứng của gói Free — xem gói Pro.", "error");
        }
        return { ...q, verificationsLeft: left };
      });
    },
    [pushToast]
  );

  const useArtifact = useCallback(() => {
    setQuota((q) => {
      const left = Math.max(0, q.artifactsLeft - 1);
      if (q.artifactsLeft > 0 && left === 0) {
        pushToast("Đã dùng hết artifact của gói Free.", "error");
      }
      return { ...q, artifactsLeft: left };
    });
  }, [pushToast]);

  const setPrefs = useCallback((patch: Partial<ResearchPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const openWizard = useCallback((editId?: string, kind?: MeetingKind) => {
    setWizard({ open: true, editId, kind });
  }, []);

  const closeWizard = useCallback(() => setWizard({ open: false }), []);

  const requestInstall = useCallback((draft: PendingMeeting) => {
    setWizard({ open: false });
    setInstallFor(draft);
  }, []);

  const cancelInstall = useCallback(() => setInstallFor(null), []);

  const pushLiveLine = useCallback((line: MeetingLine) => {
    setLiveLines((prev) => [...prev, line]);
  }, []);

  const clearLiveLines = useCallback(() => setLiveLines([]), []);

  const startLive = useCallback((draft: PendingMeeting, meetingId: string) => {
    setInstallFor(null);
    setLiveLines([]);
    setLive({
      meetingId,
      title: draft.title,
      kind: draft.kind,
      elapsedAtLeave: 0,
      startedRunAt: Date.now(),
      topicCount: 0,
      sourceCount: 0,
    });
  }, []);

  const rejoinLive = useCallback(
    (m: MeetingRecord) => {
      setLiveLines(transcripts[m.id] ?? []);
      setLive({
        meetingId: m.id,
        title: m.title,
        kind: m.kind,
        elapsedAtLeave: banked[m.id] ?? 0,
        startedRunAt: Date.now(),
        topicCount: m.topicCount,
        sourceCount: m.sourceCount,
      });
      // rời phiên không tính thêm: extension vẫn chạy trong Chrome của người
      // dùng, không có khái niệm "giữ phòng ấm" để mà trả phí
      if (banked[m.id] !== undefined) pushToast("Đã quay lại phiên đang ghi.");
    },
    [transcripts, banked, pushToast]
  );

  const leaveLive = useCallback(
    (elapsedSec: number) => {
      if (live) setBanked((b) => ({ ...b, [live.meetingId]: elapsedSec }));
      setLive(null);
      pushToast("Đồng hồ vẫn chạy — quay lại trước khi hết phiên.");
    },
    [live, pushToast]
  );

  const endLive = useCallback(
    (elapsedSec: number) => {
      if (live) {
        updateMeeting(live.meetingId, {
          status: "ended",
          durationSec: elapsedSec,
          topicCount: live.topicCount,
          sourceCount: live.sourceCount,
        });
        if (liveLines.length > 0) {
          setTranscripts((t) => ({ ...t, [live.meetingId]: liveLines }));
        }
      }
      setLive(null);
      pushToast("Đã kết thúc phiên. Bản ghi và nguồn nằm trong chi tiết cuộc họp.");
    },
    [live, liveLines, updateMeeting, pushToast]
  );

  // close the mobile drawer on navigation
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Drawer 390px là một khối nổi phủ hết màn hình: chuột thì có scrim để bấm,
  // còn bàn phím chỉ có Escape. Không đóng được nghĩa là vào được mà không ra
  // được. Không đưa vào `useModalBehaviour` như dialog: menu thẻ và hộp thoại cài
  // extension mở *trên* drawer, modal stack sẽ giành Escape cho riêng chúng — nên
  // ở đây Escape chỉ đóng drawer khi không có menu/hộp thoại nào đang mở, và vì
  // thế cú Escape thứ hai mới là cú đóng drawer.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const page = TITLES[pathname ?? ""] ?? { title: "MeetMate", note: "Vùng làm việc trợ lý cuộc họp." };

  return (
    <DashboardContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        meetings,
        renameMeeting,
        deleteMeeting,
        clearMeetings,
        addMeeting,
        updateMeeting,
        quota,
        useVerification,
        useArtifact,
        planFocus,
        setPlanFocus,
        openPricing,
        navOpen,
        pushToast,
        prefs,
        setPrefs,
        wizard,
        openWizard,
        closeWizard,
        installFor,
        requestInstall,
        cancelInstall,
        live,
        startLive,
        rejoinLive,
        leaveLive,
        endLive,
        liveLines,
        pushLiveLine,
        clearLiveLines,
        transcripts,
        prefsOpen,
        prefsFrom,
        setPrefsOpen,
        detailOf,
        openDetail: (m, tab = "ban-ghi") => setDetailOf({ meeting: m, tab }),
        closeDetail: () => setDetailOf(null),
      }}
    >
      <div
        className={cn("dash", fontClassName, collapsed && "is-collapsed", navOpen && "is-mobile-open")}
        data-theme={resolvedTheme}
      >
        <a className="skip-link" href="#dash-main">
          Chuyển tới nội dung
        </a>

        {navOpen ? (
          <div className="sidebar-scrim" onClick={() => setNavOpen(false)} aria-hidden />
        ) : null}

        <aside className="sidebar" aria-label="Điều hướng vùng làm việc">
          <div className="sidebar__brand">
            <span className="brand-mark" aria-hidden>
              <IconLogo />
            </span>
            <span className="brand-word">MeetMate</span>
          </div>

          <nav className="sidebar__nav" aria-label="Chính">
            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.label}>
                <p className="nav-label">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-item"
                      aria-current={pathname === item.href ? "page" : undefined}
                      title={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {item.count ? <span className="nav-item__count">{meetings.length}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar__spacer" />

          <PlanCard quota={quota} />

          <UserMenu />
        </aside>

        <div className="main">
          <header className="topbar">
            <button
              className="icon-btn topbar__menu-btn"
              aria-label="Mở điều hướng"
              onClick={() => setNavOpen(true)}
            >
              <IconPanel />
            </button>
            <button
              className="icon-btn topbar__collapse-btn"
              aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              onClick={() => setCollapsed((v) => !v)}
            >
              <IconPanel />
            </button>
            <h1 className="topbar__page">
              {page.title}
              <span>{page.note}</span>
            </h1>

            <div className="topbar__actions">
              <NewMeetingButton />
              <button
                className="icon-btn topbar__theme"
                aria-label={resolvedTheme === "light" ? "Chuyển sang nền tối" : "Chuyển sang nền sáng"}
                onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
              >
                {resolvedTheme === "light" ? <IconMoon /> : <IconSun />}
              </button>
            </div>
          </header>

          <main className="content dash-scroll" id="dash-main">
            <div className="content__inner">{children}</div>
          </main>
        </div>

        {/* toast host — region thông báo, aria-live để máy đọc màn hình nói được */}
        <div className="toast-host" role="region" aria-label="Thông báo" aria-live="polite">
          {toasts.map((t) => (
            <div className={cn("toast", t.kind === "error" && "toast--error")} key={t.id}>
              {t.kind === "error" ? <IconX /> : <IconCheck />}
              <span>{t.message}</span>
              <button
                className="toast__close"
                aria-label="Đóng thông báo"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                <IconX />
              </button>
            </div>
          ))}
        </div>

        <CreateSessionWizard />
        <InstallExtensionDialog />
        <MeetingMonitor />
        <ResearchPreferencesDialog />
        <MeetingDetailPanel />
      </div>
    </DashboardContext.Provider>
  );
}
