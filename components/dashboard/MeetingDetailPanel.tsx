"use client";

// components/dashboard/MeetingDetailPanel.tsx — panel chi tiết một cuộc họp.
//
// Bốn tab theo đúng bốn thứ MeetMate để lại sau một phiên: cái nó NGHE (bản ghi),
// cái nó TÌM ĐƯỢC (nguồn), cái bạn LÀM TỪ đó (artifact), và hồ sơ phiên
// (chi tiết). Panel cũ của đối thủ có "AI notes" và "Ask AI" — hai thứ giả vì
// sản phẩm này không tóm tắt thay bạn và không có chat với AI về buổi họp.
//
// Nguồn là mẫu: mocks/meetmate-output.json, cùng dữ liệu monitor dùng. Một phiên
// thật sẽ có chủ đề riêng; ở đây mọi phiên cùng trỏ về một bản ghi pipeline đã
// định nghĩa, nên panel nói rõ điều đó thay vì làm ra vẻ mỗi phiên một kết quả.
import { useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import {
  MEETING_KIND_LABEL,
  RESEARCH_FOOTNOTE,
  formatDuration,
  formatGroupDate,
  formatTime,
  sampleTopics,
} from "../../lib/dashboardData";
import { audioSourceLabel, stampFromMs } from "../../lib/formatChat";
import { LIMITS } from "../../lib/types";
import { useDashboard } from "./DashboardContext";
import { useModalBehaviour } from "./controls";
import { MmPostList } from "./MmPost";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconDownload,
  IconEraser,
  IconFile,
  IconInfo,
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
  { id: "brief", label: "Bản tổng hợp nghiên cứu", icon: IconNotePencil, note: "Chủ đề + nguồn + vì sao chọn, gói lại thành một trang." },
  { id: "report", label: "Báo cáo cuộc họp", icon: IconFile, note: " Diễn biến, các nhận định đã kiểm chứng và những gì còn mở." },
  { id: "slides", label: "Bộ slide", icon: IconZap, note: "Mỗi chủ đề một slide, nguồn để ở chân slide." },
  { id: "sheet", label: "Bảng tính", icon: IconTable, note: "Một dòng một nguồn: tiêu đề, URL, vì sao chọn, trạng thái." },
];

export function MeetingDetailPanel() {
  const { detailOf, closeDetail } = useDashboard();
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
            <h2 className="dp__title">{meeting.title}</h2>
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
            {TABS.map((t) => {
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
  const { meetings, transcripts, pushToast, quota, useArtifact, openPricing } = useDashboard();
  const meeting = meetings.find((m) => m.id === id);
  const [cleared, setCleared] = useState(false);
  const [made, setMade] = useState<string | null>(null);

  const saved = useMemo(() => transcripts[id] ?? [], [transcripts, id]);
  const lines = cleared ? [] : saved;

  if (!meeting) return null;
  const name = slug(meeting.title);

  const transcriptText = lines
    .map((l) => `[${stampFromMs(l.atMs)}] ${audioSourceLabel(l.source)}: ${l.text}`)
    .join("\n");

  const sourcesText = sampleTopics
    .flatMap((t) => t.result.sources.map((s) => `${t.topic.topic}\n  ${s.title}\n  ${s.url}\n  Vì sao chọn: ${s.reason}`))
    .join("\n\n");

  return (
    <section className="dp__main" aria-live="polite">
      <div className="dp__toolbar">
        {tab === "ban-ghi" ? (
          <p className="dp__hint">
            {lines.length} dòng. Chỉ hai kênh âm — MeetMate không phân biệt ai đang nói.
          </p>
        ) : tab === "nguon" ? (
          <p className="dp__hint">{sampleTopics.length} chủ đề đã tách trong phiên.</p>
        ) : tab === "artifact" ? (
          <p className="dp__hint">Bốn loại artifact bảng giá đếm theo cái, không theo phút.</p>
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

      {tab === "nguon" ? (
        <div className="dp__scroll dash-scroll">
          <div className="mm-sources">
            {sampleTopics.map((t) => (
              <article className="mm-srcgroup" key={t.topic.topic}>
                <h3 className="mm-srcgroup__title">{t.topic.topic}</h3>
                <ul className="mm-srcgroup__keys">
                  {t.topic.keywords.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
                <MmPostList result={t.result} posted={t.cancelled ? t.posted - 1 : t.posted} />
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
                  onClick={() => {
                    if (isMade) return;
                    if (quota.artifactsLeft === 0) {
                      pushToast("Hết artifact của gói Free — xem gói Pro.", "error");
                      openPricing("pro");
                      return;
                    }
                    useArtifact();
                    setMade(a.id);
                    pushToast(`Đã tạo "${a.label}" — 1 artifact của gói Free đã dùng.`, "success");
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
                        Đã tạo
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
          <p className="dp__footnote">
            Còn {quota.artifactsLeft} artifact trong gói Free. Bản xuất ở đây là bản mẫu — chưa có
            pipeline tạo file.
          </p>
        </div>
      ) : null}

      {tab === "chi-tiet" ? (
        <div className="dp__scroll dash-scroll">
          <dl className="dp__kv">
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
              <dt>Trần gói Free</dt>
              <dd>
                45 phút/phiên
                {meeting.durationSec > 45 * 60 ? " — phiên này đã vượt trần" : ""}
              </dd>
            </div>
          </dl>

          <div className="mm-band mm-band--warn dp__band">
            <IconAlert className="mm-band__glyph" />
            <span>
              Số chủ đề và số nguồn lấy từ bản ghi mẫu của pipeline, không phải từ một phiên MeetMate
              thật — extension chưa ghi được phiên nào.
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
