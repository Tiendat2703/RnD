"use client";

// components/dashboard/SessionList.tsx — danh sách cuộc họp, đơn vị của sản phẩm.
//
// Tên file giữ nguyên vì route `/dashboard/callSessions` và import trong page.tsx
// giữ nguyên; nội dung đã chuyển hẳn sang `MeetingRecord`.
//
// Không còn cột nào nói về tín dụng: bản mô tả IV.3.1 đếm bằng phiên họp, lượt
// kiểm chứng và artifact. Thẻ một cuộc họp vì vậy hiện ra những con số thật mà
// pipeline sinh ra — độ dài, số chủ đề, số nguồn đã gửi — chứ không phải một mức giá.
//
// Mọi hành động đều dẫn vào một surface có thật: mở lại phiên → monitor, chi tiết
// → panel trượt, sửa → wizard ở chế độ sửa.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import {
  dayKey,
  formatDuration,
  formatGroupDate,
  formatTime,
  MEETING_KIND_LABEL,
  type MeetingKind,
  type MeetingRecord,
} from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";
import { SessionActionsMenu } from "./SessionActionsMenu";
import {
  IconAlert,
  IconBook,
  IconBriefcase,
  IconChip,
  IconGauge,
  IconGlobe,
  IconGrid,
  IconInfo,
  IconPlus,
  IconRejoin,
  IconSearch,
  IconSort,
  IconTable,
  IconTranscript,
} from "./icons";

type Filter = "all" | MeetingKind;
type Sort = "newest" | "oldest";
type View = "card" | "table";

// Bộ lọc lấy đúng năm nhãn của MEETING_KIND_LABEL: thêm một loại ở lib/types.ts là
// nó tự xuất hiện ở đây, không phải sửa hai nơi rồi để lệch nhau.
const KIND_ICON: Record<MeetingKind, ReactNode> = {
  "san-pham": <IconChip />,
  "nghien-cuu": <IconGlobe />,
  "dao-tao": <IconBook />,
  "ban-le": <IconBriefcase />,
  khac: <IconGauge />,
};

const FILTERS: { id: Filter; label: string; icon: ReactNode }[] = [
  { id: "all", label: "Tất cả", icon: null },
  ...(Object.keys(MEETING_KIND_LABEL) as MeetingKind[]).map((k) => ({
    id: k as Filter,
    label: MEETING_KIND_LABEL[k],
    icon: KIND_ICON[k],
  })),
];

// "ready" không có nghĩa là "đã lên lịch": sản phẩm này không đặt lịch họp. Nó là
// phiên đã kết thúc và pipeline đã chạy xong — mở ra là có kết quả ngay.
const STATUS_LABEL: Record<MeetingRecord["status"], string> = {
  live: "Đang diễn ra",
  ready: "Đã có kết quả",
  ended: "Đã kết thúc",
};

function StatusPill({ status }: { status: MeetingRecord["status"] }) {
  if (status === "live") {
    return (
      <span className="pill pill--live">
        <span className="listening-bars" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {STATUS_LABEL.live}
      </span>
    );
  }
  if (status === "ready") return <span className="pill pill--ready">{STATUS_LABEL.ready}</span>;
  return <span className="pill pill--ended">{STATUS_LABEL.ended}</span>;
}

