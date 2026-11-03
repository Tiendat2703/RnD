"use client";

// components/meeting/TranscriptPanel.tsx — bản ghi và nguồn, trong một bảng.
//
// Bản cũ tra `participants.get(entry.speakerId)` và `return null` khi không tìm
// thấy. MeetMate không có roster, nên cái null đó nuốt cả mười hai dòng: bảng
// trông như hỏng, chỉ vì code làm nó "có người" đã bị xóa. Giờ mỗi dòng chỉ cần
// kênh âm — nhãn, chữ, mốc thời gian — nên nó render được khi hệ thống không biết
// gì về danh tính người nói.
//
// Tab thứ hai là "Nguồn", không phải "Ghi chú". MeetMate không ghi chú hộ bạn:
// nó tìm nguồn và nói lý do chọn từng nguồn. Con số trên tab là số nguồn thật sự
// đã tìm được trong phiên.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MeetingLine } from "../../lib/types";
import { audioSourceLabel, stampFromMs } from "../../lib/formatChat";
import type { SessionCard } from "../../hooks/useMeetMateSession";
import AISidekickPanel from "../ai-sidekick/AISidekickPanel";
import { IconX, IconSearch, IconPanel } from "../dashboard/icons";

type Props = {
  lines: MeetingLine[];
  cards: SessionCard[];
  sourceCount: number;
  postCount: number;
  paused: boolean;
  complete: boolean;
  meetingTitle: string;
  onTogglePause: () => void;
  onRestart: () => void;
  onClose: () => void;
};

export default function TranscriptPanel({
  lines,
  cards,
  sourceCount,
  postCount,
  paused,
  complete,
  meetingTitle,
  onTogglePause,
  onRestart,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"transcript" | "sources">("transcript");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => lines.filter((l) => l.text.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))),
    [lines, query]
  );

  // "Nguồn" tự bật khi có nguồn đầu tiên: đó là lúc kết quả đáng nhìn hơn dòng chữ
  // đang chạy, và người dùng không phải với tay lên tab. Một khi người dùng đã tự
  // chọn tab thì không giành lại — bảng đang đọc dở bị nhảy đi là cách nhanh nhất
  // khiến người ta không tin vào bảng nữa.
  const firstSource = sourceCount > 0;
  const autoTabbed = useRef(false);
  const userPicked = useRef(false);
  useEffect(() => {
    if (firstSource && !autoTabbed.current && !userPicked.current) {
      autoTabbed.current = true;
      setTab("sources");
    }
  }, [firstSource]);

  useEffect(() => {
    if (!query && tab === "transcript") {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [lines.length, query, tab]);

  // chủ đề nào nối vào dòng nào, để vạch phân cách hiện đúng lúc MeetMate phát hiện ra nó
  const markerAt = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cards) m.set(c.atLine, c.topic.topic);
    return m;
  }, [cards]);

  return (
    <aside className="transcript-panel" aria-label="Bản ghi và nguồn">
      <div className="transcript-panel__header">
        <div>
          <div className="transcript-panel__eyebrow">
            <span className={`live-dot${paused ? " is-paused" : ""}`} aria-hidden />
            {paused ? "Đang tạm dừng" : "Trực tiếp"}
          </div>
          <h2>MeetMate đang nghe</h2>
        </div>
        <div className="transcript-panel__actions">
          <button
            className="icon-button"
            type="button"
            aria-label={
              complete ? "Phát lại từ đầu" : paused ? "Tiếp tục bản ghi" : "Tạm dừng bản ghi"
            }
            title="Chỉ ảnh hưởng bản phát lại trong trang này"
            onClick={complete ? onRestart : onTogglePause}
          >
            {paused || complete ? <IconPlayInline /> : <IconPauseInline />}
          </button>
          <button
            className={`icon-button${searchOpen ? " is-active" : ""}`}
            type="button"
            aria-label="Tìm trong bản ghi"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <IconSearch width={16} height={16} />
          </button>
          <button
            className="icon-button panel-close"
            type="button"
            aria-label="Đóng bảng bản ghi"
            onClick={onClose}
          >
            <IconX width={16} height={16} />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <label className="transcript-search">
          <IconSearch width={14} height={14} />
          <span className="visually-hidden">Tìm trong bản ghi</span>
          <input
            autoFocus
            type="search"
            placeholder="Tìm nội dung…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      ) : null}

      <div className="transcript-tabs" role="tablist" aria-label="Nội dung phiên">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "transcript"}
          className={tab === "transcript" ? "is-active" : ""}
          onClick={() => {
            userPicked.current = true;
            setTab("transcript");
          }}
        >
          Bản ghi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sources"}
          className={tab === "sources" ? "is-active" : ""}
          onClick={() => {
            userPicked.current = true;
            setTab("sources");
          }}
        >
          Nguồn <span>{sourceCount}</span>
        </button>
      </div>

      {tab === "transcript" ? (
        <div className="transcript-list" ref={listRef}>
          <p className="transcript-date">Hôm nay · {meetingTitle}</p>

          {lines.length === 0 ? (
            <p className="transcript-empty__line">
              Chưa có dòng nào. MeetMate chỉ đọc hai kênh: âm thanh tab Meet và micro
              của bạn.
            </p>
          ) : null}

          {visible.map((line, i) => {
            const isLatest = i === visible.length - 1 && !query;
            const topicHere = !query ? markerAt.get(lines.indexOf(line)) : undefined;
            return (
              <div key={line.id}>
                {topicHere ? (
                  <div className="transcript-topic">
                    <span aria-hidden />
                    {topicHere}
                  </div>
                ) : null}
                <article className={`transcript-entry${isLatest ? " transcript-entry--latest" : ""}`}>
                  <div className="transcript-entry__who">{audioSourceLabel(line.source)}</div>
                  <div className="transcript-entry__content">
                    <div className="transcript-entry__meta">
                      <time>{stampFromMs(line.atMs)}</time>
                    </div>
                    <p>{line.text}</p>
                  </div>
                </article>
              </div>
            );
          })}

          {visible.length === 0 && lines.length > 0 ? (
            <div className="transcript-empty">
              <IconSearch width={22} height={22} />
              <p>Không tìm thấy nội dung phù hợp.</p>
            </div>
          ) : null}

          {!paused && !complete && !query ? (
            <div className="transcript-listening">
              <span className="audio-wave" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
              Đang lắng nghe…
            </div>
          ) : null}

          {paused && !query ? (
            <button className="conversation-status" type="button" onClick={onTogglePause}>
              <IconPlayInline /> Hội thoại đang tạm dừng · Tiếp tục
            </button>
          ) : null}

          {complete && !query ? (
            <button
              className="conversation-status conversation-status--complete"
              type="button"
              onClick={onRestart}
            >
              <IconPlayInline /> Bản phát lại đã hết · Xem lại từ đầu
            </button>
          ) : null}
        </div>
      ) : (
        <div className="transcript-sources">
          <AISidekickPanel cards={cards} postCount={postCount} />
        </div>
      )}

      <div className="transcript-panel__footer">
        <IconPanel width={14} height={14} />
        <span>
          Bản ghi chỉ nằm trong trang này. Muốn giữ lại sau phiên, bật "Lưu bản ghi"
          trong tùy chọn nghiên cứu.
        </span>
      </div>
    </aside>
  );
}

function IconPauseInline() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={15} height={15}>
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

function IconPlayInline() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={15} height={15}>
      <path d="m9 6 9 6-9 6V6Z" />
    </svg>
  );
}
