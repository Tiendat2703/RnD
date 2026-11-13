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
import { onExtensionEvent, sendToExtension } from "../../lib/extensionBridge";
import type { SavedSession, SavedTopic } from "../../lib/bridgeProtocol";
import type { KnowledgeCard } from "../../lib/evidence";
import type { SavedSessionResponse } from "../../lib/report";
import {
  deleteDocument,
  getSavedSession,
  listDocuments,
  retryReport as retryReportApi,
  saveSessionToBackend,
  uploadPdf,
  uploadTextDocument,
} from "../../lib/backendApi";
import type { DocumentMeta } from "../../lib/documents";
import {
  defaultPrefs,
  type MeetingKind,
  type MeetingLine,
  type MeetingRecord,
  type ResearchPrefs,
} from "../../lib/dashboardData";
import {
  DashboardContext,
  type EndCounts,
  type ExtensionSession,
  type LiveMode,
  type LiveState,
  type NewDocument,
  type PendingMeeting,
  type PlanId,
  type PrefsFrom,
  type SaveState,
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
  IconBook,
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
      { label: "Phòng học Teacher", href: "/dashboard/teacher", icon: IconBook },
    ],
  },
];

// topbar mang tên trang và một dòng mô tả — cột nội dung không có heading thứ hai
const TITLES: Record<string, { title: string; note: string }> = {
  "/dashboard/teacher": { title: 'Teacher', note: 'Giáo viên ảo, tài liệu của bạn và những buổi học cùng nhóm.' },
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
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [planFocus, setPlanFocus] = useState<PlanId>("pro");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  /* --- lifecycle surfaces --- */
  const [prefs, setPrefsState] = useState<ResearchPrefs>(defaultPrefs);
  const [wizard, setWizard] = useState<WizardState>({ open: false });
  const [installFor, setInstallFor] = useState<PendingMeeting | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [extSession, setExtSession] = useState<ExtensionSession | null>(null);
  const [liveLines, setLiveLines] = useState<MeetingLine[]>([]);
  // bản ghi theo id cuộc họp; chỉ có phiên thật do extension ghi (hoặc phiên thử vừa chạy)
  const [transcripts, setTranscripts] = useState<Record<string, MeetingLine[]>>({});
  const [sessionTopics, setSessionTopics] = useState<Record<string, SavedTopic[]>>({});
  const [sessionCards, setSessionCards] = useState<Record<string, KnowledgeCard[]>>({});
  const [savedSessions, setSavedSessions] = useState<Record<string, SavedSession>>({});
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
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
    sendToExtension({ type: "sessions.delete", id });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearMeetings = useCallback(() => {
    // phiên extension đã lưu cũng phải xóa, nếu không lần đồng bộ sau sẽ hiện lại
    for (const id of Object.keys(sessionTopics)) sendToExtension({ type: "sessions.delete", id });
    setMeetings([]);
  }, [sessionTopics]);

  const addMeeting = useCallback((m: MeetingRecord) => {
    setMeetings((prev) => [m, ...prev.filter(existing=>existing.id!==m.id)]);
  }, []);

  const updateMeeting = useCallback((id: string, patch: Partial<MeetingRecord>) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const setPrefs = useCallback((patch: Partial<ResearchPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const openWizard = useCallback((editId?: string, kind?: MeetingKind) => {
    setWizard({ open: true, editId, kind });
  }, []);

  const closeWizard = useCallback(() => setWizard({ open: false }), []);

  /* --- thư viện tài liệu: nguồn sự thật là backend, web chỉ giữ bản danh sách --- */
  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
      setDocsError(null);
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : String(e));
    } finally {
      setDocsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const addDocument = useCallback(async (doc: NewDocument) => {
    const meta = doc instanceof File ? await uploadPdf(doc) : await uploadTextDocument(doc);
    setDocuments((prev) => [meta, ...prev.filter((d) => d.id !== meta.id)]);
    setDocsError(null);
    return meta;
  }, []);

  const removeDocument = useCallback(async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const requestInstall = useCallback((draft: PendingMeeting) => {
    setWizard({ open: false });
    setInstallFor(draft);
  }, []);

  const cancelInstall = useCallback(() => setInstallFor(null), []);

  const pushLiveLine = useCallback((line: MeetingLine) => {
    setLiveLines((prev) => [...prev, line]);
  }, []);

  const clearLiveLines = useCallback(() => setLiveLines([]), []);

  const startLive = useCallback(
    (draft: PendingMeeting, meetingId: string, mode: LiveMode = "demo") => {
      const now = Date.now();
      setInstallFor(null);
      setLiveLines([]);
      setExtSession(mode === "extension" ? { id: meetingId, startedAt: now } : null);
      // phiên extension được theo dõi ngay trong Meet; web không dựng "phòng họp"
      // toàn trang cho nó. Muốn xem trên web thì "Mở lại phiên" từ danh sách.
      if (mode === "extension" && draft.mode !== "presentation") {
        setLive(null);
        return;
      }
      setLive({
        meetingId,
        title: draft.title,
        kind: draft.kind,
        elapsedAtLeave: 0,
        startedRunAt: now,
        topicCount: 0,
        sourceCount: 0,
        mode,
        sessionStartedAt: now,
      });
    },
    []
  );

  const rejoinLive = useCallback(
    (m: MeetingRecord) => {
      // phiên extension vẫn đang ghi: bản ghi nằm sẵn trong `liveLines`, đồng hồ
      // chạy theo thời gian thật từ lúc extension bắt đầu nghe
      const ext = extSession && extSession.id === m.id ? extSession : null;
      if (!ext) setLiveLines(transcripts[m.id] ?? []);
      setLive({
        meetingId: m.id,
        title: m.title,
        kind: m.kind,
        elapsedAtLeave: banked[m.id] ?? 0,
        startedRunAt: Date.now(),
        topicCount: m.topicCount,
        sourceCount: m.sourceCount,
        mode: ext ? "extension" : "demo",
        sessionStartedAt: ext?.startedAt ?? Date.now(),
      });
      // rời phiên không tính thêm: extension vẫn chạy trong Chrome của người
      // dùng, không có khái niệm "giữ phòng ấm" để mà trả phí
      if (banked[m.id] !== undefined) pushToast("Đã quay lại phiên đang ghi.");
    },
    [transcripts, banked, extSession, pushToast]
  );

  const leaveLive = useCallback(
    (elapsedSec: number) => {
      if (live) setBanked((b) => ({ ...b, [live.meetingId]: elapsedSec }));
      setLive(null);
      pushToast("Đồng hồ vẫn chạy — quay lại trước khi hết phiên.");
    },
    [live, pushToast]
  );

  // `live` có thể đã null (người dùng rời phiên) mà extension vẫn ghi và rồi tự
  // kết thúc vì tab Meet đóng; khi đó phiên được nhận ra qua `extSession`.
  const endLive = useCallback(
    (elapsedSec: number, counts?: EndCounts) => {
      const id = live?.meetingId ?? extSession?.id;
      if (id) {
        updateMeeting(id, {
          status: "ended",
          durationSec: elapsedSec,
          topicCount: counts?.topicCount ?? live?.topicCount ?? 0,
          sourceCount: counts?.sourceCount ?? live?.sourceCount ?? 0,
        });
        if (liveLines.length > 0) {
          setTranscripts((t) => ({ ...t, [id]: liveLines }));
        }
      }
      if (extSession && extSession.id === id) {
        sendToExtension({ type: "session.stop" });
        setExtSession(null);
      }
      setLive(null);
      pushToast("Đã kết thúc phiên. Bản ghi và nguồn nằm trong chi tiết cuộc họp.");
    },
    [live, extSession, liveLines, updateMeeting, pushToast]
  );

  // Extension là nơi lưu phiên: mỗi lần mở web (và mỗi khi một phiên kết thúc) hỏi lại
  // danh sách, nên cuộc họp diễn ra lúc web đóng, hoặc sau khi tải lại trang, vẫn còn.
  const syncSessions = useCallback((list: SavedSession[]) => {
    if (list.length === 0) return;
    setMeetings((prev) => {
      let next = prev;
      for (const s of list) {
        const rec: MeetingRecord = {
          id: s.id,
          title: s.title,
          kind: s.kind,
          startedAt: new Date(s.startedAt).toISOString().slice(0, 19),
          durationSec: Math.max(0, Math.round(((s.endedAt ?? Date.now()) - s.startedAt) / 1000)),
          topicCount: s.topics.length,
          sourceCount: s.topics.reduce((n, t) => n + Math.max(0, t.posted - 1), 0),
          status: s.endedAt === null ? "live" : "ended",
        };
        const i = next.findIndex((m) => m.id === s.id);
        next = i >= 0 ? next.map((m, j) => (j === i ? { ...m, ...rec } : m)) : [rec, ...next];
      }
      return next;
    });
    setTranscripts((t) => ({
      ...t,
      ...Object.fromEntries(list.filter((s) => s.endedAt !== null).map((s) => [s.id, s.lines])),
    }));
    setSessionTopics((p) => ({ ...p, ...Object.fromEntries(list.map((s) => [s.id, s.topics])) }));
    setSavedSessions(prev=>{
      const next={...prev};
      for(const session of list){
        const old=prev[session.id];
        const stale=old?.presentation && session.presentation &&
          (old.presentation.revision!==session.presentation.revision || old.presentation.sequence>session.presentation.sequence);
        next[session.id]={...session,...(stale?{presentation:old.presentation}:{}),endedAt:old?.endedAt??session.endedAt};
      }
      return next;
    });
    setSessionCards((p) => ({
      ...p,
      ...Object.fromEntries(list.filter((s) => s.cards?.length).map((s) => [s.id, s.cards!])),
    }));
    const running = list.find((s) => s.endedAt === null);
    if (running) {
      // web được mở/tải lại giữa lúc extension đang nghe: nhận lại phiên đang chạy
      setExtSession((cur) => cur ?? { id: running.id, startedAt: running.startedAt });
      setLiveLines((prev) => (prev.length > 0 ? prev : running.lines));
    }
  }, []);

  useEffect(() => {
    const ask = () => sendToExtension({ type: "sessions.list" });
    ask();
    const retry = window.setTimeout(ask, 1500);
    const off = onExtensionEvent((ev) => {
      if (ev.type === "sessions") syncSessions(ev.sessions);
      else if (ev.type === 'presentation') {
        setSavedSessions(prev=>{const old=prev[ev.id];if(!old || (old.presentation && old.presentation.sequence>=ev.snapshot.sequence))return prev;return {...prev,[ev.id]:{...old,mode:'presentation',presentation:ev.snapshot}};});
        ask();
      }
      else if (ev.type === "ended") ask();
    });
    return () => {
      window.clearTimeout(retry);
      off();
    };
  }, [syncSessions]);

  // "Lưu phiên": web lấy phiên extension đã lưu, gửi backend, chờ báo cáo. Chỉ khi
  // báo cáo đã được lưu mới báo extension `markSynced`; trước đó extension giữ nguyên
  // phiên, nên lỗi mạng hay backend tắt không làm mất gì.
  const savedRef = useRef(savedSessions);
  savedRef.current = savedSessions;
  const inFlight = useRef(new Set<string>());

  const settle = useCallback(
    (id: string, res: SavedSessionResponse) => {
      setSaves((p) => ({ ...p, [id]: { phase: "done", res } }));
      if (res.reportStatus === "ok") {
        if (!savedRef.current[id]?.syncedAt) {
          sendToExtension({ type: "sessions.markSynced", id, syncedAt: Date.now() });
          sendToExtension({ type: "sessions.list" });
        }
        pushToast("Đã lưu phiên và tạo báo cáo.");
      } else {
        pushToast("Đã lưu phiên nhưng chưa tạo được báo cáo.", "error");
      }
    },
    [pushToast]
  );

  const runSave = useCallback(
    async (id: string, task: () => Promise<SavedSessionResponse>) => {
      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);
      setSaves((p) => ({ ...p, [id]: { phase: "saving" } }));
      try {
        settle(id, await task());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSaves((p) => ({ ...p, [id]: { phase: "error", message } }));
        pushToast(message, "error");
      } finally {
        inFlight.current.delete(id);
      }
    },
    [settle, pushToast]
  );

  const saveSession = useCallback(
    async (id: string) => {
      const s = savedRef.current[id];
      if (!s) {
        pushToast("Không tìm thấy phiên này trong extension MeetMate.", "error");
        return;
      }
      if (s.endedAt === null) {
        pushToast("Cuộc họp vẫn đang diễn ra. Kết thúc rồi mới lưu được.", "error");
        return;
      }
      await runSave(id, () => saveSessionToBackend(s));
    },
    [runSave, pushToast]
  );

  const retryReport = useCallback((id: string) => runSave(id, () => retryReportApi(id)), [runSave]);

  const loadReport = useCallback(async (id: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setSaves((p) => ({ ...p, [id]: { phase: "loading" } }));
    try {
      const res = await getSavedSession(id);
      setSaves((p) => ({ ...p, [id]: res ? { phase: "done", res } : { phase: "missing" } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaves((p) => ({ ...p, [id]: { phase: "error", message } }));
    } finally {
      inFlight.current.delete(id);
    }
  }, []);

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

  const page = TITLES[pathname ?? ""] ?? (pathname?.startsWith('/dashboard/teacher/') ? { title: 'Phòng học Teacher', note: 'Cùng học, đặt câu hỏi và luyện tập.' } : { title: "MeetMate", note: "Vùng làm việc trợ lý cuộc họp." });

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
        extSession,
        startLive,
        rejoinLive,
        leaveLive,
        endLive,
        liveLines,
        pushLiveLine,
        clearLiveLines,
        transcripts,
        sessionTopics,
        sessionCards,
        savedSessions,
        saves,
        saveSession,
        retryReport,
        loadReport,
        documents,
        docsLoaded,
        docsError,
        refreshDocuments,
        addDocument,
        removeDocument,
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
                      aria-current={pathname === item.href || pathname?.startsWith(`${item.href}/`) ? "page" : undefined}
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

          <PlanCard />

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
