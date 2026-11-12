"use client";

// components/dashboard/MeetingDetailPanel.tsx — panel chi tiết một cuộc họp.
//
// Bốn tab theo đúng bốn thứ MeetMate để lại sau một phiên: cái nó NGHE (bản ghi),
// cái nó TÌM ĐƯỢC (nguồn), cái bạn LÀM TỪ đó (artifact), và hồ sơ phiên
// (chi tiết). Panel cũ của đối thủ có "AI notes" và "Ask AI" — hai thứ giả vì
// sản phẩm này không tóm tắt thay bạn và không có chat với AI về buổi họp.
//
// Mọi dữ liệu là của phiên thật do extension ghi (chủ đề, nguồn, bản ghi).
import { useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { downloadPdf } from "../../lib/downloadPdf";
import { getSavedSession } from "../../lib/backendApi";
import { reportToMarkdown } from "../../lib/report";
import {
  MEETING_KIND_LABEL,
  RESEARCH_FOOTNOTE,
  formatDuration,
  formatGroupDate,
  formatTime,
} from "../../lib/dashboardData";
import { audioSourceLabel, stampFromMs } from "../../lib/formatChat";
import { useDashboard } from "./DashboardContext";
import { useModalBehaviour } from "./controls";
import { MmPostList } from "./MmPost";
import { EvidenceCard } from "./EvidenceCard";
import { StatusChart } from "./StatusChart";
import { ReportPreview } from "./ReportPreview";
import { SessionMemoryView } from "./SessionMemoryView";
import { SessionReport } from "./SessionReport";
import { EVIDENCE_LABEL, EVIDENCE_ORDER, reportMarkdown, statusCounts } from "../../lib/evidence";
import {
  IconCheck,
  IconClock,
  IconDownload,
  IconEraser,
  IconFile,
  IconInfo,
  IconList,
  IconNotePencil,
  IconTable,
  IconTranscript,
  IconX,
  IconZap,
} from "./icons";

const TABS = [
  { id: "ban-ghi", label: "Bản ghi", icon: IconTranscript },
  { id: "nguon", label: "Nguồn", icon: IconFile },
  { id: "artifact", label: "Artifact", icon: IconTable },
  { id: "chi-tiet", label: "Chi tiết", icon: IconInfo },
];

/**
 * Cuộc họp có thẻ đối chiếu (Knowledge Card) thêm hai tab "Nhận định" và "Bối cảnh" và bỏ tab
 * "Nguồn" — tab đó là nguồn web của luồng cũ và không thuộc cuộc họp này.
 */
function tabsFor(hasCards: boolean, hasSession: boolean) {
  const base = !hasCards
    ? TABS
    : [
        TABS[0],
        { id: "nhan-dinh", label: "Nhận định", icon: IconCheck },
        { id: "boi-canh", label: "Bối cảnh", icon: IconNotePencil },
        TABS[2],
        TABS[3],
      ];
  // phiên do extension ghi: tab "Báo cáo" để lưu phiên lên backend và xem báo cáo
  return hasSession ? [base[0], { id: "bao-cao", label: "Báo cáo", icon: IconList }, ...base.slice(1)] : base;
}

/** slug giữ được dấu tiếng Việt — [^\w] sẽ xóa sạch tiêu đề Việt. */
function slug(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function download(name: string, text: string, done: (m: string) => void) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  done(`Đã tải ${name}.`);
}

const ARTIFACTS = [
  { id: "report", label: "Báo cáo cuộc họp (PDF)", icon: IconFile, note: "Diễn biến, các nhận định đã đối chiếu kèm trạng thái bằng chứng, quyết định và những gì còn mở." },
  { id: "chart", label: "Biểu đồ trạng thái bằng chứng (PNG)", icon: IconTable, note: "Số nhận định theo từng trạng thái bằng chứng, dựng từ các thẻ đối chiếu." },
];

export function MeetingDetailPanel() {
  const { detailOf, closeDetail, sessionCards, savedSessions } = useDashboard();
  const ref = useRef<HTMLDivElement>(null);
  useModalBehaviour(detailOf !== null, closeDetail, ref);

  const [tab, setTab] = useState("ban-ghi");
  const last = useRef<string | null>(null);

  if (detailOf && detailOf.meeting.id !== last.current) {
    last.current = detailOf.meeting.id;
    setTab(detailOf.tab);
  }

  if (!detailOf) return null;
  const { meeting } = detailOf;
  const cards = sessionCards[meeting.id] ?? [];
  const tabs = tabsFor(cards.length > 0, meeting.id in savedSessions);

  return (
    <div
      className="scrim scrim--flush"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeDetail();
      }}
    >
      <aside
        ref={ref}
        className="dp"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết cuộc họp: ${meeting.title}`}
        tabIndex={-1}
      >
        <header className="dp__head">
          <div className="dp__id">
            <h2 className="dp__title">
              {meeting.title}
            </h2>
            <p className="dp__sub">
              {MEETING_KIND_LABEL[meeting.kind]} · {formatGroupDate(meeting.startedAt)} ·{" "}
              {formatTime(meeting.startedAt)}
            </p>
          </div>
          <button className="icon-btn" aria-label="Đóng chi tiết" onClick={closeDetail}>
            <IconX />
          </button>
        </header>

        <div className="dp__body">
          <nav className="dp__rail" role="tablist" aria-label="Các phần của cuộc họp">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={cn("dp__railbtn", tab === t.id && "dp__railbtn--on")}
                  onClick={() => setTab(t.id)}
                >
                  <Icon />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <DetailBody key={meeting.id} id={meeting.id} tab={tab} />
        </div>
      </aside>
    </div>
  );
}

function DetailBody({ id, tab }: { id: string; tab: string }) {
  const { meetings, transcripts, sessionTopics, sessionCards, pushToast, saves, savedSessions } =
    useDashboard();
  const cards = sessionCards[id] ?? [];
  const meeting = meetings.find((m) => m.id === id);
  const [cleared, setCleared] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const saved = useMemo(() => transcripts[id] ?? [], [transcripts, id]);
  const lines = cleared ? [] : saved;

  if (!meeting) return null;
  const name = slug(meeting.title);

  const transcriptText = lines
    .map((l) => `[${stampFromMs(l.atMs)}] ${audioSourceLabel(l.source)}: ${l.text}`)
    .join("\n");

  // chủ đề + nguồn thật của phiên do extension ghi
  const topics = (sessionTopics[id] ?? []).map((t) => ({ topic: t.topic, result: t.result, posted: t.posted }));

  const sourcesText = topics
    .flatMap((t) =>
      (t.result?.sources ?? []).map(
        (s) => `${t.topic.topic}\n  ${s.title}\n  ${s.url}\n  Vì sao chọn: ${s.reason}`
      )
    )
    .join("\n\n");

  return (
    <section className="dp__main" aria-live="polite">
      <div className="dp__toolbar">
        {tab === "nhan-dinh" ? (
          <p className="dp__hint">
            {cards.length} thẻ đối chiếu:{" "}
            {EVIDENCE_ORDER.filter((s) => statusCounts(cards)[s] > 0)
              .map((s) => `${statusCounts(cards)[s]} ${EVIDENCE_LABEL[s].toLowerCase()}`)
              .join(" · ")}
            . Câu trả lời lấy từ tài liệu của nhóm.
          </p>
        ) : tab === "bao-cao" ? (
          <p className="dp__hint">Báo cáo do backend MeetMate tạo từ bản ghi sau khi bạn lưu phiên.</p>
        ) : tab === "boi-canh" ? (
          <p className="dp__hint">Những gì MeetMate ghi lại về phiên này ngoài bản ghi.</p>
        ) : tab === "ban-ghi" ? (
          <p className="dp__hint">
            {lines.length} dòng. Chỉ hai kênh âm — MeetMate không phân biệt ai đang nói.
          </p>
        ) : tab === "nguon" ? (
          <p className="dp__hint">{topics.length} chủ đề đã tách trong phiên.</p>
        ) : tab === "artifact" ? (
          <p className="dp__hint">Đầu ra MVP: báo cáo PDF và biểu đồ PNG. Slide và bảng tính là định hướng sau MVP.</p>
        ) : (
          <p className="dp__hint">Những gì vùng làm việc lưu về phiên này.</p>
        )}

        {tab === "ban-ghi" && lines.length > 0 ? (
          <div className="dp__tools">
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCleared(true);
                pushToast("Đã xóa bản ghi của phiên này.");
              }}
            >
              <IconEraser />
              Xóa bản ghi
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => download(`${name}-ban-ghi.txt`, transcriptText, pushToast)}
            >
              <IconDownload />
              Tải
            </button>
          </div>
        ) : null}

        {tab === "nguon" ? (
          <div className="dp__tools">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => download(`${name}-nguon.txt`, sourcesText, pushToast)}
            >
              <IconDownload />
              Tải danh sách nguồn
            </button>
          </div>
        ) : null}
      </div>

      {tab === "ban-ghi" ? (
        <div className="dp__scroll dash-scroll">
          {lines.length === 0 ? (
            <div className="dp__empty">
              <IconTranscript />
              <p>Phiên này chưa có bản ghi được lưu.</p>
            </div>
          ) : (
            lines.map((l, i) => (
              <div className="transcript-line" key={l.id ?? i}>
                <span className={cn("transcript-line__who", l.source === "mic" && "transcript-line__who--ai")}>
                  {audioSourceLabel(l.source)}
                </span>
                <div>
                  <p>{l.text}</p>
                  <time>{stampFromMs(l.atMs)}</time>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "bao-cao" ? (
        <div className="dp__scroll dash-scroll">
          <SessionReport id={id} onDownload={(file, text) => download(`${name}-${file}`, text, pushToast)} />
        </div>
      ) : null}

      {tab === "nhan-dinh" ? (
        <div className="dp__scroll dash-scroll">
          <div className="ev-list">
            {cards.map((c) => (
              <EvidenceCard key={c.id} card={c} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "boi-canh" ? (
        <div className="dp__scroll dash-scroll">
          <SessionMemoryView cards={cards} />
        </div>
      ) : null}

      {tab === "nguon" ? (
        <div className="dp__scroll dash-scroll">
          <div className="mm-sources">
            {topics.length === 0 ? (
              <div className="dp__empty">
                <IconTranscript />
                <p>Phiên này chưa tách được chủ đề nào.</p>
              </div>
            ) : null}
            {topics.map((t, i) => (
              <article className="mm-srcgroup" key={`${t.topic.topic}-${i}`}>
                <h3 className="mm-srcgroup__title">{t.topic.topic}</h3>
                <ul className="mm-srcgroup__keys">
                  {t.topic.keywords.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
                {t.result ? (
                  <MmPostList result={t.result} posted={t.posted} />
                ) : (
                  <p className="dp__hint">Chưa tìm được nguồn cho chủ đề này.</p>
                )}
              </article>
            ))}
          </div>
          <p className="dp__footnote">{RESEARCH_FOOTNOTE}</p>
        </div>
      ) : null}

      {tab === "artifact" ? (
        <div className="dp__scroll dash-scroll">
          <div className="artgrid">
            {ARTIFACTS.map((a) => {
              const Icon = a.icon;
              const isMade = made === a.id;
              return (
                <button
                  key={a.id}
                  className={cn("artcard", isMade && "artcard--on")}
                  disabled={exporting}
                  onClick={async () => {
                    if (a.id === 'chart') {
                      setMade(a.id);
                      if (!cards.length) pushToast('Phiên chưa có thẻ đối chiếu để xuất biểu đồ.', 'error');
                      return;
                    }
                    setExporting(true);
                    try {
                      const state = saves[id];
                      const response = state?.phase === 'done' ? state.res :
                        savedSessions[id]?.syncedAt ? await getSavedSession(id) : null;
                      const text = response?.report ? reportToMarkdown(response.report) :
                        cards.length ? reportMarkdown(meeting.title, cards) :
                        transcriptText ? `Bản ghi cuộc họp (chưa có báo cáo AI)\n\n${transcriptText}\n\n${sourcesText}` : '';
                      if (!text) throw new Error('Phiên chưa có báo cáo hoặc bản ghi để xuất PDF.');
                      await downloadPdf(meeting.title, text, `${name}-bao-cao.pdf`);
                      setMade(a.id);
                      pushToast('Đã tải báo cáo PDF.', 'success');
                    } catch (error) {
                      pushToast(error instanceof Error ? error.message : 'Không xuất được PDF.', 'error');
                    } finally { setExporting(false); }
                  }}
                >
                  <span className="artcard__icon">
                    <Icon />
                  </span>
                  <span className="artcard__text">
                    <span className="artcard__label">{a.label}</span>
                    <span className="artcard__note">{a.note}</span>
                  </span>
                  <span className="artcard__state">
                    {isMade ? (
                      <>
                        <IconCheck />
                        {exporting ? 'Đang xuất…' : 'Tải lại'}
                      </>
                    ) : (
                      <>
                        <IconDownload />
                        Xuất
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {made === "report" && cards.length > 0 ? (
            <ReportPreview
              title={meeting.title}
              cards={cards}
              onDownload={() => download(`${name}-bao-cao.md`, reportMarkdown(meeting.title, cards), pushToast)}
            />
          ) : null}
          {made === "chart" && cards.length > 0 ? (
            <StatusChart title={meeting.title} cards={cards} onDone={(m) => pushToast(m, "success")} />
          ) : null}
          <p className="dp__footnote">
            Xuất PDF từ báo cáo đã lưu; nếu chưa có báo cáo, xuất các thẻ đối chiếu hoặc bản ghi hiện có.
            Tải file cục bộ không trừ lượt xuất của gói Free.
          </p>
        </div>
      ) : null}

      {tab === "chi-tiet" ? (
        <div className="dp__scroll dash-scroll">
          <dl className="dp__kv">
            <div>
              <dt>Mã phiên</dt>
              <dd>
                <code>{meeting.id}</code>
              </dd>
            </div>
            <div>
              <dt>Loại cuộc họp</dt>
              <dd>{MEETING_KIND_LABEL[meeting.kind]}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>
                {meeting.status === "live" ? "Đang ghi" : meeting.status === "ready" ? "Đã xong bản ghi" : "Đã kết thúc"}
              </dd>
            </div>
            <div>
              <dt>Bắt đầu</dt>
              <dd>
                {formatGroupDate(meeting.startedAt)}, {formatTime(meeting.startedAt)}
              </dd>
            </div>
            <div>
              <dt>
                <IconClock />
                Thời lượng
              </dt>
              <dd>{formatDuration(meeting.durationSec)}</dd>
            </div>
            <div>
              <dt>Chủ đề đã tách</dt>
              <dd>{meeting.topicCount}</dd>
            </div>
            <div>
              <dt>Nguồn đã gửi vào chat</dt>
              <dd>{meeting.sourceCount}</dd>
            </div>
            <div>
              <dt>Thời lượng cho phép</dt>
              <dd>
                Không giới hạn
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
