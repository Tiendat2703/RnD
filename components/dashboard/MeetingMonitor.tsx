"use client";

// components/dashboard/MeetingMonitor.tsx — surface khi MeetMate đang nghe.
//
// Thay cho LiveOverlay. Overlay cũ là phòng phỏng vấn: một bên là "câu hỏi của
// nhà tuyển dụng", một bên là "câu trả lời trợ lý viết giúp bạn". MeetMate
// không có hai thứ đó. Một bên là những gì nó NGHE (transcript, theo kênh âm),
// bên kia là những gì nó TÌM ĐƯỢC (chủ đề → nguồn → tin đã vào chat Meet).
//
// Đồng hồ chạy nhanh gấp 8 lần thời gian thật: replay 12 dòng hội thoại của
// mocks/meeting-transcript.json diễn ra trong ~30 giây. Nói rõ trên pill vì đây
// là tốc độ phát lại, không phải tốc độ phiên. Độ trễ của mô hình thì KHÔNG
// được nén — getResearchResult vẫn 2–4 giây thật, vì đó là chi phí người dùng
// sẽ chờ trong sản phẩm thật.
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import {
  FREE_PLAN,
  MEETING_KIND_LABEL,
  formatClock,
  sampleLines,
  sampleTopics,
} from "../../lib/dashboardData";
import { audioSourceLabel, stampFromMs } from "../../lib/formatChat";
import { LIMITS, type PipelineStage, type ResearchResult, type Topic } from "../../lib/types";
import { getResearchResult } from "../../lib/mockApi";
import { useDashboard } from "./DashboardContext";
import { ChromeDialog, DarkMenu, Switch } from "./controls";
import { MmPostList } from "./MmPost";
import { PipelineBar } from "./PipelineBar";
import {
  IconChevronRight,
  IconContrast,
  IconEraser,
  IconInfo,
  IconMic,
  IconMicOff,
  IconMore,
  IconPhone,
  IconSend,
  IconSettings,
  IconTextSize,
} from "./icons";

const SIM_SPEED = 8;
const WAIT_STAGE_MS = 900;
const WAIT_POST_MS = 850;

/** Dòng nào kết thúc một chủ đề thì chủ đề đó được kích hoạt. */
const TRIGGERS = [
  { atLine: 3, topicIdx: 0 },
  { atLine: 8, topicIdx: 1 },
  { atLine: 11, topicIdx: 2 },
];

interface Card {
  key: number;
  topic: Topic;
  result: ResearchResult | null;
  stage: PipelineStage | null;
  /** số tin đã thực sự hiện ra trong chat */
  revealed: number;
  /** số tin chủ đề này gửi được trước khi bị ngắt hoặc xong */
  posted: number;
  /** chủ đề mới đã đến trước khi gửi xong — phần còn lại không gửi nữa */
  killed: boolean;
}