export function SessionList() {
  const { meetings, transcripts, deleteMeeting, openWizard, rejoinLive, openDetail, pushToast, savedSessions } =
    useDashboard();
  // phiên extension đã kết thúc: chưa gửi backend = "Chờ lưu"
  const saveStateOf = (m: MeetingRecord): "pending" | "saved" | null => {
    const s = savedSessions[m.id];
    if (!s || s.endedAt === null) return null;
    return typeof s.syncedAt === "number" ? "saved" : "pending";
  };

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View>("card");
  const [deleteOf, setDeleteOf] = useState<MeetingRecord | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("meetmate-view");
    if (saved === "card" || saved === "table") setView(saved);
  }, []);

  const changeView = (v: View) => {
    setView(v);
    window.localStorage.setItem("meetmate-view", v);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = meetings.filter(
      (m) =>
        (filter === "all" || m.kind === filter) &&
        (q === "" || m.title.toLowerCase().includes(q))
    );
    list.sort((a, b) =>
      sort === "newest"
        ? b.startedAt.localeCompare(a.startedAt)
        : a.startedAt.localeCompare(b.startedAt)
    );
    return list;
  }, [meetings, filter, query, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, MeetingRecord[]>();
    for (const m of filtered) {
      const key = dayKey(m.startedAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(m);
      else map.set(key, [m]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const actionsFor = (m: MeetingRecord) => ({
    label: m.title,
    onDetails: () => openDetail(m),
    onEdit: () => openWizard(m.id),
    onDelete: () => setDeleteOf(m),
  });

  /** phiên này có bản ghi thật trong vùng làm việc hay không */
  const hasLines = (m: MeetingRecord) => (transcripts[m.id]?.length ?? 0) > 0;

  return (
    <>
      <div className="tabbar">
        <div className="tabs" role="tablist" aria-label="Lọc cuộc họp theo loại">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className="tab"
              onClick={() => setFilter(f.id)}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
        <span className="tabbar__total">{filtered.length} cuộc họp</span>
      </div>

      <div className="toolbar">
        <div className="search-wrap search-wrap--sort">
          <IconSearch />
          <input
            className="input"
            type="search"
            placeholder="Tìm theo tên cuộc họp"
            aria-label="Tìm theo tên cuộc họp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* chỉ hai chiều sắp xếp, nên một glyph ghim trong ô tìm rẻ hơn select hai click */}
          <button
            className="search__sort"
            aria-label={sort === "newest" ? "Mới nhất trước" : "Cũ nhất trước"}
            onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
          >
            <IconSort />
          </button>
        </div>

        <div className="toolbar__right">
          <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
            <button
              aria-pressed={view === "card"}
              aria-label="Dạng thẻ"
              onClick={() => changeView("card")}
            >
              <IconGrid />
            </button>
            <button
              aria-pressed={view === "table"}
              aria-label="Dạng bảng"
              onClick={() => changeView("table")}
            >
              <IconTable />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <IconSearch />
          <h3>Không có cuộc họp nào khớp</h3>
          <p>
            {meetings.length === 0
              ? "Bắt đầu một phiên họp có MeetMate — bản ghi và kết quả research sẽ hiện ra ở đây."
              : "Thử một loại khác, hoặc xoá từ khoá tìm kiếm."}
          </p>
          {meetings.length > 0 ? (
            <button
              className="btn btn--secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Xoá bộ lọc
            </button>
          ) : (
            <button className="btn btn--primary" onClick={() => openWizard()}>
              <IconPlus />
              Cuộc họp mới
            </button>
          )}
        </div>
      ) : view === "card" ? (
        <div className="session-grid">
          {filtered.map((m) => (
            <article className="session-card" key={m.id}>
              <div className="session-card__body">
                <div className="session-card__top">
                  <time className="session-card__date" dateTime={m.startedAt}>
                    {formatGroupDate(m.startedAt)}
                  </time>
                  <SessionActionsMenu {...actionsFor(m)} />
                </div>
                <h3 className="session-card__role">{m.title}</h3>
                <p className="session-card__company">
                  {formatTime(m.startedAt)} · {formatDuration(m.durationSec)}
                </p>
                <div className="session-card__pills">
                  <span className="pill pill--type">
                    {KIND_ICON[m.kind]}
                    {MEETING_KIND_LABEL[m.kind]}
                  </span>
                  {m.topicCount > 0 ? <span className="pill pill--type">{m.topicCount} chủ đề</span> : null}
                  {hasLines(m) ? (
                    <span className="pill pill--type">
                      <IconTranscript />
                      Có bản ghi
                    </span>
                  ) : null}
                  {saveStateOf(m) === "pending" ? <span className="pill pill--live">Chờ lưu</span> : null}
                  {saveStateOf(m) === "saved" ? <span className="pill pill--ready">Đã lưu</span> : null}
                </div>
              </div>

              <div className="session-card__foot">
                <div className="session-card__stat">
                  <span className={cn("status-line", `status-line--${m.status}`)}>
                    <i aria-hidden />
                    {STATUS_LABEL[m.status]}
                  </span>
                  <span className="session-card__dur">{m.sourceCount} nguồn đã gửi</span>
                </div>
                {m.status === "live" ? (
                  <button className="btn btn--primary btn--sm" onClick={() => rejoinLive(m)}>
                    <IconRejoin />
                    Mở lại phiên
                  </button>
                ) : saveStateOf(m) === "pending" ? (
                  <button className="btn btn--primary btn--sm" onClick={() => openDetail(m, "bao-cao")}>
                    Lưu phiên
                  </button>
                ) : saveStateOf(m) === "saved" ? (
                  <button className="btn btn--secondary btn--sm" onClick={() => openDetail(m, "bao-cao")}>
                    Xem báo cáo
                  </button>
                ) : (
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => openDetail(m, hasLines(m) ? "ban-ghi" : "chi-tiet")}
                  >
                    {hasLines(m) ? "Xem bản ghi" : "Xem chi tiết"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="session-table-wrap dash-scroll">
          <table className="session-table">
            <thead>
              <tr>
                <th scope="col">Cuộc họp</th>
                <th scope="col">Loại</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" aria-sort={sort === "newest" ? "descending" : "ascending"}>
                  Thời gian
                </th>
                <th scope="col">Độ dài</th>
                <th scope="col">Chủ đề</th>
                <th scope="col">Nguồn</th>
                <th scope="col">
                  <span className="visually-hidden">Thao tác</span>
                </th>
              </tr>
            </thead>
            {groups.map(([key, items]) => (
              <tbody key={key}>
                <tr>
                  <td colSpan={8} className="session-table__group">
                    {formatGroupDate(items[0].startedAt)}
                  </td>
                </tr>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        className="session-table__role session-table__role--link"
                        onClick={() => openDetail(m)}
                      >
                        {m.title}
                      </button>
                    </td>
                    <td>
                      <span className="pill pill--type">{MEETING_KIND_LABEL[m.kind]}</span>
                    </td>
                    <td>
                      <StatusPill status={m.status} />
                    </td>
                    <td className="session-table__num">
                      <time dateTime={m.startedAt}>{formatTime(m.startedAt)}</time>
                    </td>
                    <td className="session-table__num">{formatDuration(m.durationSec)}</td>
                    <td className="session-table__num">{m.topicCount}</td>
                    <td className="session-table__num">{m.sourceCount}</td>
                    <td>
                      <div className="session-table__actions">
                        {m.status === "live" ? (
                          <button
                            className="icon-btn"
                            aria-label={`Mở lại phiên ${m.title}`}
                            onClick={() => rejoinLive(m)}
                          >
                            <IconRejoin />
                          </button>
                        ) : null}
                        <button
                          className="icon-btn"
                          aria-label={`Chi tiết cuộc họp ${m.title}`}
                          onClick={() => openDetail(m)}
                        >
                          <IconInfo />
                        </button>
                        <SessionActionsMenu {...actionsFor(m)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <Dialog
        open={deleteOf !== null}
        onClose={() => setDeleteOf(null)}
        title="Xoá cuộc họp này?"
        description={
          deleteOf
            ? `“${deleteOf.title}”, cùng bản ghi và kết quả research của phiên này, sẽ bị gỡ khỏi vùng làm việc. Không hoàn tác được.`
            : undefined
        }
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setDeleteOf(null)}>
              Giữ lại
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                if (deleteOf) {
                  deleteMeeting(deleteOf.id);
                  pushToast("Đã xoá cuộc họp.");
                }
                setDeleteOf(null);
              }}
            >
              Xoá cuộc họp
            </button>
          </>
        }
      >
        <div className="alert-error">
          <IconAlert />
          <span>
            Đây là dữ liệu mẫu của vùng làm việc. Xoá ở web console không xoá gì trong
            Chrome extension.
          </span>
        </div>
      </Dialog>
    </>
  );
}
