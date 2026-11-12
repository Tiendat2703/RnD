"use client";

// components/dashboard/SessionReport.tsx — tab "Báo cáo" của một phiên do extension ghi.
//
// Phiên nằm trong extension cho tới khi người dùng bấm "Lưu phiên". Khi đó web gửi
// phiên lên backend MeetMate, backend tạo báo cáo từ transcript (ba phần: những gì
// đã diễn ra, ai làm gì, kế hoạch tiếp theo) và lưu lại.
import { useEffect, type ReactNode } from "react";
import { reportToMarkdown, type MeetingReport } from "../../lib/report";
import { useDashboard } from "./DashboardContext";
import { IconAlert, IconDownload, IconFile, IconSend, IconX } from "./icons";

function Band({ kind, children }: { kind: "warn" | "error"; children: ReactNode }) {
  const Glyph = kind === "error" ? IconX : IconAlert;
  return (
    <div className={`mm-band mm-band--${kind} dp__band`}>
      <Glyph className="mm-band__glyph" />
      <span>{children}</span>
    </div>
  );
}

export function SessionReport({ id, onDownload }: { id: string; onDownload: (name: string, text: string) => void }) {
  const { savedSessions, saves, saveSession, retryReport, loadReport } = useDashboard();
  const session = savedSessions[id];
  const state = saves[id];
  const synced = typeof session?.syncedAt === "number";

  // phiên đã lưu từ trước (web vừa mở lại): đọc báo cáo từ backend một lần
  useEffect(() => {
    if (synced && !state) void loadReport(id);
  }, [synced, state, id, loadReport]);

  if (!session) {
    return (
      <div className="dp__empty">
        <IconFile />
        <p>Chỉ phiên do extension MeetMate ghi mới tạo được báo cáo.</p>
      </div>
    );
  }

  if (session.endedAt === null) {
    return <Band kind="warn">Cuộc họp đang diễn ra. Kết thúc cuộc họp rồi mới lưu phiên được.</Band>;
  }

  const saveButton = (label: string) => (
    <button className="btn btn--primary btn--sm" onClick={() => void saveSession(id)}>
      <IconSend />
      {label}
    </button>
  );

  if (!state) {
    return (
      <div className="sr">
        <p className="dp__hint">
          Phiên đang nằm trong extension, chưa gửi lên backend. Bấm “Lưu phiên” để gửi bản ghi ({session.lines.length}{" "}
          dòng) và nguồn research, rồi tạo báo cáo: những gì đã diễn ra, ai làm gì, kế hoạch tiếp theo.
        </p>
        <div>{saveButton("Lưu phiên")}</div>
      </div>
    );
  }

  if (state.phase === "loading") return <p className="dp__hint">Đang đọc báo cáo đã lưu…</p>;
  if (state.phase === "saving")
    return <p className="dp__hint">Đang gửi phiên và tạo báo cáo. Việc này có thể mất tới một phút.</p>;

  if (state.phase === "missing") {
    return (
      <div className="sr">
        <Band kind="warn">Backend không còn bản lưu của phiên này. Bản ghi vẫn nằm trong extension.</Band>
        <div>{saveButton("Lưu lại phiên")}</div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="sr">
        <Band kind="error">{state.message}</Band>
        <p className="dp__hint">Phiên vẫn nằm nguyên trong extension, chưa mất gì.</p>
        <div>{saveButton(synced ? "Thử lại" : "Lưu phiên")}</div>
      </div>
    );
  }

  const { res } = state;
  if (res.reportStatus !== "ok" || !res.report) {
    return (
      <div className="sr">
        <Band kind="error">Đã lưu phiên nhưng chưa tạo được báo cáo: {res.error ?? "lỗi không rõ."}</Band>
        <div>
          <button className="btn btn--primary btn--sm" onClick={() => void retryReport(id)}>
            Tạo lại báo cáo
          </button>
        </div>
      </div>
    );
  }

  return <ReportView report={res.report} onDownload={onDownload} />;
}

function ReportView({
  report: r,
  onDownload,
}: {
  report: MeetingReport;
  onDownload: (name: string, text: string) => void;
}) {
  return (
    <section className="rp" aria-label="Báo cáo cuộc họp">
      <header className="rp__head">
        <div>
          <span className="rp__eyebrow">Báo cáo cuộc họp</span>
          <h3 className="rp__title">{r.title}</h3>
          <p className="rp__sub">
            Tạo lúc {new Date(r.generatedAt).toLocaleString("vi-VN")} từ bản ghi, bằng {r.model}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onDownload("bao-cao.md", reportToMarkdown(r))}
        >
          <IconDownload />
          Tải .md
        </button>
      </header>

      {r.transcriptTruncated ? (
        <Band kind="warn">Bản ghi quá dài: báo cáo chỉ dựa trên phần đầu cuộc họp.</Band>
      ) : null}

      <div className="rp__group">
        <span className="rp__label">Những gì đã diễn ra</span>
        <p className="sr__text">{r.summary || "Không có nội dung."}</p>
        {r.happenings.length > 0 ? (
          <ul className="rp__list">
            {r.happenings.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rp__group">
        <span className="rp__label">Ai làm gì</span>
        {r.assignments.length === 0 ? (
          <p className="sr__text">Bản ghi không có việc nào được giao rõ ràng.</p>
        ) : (
          <ul className="rp__list">
            {r.assignments.map((a, i) => (
              <li key={i}>
                <strong>{a.owner ?? "Chưa rõ người nhận"}</strong>: {a.task}
                <span className="rp__cite">“{a.evidence}”</span>
              </li>
            ))}
          </ul>
        )}
        <span className="rp__cite">
          Bản ghi không phân biệt người nói: tên chỉ có khi được nhắc trong câu.
          {r.droppedUnverified > 0 ? ` Đã bỏ ${r.droppedUnverified} mục vì câu căn cứ không có trong bản ghi.` : ""}
        </span>
      </div>

      <div className="rp__group">
        <span className="rp__label">Kế hoạch tiếp theo</span>
        {r.nextSteps.length === 0 ? (
          <p className="sr__text">Không có bước tiếp theo được nhắc.</p>
        ) : (
          <ul className="rp__list">
            {r.nextSteps.map((s, i) => (
              <li key={i}>
                {s.item}
                {s.due ? <span className="rp__time"> · hạn: {s.due}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {r.openQuestions.length > 0 ? (
          <>
            <span className="rp__label">Câu hỏi còn bỏ ngỏ</span>
            <ul className="rp__list">
              {r.openQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {r.sources.length > 0 ? (
        <div className="rp__group">
          <span className="rp__label">Nguồn research trong cuộc họp</span>
          <ul className="rp__list">
            {r.sources.map((s, i) => (
              <li key={i}>
                {s.topic}:{" "}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