type Submenu = null | "size" | "theme";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function MeetingMonitor() {
  const {
    live,
    prefs,
    setPrefs,
    liveLines,
    pushLiveLine,
    clearLiveLines,
    leaveLive,
    endLive,
    setPrefsOpen,
    openWizard,
    pushToast,
    useVerification,
    quota,
    openPricing,
  } = useDashboard();

  const [now, setNow] = useState(() => Date.now());
  const [chrome, setChrome] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [capturing, setCapturing] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [exitOpen, setExitOpen] = useState(false);
  const [leaveChoice, setLeaveChoice] = useState<"leave" | "end">("leave");

  const menuRef = useRef<HTMLDivElement>(null);
  const postsEndRef = useRef<HTMLDivElement>(null);
  const cardSeq = useRef(0);
  const dead = useRef<Set<number>>(new Set());
  const started = useRef<Set<number>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const prefsRef = useRef(prefs);
  const cardsRef = useRef<Card[]>([]);
  prefsRef.current = prefs;
  cardsRef.current = cards;

  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [live]);

  // một phiên mới = replay mới từ đầu
  useEffect(() => {
    if (!live) return;
    cardSeq.current = 0;
    dead.current = new Set();
    started.current = new Set();
    seen.current = new Set();
    setCards([]);
    setCapturing(true);
  }, [live?.meetingId, live]);

  const clockSec = live ? live.elapsedAtLeave + ((now - live.startedRunAt) / 1000) * SIM_SPEED : 0;
  const visible = capturing ? sampleLines.filter((l) => l.atMs / 1000 <= clockSec) : [];
  const stamp = formatClock(clockSec);

  const patchCard = useCallback((key: number, patch: Partial<Card>) => {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }, []);

  const runTopic = useCallback(
    async (topicIdx: number) => {
      const entry = sampleTopics[topicIdx];
      if (!entry) return;
      // chủ đề mới đến trước khi chủ đề cũ gửi xong → phần còn lại của chủ đề cũ
      // không gửi nữa. Đó là hành vi thật, lấy từ mocks/meetmate-output.json.
      setCards((prev) => prev.map((c) => (c.stage ? { ...c, killed: true, stage: null } : c)));
      cardsRef.current.forEach((c) => c.stage && dead.current.add(c.key));
      const key = ++cardSeq.current;
      setCards((prev) => [
        ...prev,
        {
          key,
          topic: entry.topic,
          result: null,
          stage: "topic",
          revealed: 0,
          posted: entry.posted,
          killed: false,
        },
      ]);

      const stop = () => dead.current.has(key);
      const kill = () => patchCard(key, { stage: null, killed: true });

      await wait(WAIT_STAGE_MS);
      if (stop()) return kill();
      patchCard(key, { stage: "searching" });

      const result = await getResearchResult(entry.topic);
      if (stop()) return kill();
      patchCard(key, { stage: "writing", result });

      await wait(WAIT_STAGE_MS);
      if (stop()) return kill();
      patchCard(key, { stage: "posting" });

      const total = 1 + Math.min(result.sources.length, prefsRef.current.sources, LIMITS.maxSources);
      const landable = prefsRef.current.autoPost ? Math.min(entry.posted, total) : 0;
      for (let i = 1; i <= landable; i++) {
        await wait(WAIT_POST_MS);
        if (stop() || !prefsRef.current.autoPost) break;
        patchCard(key, { revealed: i });
      }
      if (stop()) return kill();
      // `entry.cancelled` là dữ liệu fixture (mocks/meetmate-output.json: "[3/4]
      // chưa kịp gõ thì chủ đề mới đã đến"). Nó chỉ có nghĩa khi chủ đề này thật
      // sự không gửi hết — nếu người dùng giảm số nguồn và phần còn lại gửi hết
      // rồi thì thẻ phải báo "xong", không được giữ nhãn "đã ngắt".
      patchCard(key, { stage: null, killed: entry.cancelled && landable < total });
      useVerification();
    },
    [patchCard, useVerification]
  );

  useEffect(() => {
    if (!live) return;
    for (const t of TRIGGERS) {
      if (visible.length > t.atLine && !started.current.has(t.topicIdx)) {
        started.current.add(t.topicIdx);
        void runTopic(t.topicIdx);
      }
    }
  }, [visible.length, live, runTopic]);

  // đồng hồ đi qua dòng nào thì dòng đó vào bản ghi của phiên, đúng một lần
  useEffect(() => {
    if (!live) return;
    for (const l of visible) {
      if (!seen.current.has(l.id)) {
        seen.current.add(l.id);
        pushLiveLine(l);
      }
    }
  }, [visible, live, pushLiveLine]);

  useEffect(() => {
    postsEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [cards]);

  // kebab: click ra ngoài hoặc Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubmenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (submenu) setSubmenu(null);
      else {
        setMenuOpen(false);
        setSubmenu(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [menuOpen, submenu]);

  const running = cards.find((c) => c.stage);
  const stage: PipelineStage | null = running
    ? running.stage
    : !capturing
      ? null
      : visible.length < sampleLines.length
        ? "transcribing"
        : "listening";

  if (!live) return null;

  const capMin = FREE_PLAN.meetingCapMin;
  const capLeftMin = capMin - Math.floor(clockSec / 60);
  const overCap = capLeftMin <= 0;
  const nearCap = !overCap && capLeftMin <= 5;

  const confirmExit = () => {
    const total = Math.round(clockSec / SIM_SPEED);
    setExitOpen(false);
    if (leaveChoice === "leave") leaveLive(total);
    else endLive(total);
  };

  return (
    <div className="ovl darkchrome" data-chrome={chrome}>
      <header className="ovl__bar">
        <div className="ovl__id">
          <span className="ovl__pulse" aria-hidden data-on={capturing ? "yes" : "no"} />
          <div className="ovl__idtext">
            <strong className="dc-title">{live.title}</strong>
            <span className="dc-muted">{MEETING_KIND_LABEL[live.kind]} · Meet</span>
          </div>
        </div>

        <div className="ovl__right">
          <span
            className="pill-timer"
            title={`Phiên đang chạy. Gói Free giới hạn ${capMin} phút mỗi phiên — đồng hồ này chạy ở tốc độ phát lại ×${SIM_SPEED}.`}
          >
            <IconMic />
            {stamp}
            <em>demo ×{SIM_SPEED}</em>
          </span>

          <div className="menu-anchor" ref={menuRef}>
            <button
              className="icon-btn icon-btn--dark"
              aria-label="Cấu hình phiên"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <IconMore />
            </button>

            {menuOpen ? (
              <div className="dmenu dmenu--anchor" role="menu" aria-label="Cấu hình phiên">
                {submenu === null ? (
                  <>
                    <MenuRow
                      icon={<IconTextSize />}
                      label="Cỡ chữ kết quả"
                      value={prefs.textSize}
                      onOpen={() => setSubmenu("size")}
                    />
                    <MenuRow
                      icon={<IconContrast />}
                      label="Nền"
                      value={chrome === "dark" ? "Tối" : "Sáng"}
                      onOpen={() => setSubmenu("theme")}
                    />
                    <div className="dmenu__row">
                      <span className="dmenu__rowlabel">
                        <IconSend />
                        Tự động gửi vào chat
                      </span>
                      <Switch
                        checked={prefs.autoPost}
                        onChange={(v) => {
                          setPrefs({ autoPost: v });
                          pushToast(
                            v
                              ? "Tự động gửi đang bật."
                              : "Tự động gửi đã tắt — kết quả chờ bạn bấm trong popup."
                          );
                        }}
                        label="Tự động gửi vào chat"
                      />
                    </div>
                    <div className="dmenu__divider" role="separator" />
                    <button
                      className="dmenu__item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setPrefsOpen(true, "live");
                      }}
                    >
                      <IconSettings />
                      Tùy chọn nghiên cứu
                    </button>
                    <button
                      className="dmenu__item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        openWizard(live.meetingId);
                      }}
                    >
                      <IconInfo />
                      Sửa cuộc họp
                    </button>
                  </>
                ) : (
                  <>
                    <button className="dmenu__back" onClick={() => setSubmenu(null)}>
                      <IconChevronRight className="is-back" />
                      Quay lại
                    </button>
                    <DarkMenu
                      open
                      label={submenu === "size" ? "Cỡ chữ kết quả" : "Nền"}
                      value={submenu === "size" ? prefs.textSize : chrome}
                      items={
                        submenu === "size"
                          ? [
                              { id: "S", label: "Nhỏ" },
                              { id: "M", label: "Vừa" },
                              { id: "L", label: "Lớn" },
                            ]
                          : [
                              { id: "dark", label: "Tối" },
                              { id: "light", label: "Sáng" },
                            ]
                      }
                      onPick={(id) => {
                        if (submenu === "size") setPrefs({ textSize: id as "S" | "M" | "L" });
                        if (submenu === "theme") setChrome(id as "dark" | "light");
                        setSubmenu(null);
                        setMenuOpen(false);
                      }}
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>

          <button className="btn btn--danger-solid" onClick={() => setExitOpen(true)}>
            <IconPhone />
            Rời phiên
          </button>
        </div>
      </header>

      {overCap || nearCap || quota.verificationsLeft === 0 ? (
        <div
          className={cn(
            "mm-band",
            overCap || quota.verificationsLeft === 0 ? "mm-band--error" : "mm-band--warn",
            "ovl__band"
          )}
          role="status"
        >
          <IconInfo className="mm-band__glyph" />
          {overCap ? (
            <span>
              Phiên đã vượt {capMin} phút — trần của gói Free.{" "}
              <button className="link" onClick={() => openPricing("pro")}>
                Xem gói Pro
              </button>
              .
            </span>
          ) : quota.verificationsLeft === 0 ? (
            <span>
              Hết lượt kiểm chứng của gói Free — MeetMate vẫn phiên âm nhưng không tìm nguồn nữa.{" "}
              <button className="link" onClick={() => openPricing("pro")}>
                Xem gói Pro
              </button>
              .
            </span>
          ) : (
            <span>Còn {capLeftMin} phút trong trần {capMin} phút của gói Free.</span>
          )}
        </div>
      ) : null}

      <div className="ovl__split">
        {/* trái — những gì MeetMate nghe được */}
        <section className="ovl__panel" aria-label="Bản ghi đang chạy">
          <div className="ovl__panelhead">
            <h3 className="dc-title">Đang nghe</h3>
            <div className="ovl__panelactions">
              <button className="btn btn--dark-ghost btn--sm" onClick={() => setCapturing((v) => !v)}>
                {capturing ? <IconMicOff /> : <IconMic />}
                {capturing ? "Tạm dừng" : "Nghe tiếp"}
              </button>
              <button
                className="btn btn--dark-ghost btn--sm"
                onClick={() => {
                  clearLiveLines();
                  pushToast("Đã xóa bản ghi khỏi tab này.");
                }}
              >
                <IconEraser />
                Xóa
              </button>
            </div>
          </div>

          <p className="ovl__listening" data-on={capturing ? "yes" : "no"}>
            <span className="listening-bars listening-bars--dark" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {capturing
              ? "MeetMate đang đọc âm thanh tab Meet và micro của bạn"
              : "Đã tạm dừng — không dòng nào được phiên âm thêm"}
          </p>

          <div className="ovl__lines dash-scroll" data-size={prefs.textSize}>
            {liveLines.length === 0 ? (
              <p className="dc-muted ovl__hint">
                Chưa có dòng nào. Hai kênh âm — tab Meet và micro của bạn — là toàn bộ những gì
                MeetMate nghe được; nó không biết ai đang nói.
              </p>
            ) : (
              liveLines.map((l, i) => (
                <div className="ocline" key={`${l.id}-${i}`}>
                  <span className={cn("ocline__who", l.source === "mic" && "ocline__who--you")}>
                    {audioSourceLabel(l.source)}
                  </span>
                  <p className="ocline__text">{l.text}</p>
                  <time className="ocline__at">{stampFromMs(l.atMs)}</time>
                </div>
              ))
            )}
          </div>
        </section>

        {/* phải — những gì MeetMate tìm được */}
        <section className="ovl__panel ovl__panel--answers" aria-label="Kết quả nghiên cứu">
          <div className="ovl__panelhead">
            <h3 className="dc-title">Kết quả MeetMate</h3>
            <span className="dchip">{quota.verificationsLeft} lượt kiểm chứng còn lại</span>
          </div>

          <PipelineBar stage={stage} className="ovl__pipeline" />

          <div className="ovl__answers dash-scroll" data-size={prefs.textSize}>
            {cards.length === 0 ? (
              <div className="ovl__empty">
                <IconSend />
                <p>
                  Chưa có chủ đề nào. MeetMate chỉ tìm nguồn khi đoạn hội thoại ra một câu hỏi hoặc
                  một nhận định cần kiểm chứng — chuyện phiếm bị bỏ qua.
                </p>
              </div>
            ) : (
              cards.map((c) => (
                <article className="mm-topic" key={c.key}>
                  <header className="mm-topic__head">
                    <h4 className="mm-topic__name">{c.topic.topic}</h4>
                    {c.stage ? (
                      <span className="mm-topic__stage">đang chạy</span>
                    ) : c.killed ? (
                      <span className="mm-topic__stage mm-topic__stage--killed">đã ngắt</span>
                    ) : c.revealed === 0 ? (
                      <span className="mm-topic__stage mm-topic__stage--off">chưa gửi</span>
                    ) : (
                      <span className="mm-topic__stage mm-topic__stage--done">xong</span>
                    )}
                  </header>

                  <p className="mm-topic__query">
                    <IconSearchInline />
                    {c.topic.query}
                  </p>

                  {c.result ? (
                    <MmPostList
                      result={c.result}
                      sources={prefs.sources}
                      posted={c.revealed}
                      at={stamp}
                    />
                  ) : (
                    <p className="dc-muted mm-topic__waiting">Đang tách chủ đề…</p>
                  )}
                </article>
              ))
            )}
            <div ref={postsEndRef} />
          </div>

          <div className="ovl__foot">
            <p className="ovl__footnote">
              {cards.reduce((n, c) => n + c.revealed, 0)} tin đã vào chat Meet ·{" "}
              {prefs.autoPost ? "tự động" : "chờ bạn bấm"}
            </p>
          </div>
        </section>
      </div>

      <ChromeDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        ariaLabel="Rời hoặc kết thúc phiên"
        className="leave"
      >
        <h3 className="dc-title">Rời hay kết thúc phiên?</h3>
        <p className="dc-muted">
          Rời phiên giữ MeetMate chạy trong tab Chrome của bạn. Kết thúc phiên ghi bản ghi và danh
          sách nguồn vào cuộc họp.
        </p>

        <div className="leave__choices" role="radiogroup" aria-label="Chọn việc sẽ xảy ra">
          <button
            type="button"
            role="radio"
            aria-checked={leaveChoice === "leave"}
            className={cn("choice", leaveChoice === "leave" && "choice--on")}
            onClick={() => setLeaveChoice("leave")}
          >
            <span className="choice__dot" aria-hidden />
            <span>
              <span className="choice__title">Rời phiên</span>
              <span className="choice__note">
                Extension vẫn nghe. Quay lại tab này để xem tiếp, không mất thêm hạn mức.
              </span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={leaveChoice === "end"}
            className={cn("choice", leaveChoice === "end" && "choice--on")}
            onClick={() => setLeaveChoice("end")}
          >
            <span className="choice__dot" aria-hidden />
            <span>
              <span className="choice__title">Kết thúc phiên</span>
              <span className="choice__note">
                {liveLines.length} dòng và {cards.length} chủ đề sẽ được lưu vào chi tiết cuộc họp.
              </span>
            </span>
          </button>
        </div>

        <div className="leave__foot">
          <button className="btn btn--dark-ghost" onClick={() => setExitOpen(false)}>
            Ở lại phiên
          </button>
          <button
            className={cn("btn", leaveChoice === "end" ? "btn--danger-solid" : "btn--light")}
            onClick={confirmExit}
          >
            {leaveChoice === "end" ? "Kết thúc phiên" : "Rời phiên"}
          </button>
        </div>
      </ChromeDialog>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onOpen,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onOpen: () => void;
}) {
  return (
    <button className="dmenu__item" role="menuitem" onClick={onOpen}>
      {icon}
      {label}
      <span className="dmenu__value">{value}</span>
      <IconChevronRight />
    </button>
  );
}

function IconSearchInline() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" className="mm-topic__glass">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}
