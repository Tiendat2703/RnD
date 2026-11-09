"use client";

// components/dashboard/SessionMemoryView.tsx — Session Context Memory của một cuộc họp.
//
// Thứ MeetMate giữ về phiên ngoài bản ghi (mục III.1.5 của bản mô tả): quyết định, phụ thuộc,
// giả định được đánh dấu riêng — không coi là sự thật đã kiểm chứng — và các nhận định chưa
// được ủng hộ trọn vẹn. Bộ nhớ xuyên nhiều cuộc họp (persistent memory) ngoài phạm vi MVP.
import {
  EVIDENCE_ORDER,
  memoryOf,
  statusCounts,
  stampOf,
  type KnowledgeCard,
} from "../../lib/evidence";
import { EvidenceChip } from "./EvidenceCard";

function Block({ title, note, rows }: { title: string; note: string; rows: KnowledgeCard[] }) {
  return (
    <section className="sm-block">
      <header className="sm-block__head">
        <h4 className="sm-block__title">{title}</h4>
        <span className="sm-block__count">{rows.length}</span>
      </header>
      <p className="sm-block__note">{note}</p>
      {rows.length === 0 ? (
        <p className="sm-empty">Chưa ghi nhận mục nào.</p>
      ) : (
        <ul className="sm-list">
          {rows.map((c) => (
            <li key={c.id}>
              <span className="sm-list__text">{c.summary}</span>
              <time className="sm-list__time">{stampOf(c.atMs)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SessionMemoryView({ cards }: { cards: KnowledgeCard[] }) {
  const mem = memoryOf(cards);
  const counts = statusCounts(cards);

  return (
    <div className="sm">
      <div className="sm-stats" role="list" aria-label="Số nhận định theo trạng thái bằng chứng">
        {EVIDENCE_ORDER.slice()
          .reverse()
          .map((s) => (
            <div className="sm-stat" role="listitem" key={s}>
              <span className="sm-stat__n">{counts[s]}</span>
              <EvidenceChip status={s} />
            </div>
          ))}
      </div>

      <div className="sm-grid">
        <Block
          title="Quyết định"
          note="Ghi vào trạng thái phiên khi có người chốt."
          rows={mem.decisions}
        />
        <Block
          title="Phụ thuộc đang cản trở"
          note="Việc chưa làm được vì chờ một thứ khác."
          rows={mem.dependencies}
        />
        <Block
          title="Giả định cần kiểm chứng tiếp"
          note="Được đánh dấu riêng, không coi là sự thật đã kiểm chứng."
          rows={mem.assumptions}
        />
        <section className="sm-block">
          <header className="sm-block__head">
            <h4 className="sm-block__title">Nhận định còn mở</h4>
            <span className="sm-block__count">{mem.open.length}</span>
          </header>
          <p className="sm-block__note">Chưa được ủng hộ trọn vẹn: cần xem lại sau họp.</p>
          {mem.open.length === 0 ? (
            <p className="sm-empty">Không có nhận định nào còn mở.</p>
          ) : (
            <ul className="sm-list sm-list--open">
              {mem.open.map((c) => (
                <li key={c.id}>
                  <EvidenceChip status={c.status!} />
                  <span className="sm-list__text">“{c.quote}”</span>
                  <time className="sm-list__time">{stampOf(c.atMs)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
