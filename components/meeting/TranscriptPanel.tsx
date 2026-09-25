"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Participant, TranscriptEntry } from "../../lib/types";

type TranscriptPanelProps = {
  entries: TranscriptEntry[];
  participants: Participant[];
  isStreaming: boolean;
  isPaused: boolean;
  isComplete: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onClose: () => void;
};

const intentLabels = {
  question: "Câu hỏi",
  decision: "Quyết định",
  action: "Việc cần làm",
  summary: "Tóm tắt",
} as const;

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

function PlaybackIcon({ mode }: { mode: "play" | "pause" | "restart" }) {
  if (mode === "play") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 9 6-9 6V6Z" /></svg>;
  if (mode === "restart") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5v5h5M5.7 16A8 8 0 1 0 6 7.5L4 10" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12" /></svg>;
}

function SparkleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5Z" />
      <path d="M19 15.5c.25 1.8.7 2.25 2.5 2.5-1.8.25-2.25.7-2.5 2.5-.25-1.8-.7-2.25-2.5-2.5 1.8-.25 2.25-.7 2.5-2.5Z" />
    </svg>
  );
}

function formatTimestamp(timestamp: number) {
  const totalSeconds = Math.floor(timestamp / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function participantInitials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export default function TranscriptPanel({ entries, participants, isStreaming, isPaused, isComplete, onTogglePause, onRestart, onClose }: TranscriptPanelProps) {
  const [activeTab, setActiveTab] = useState<"transcript" | "notes">("transcript");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const people = useMemo(() => new Map(participants.map((person) => [person.id, person])), [participants]);
  const visibleEntries = entries.filter((entry) =>
    entry.text.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
  );

  useEffect(() => {
    if (!query) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, query]);

  return (
    <aside className="transcript-panel" aria-label="Bản ghi cuộc họp">
      <div className="transcript-panel__header">
        <div>
          <div className="transcript-panel__eyebrow"><span className="live-dot" /> Trực tiếp</div>
          <h2>Bản ghi cuộc họp</h2>
        </div>
        <div className="transcript-panel__actions">
          <button
            className="icon-button"
            type="button"
            aria-label={isComplete ? "Phát lại cuộc hội thoại" : isPaused ? "Tiếp tục hội thoại" : "Tạm dừng hội thoại"}
            title={isComplete ? "Phát lại" : isPaused ? "Tiếp tục" : "Tạm dừng"}
            onClick={isComplete ? onRestart : onTogglePause}
          >
            <PlaybackIcon mode={isComplete ? "restart" : isPaused ? "play" : "pause"} />
          </button>
          <button className={`icon-button${searchOpen ? " is-active" : ""}`} type="button" aria-label="Tìm trong bản ghi" onClick={() => setSearchOpen((value) => !value)}>
            <SearchIcon />
          </button>
          <button className="icon-button panel-close" type="button" aria-label="Đóng bản ghi" onClick={onClose}><CloseIcon /></button>
        </div>
      </div>

      {searchOpen && (
        <label className="transcript-search">
          <SearchIcon />
          <input autoFocus type="search" placeholder="Tìm nội dung..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      )}

      <div className="transcript-tabs" role="tablist" aria-label="Nội dung cuộc họp">
        <button type="button" role="tab" aria-selected={activeTab === "transcript"} className={activeTab === "transcript" ? "is-active" : ""} onClick={() => setActiveTab("transcript")}>Bản ghi</button>
        <button type="button" role="tab" aria-selected={activeTab === "notes"} className={activeTab === "notes" ? "is-active" : ""} onClick={() => setActiveTab("notes")}>Ghi chú <span>0</span></button>
      </div>

      {activeTab === "transcript" ? (
        <div className="transcript-list" ref={listRef}>
          <p className="transcript-date">Hôm nay · Product weekly</p>
          {visibleEntries.map((entry, index) => {
            const person = people.get(entry.speakerId);
            if (!person) return null;
            const isLatest = index === visibleEntries.length - 1 && !query;
            return (
              <Fragment key={entry.id}>
                {entry.topic && <div className="transcript-topic"><span />{entry.topic}</div>}
                <article className={`transcript-entry${isLatest ? " transcript-entry--latest" : ""}`}>
                  <div className="transcript-entry__avatar">{participantInitials(person.name)}</div>
                  <div className="transcript-entry__content">
                    <div className="transcript-entry__meta">
                      <div className="transcript-entry__speaker">
                        <strong>{person.name}</strong>
                        {entry.intent && <span className={`intent-badge intent-badge--${entry.intent}`}>{intentLabels[entry.intent]}</span>}
                      </div>
                      <time>{formatTimestamp(entry.timestamp)}</time>
                    </div>
                    <p>{entry.text}</p>
                  </div>
                </article>
              </Fragment>
            );
          })}
          {visibleEntries.length === 0 && <div className="transcript-empty"><SearchIcon /><p>Không tìm thấy nội dung phù hợp.</p></div>}
          {isStreaming && !query && (
            <div className="transcript-listening">
              <div className="audio-wave" aria-hidden="true"><i /><i /><i /><i /></div>
              Đang lắng nghe…
            </div>
          )}
          {isPaused && !query && (
            <button className="conversation-status" type="button" onClick={onTogglePause}>
              <PlaybackIcon mode="play" /> Hội thoại đang tạm dừng · Tiếp tục
            </button>
          )}
          {isComplete && !query && (
            <button className="conversation-status conversation-status--complete" type="button" onClick={onRestart}>
              <PlaybackIcon mode="restart" /> Cuộc họp đã kết thúc · Phát lại
            </button>
          )}
        </div>
      ) : (
        <div className="notes-empty">
          <span><SparkleIcon /></span>
          <h3>Chưa có ghi chú</h3>
          <p>Điểm nổi bật và action item sẽ xuất hiện tại đây.</p>
          <button type="button" onClick={() => setActiveTab("transcript")}>Quay lại bản ghi</button>
        </div>
      )}

      <div className="transcript-panel__footer"><span className="privacy-icon">✓</span> Chỉ người trong cuộc họp có thể xem bản ghi</div>
    </aside>
  );
}
