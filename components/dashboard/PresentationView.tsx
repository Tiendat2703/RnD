'use client';
import { useState } from 'react';
import {
  COVERAGE_LABEL,
  CORRECTNESS_LABEL,
  presentationStats,
  presentationMarkdown,
  type PresentationAction,
  type PresentationSnapshot,
} from '../../lib/presentation';
import { sendToExtension } from '../../lib/extensionBridge';
import { downloadPdf } from '../../lib/downloadPdf';

export function PresentationView({
  id,
  title,
  snapshot,
  active,
  onExit,
  onEnd,
}: {
  id: string;
  title: string;
  snapshot: PresentationSnapshot;
  active: boolean;
  onExit?: () => void;
  onEnd?: () => void;
}) {
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const stats = presentationStats(snapshot);
  const action = (action: PresentationAction) =>
    sendToExtension({ type: 'presentation.action', id, revision: snapshot.revision, action });
  return (
    <section className="presentation-view" aria-label="Theo dõi thuyết trình">
      <header>
        <p className="eyebrow">THUYẾT TRÌNH · CHỈ BẠN THẤY</p>
        <h2>{title}</h2>
        <p>
          <strong>
            {stats.covered}/{stats.total}
          </strong>{' '}
          ý bắt buộc đã nói · {stats.partial} một phần · {stats.skipped} bỏ qua ·{' '}
          {stats.contradictions.length} ý checklist lệch · {snapshot.deviations?.filter(d=>!d.resolvedBy).length ?? 0} cảnh báo nguồn
        </p>
        <p>
          Mức bao phủ nội dung không phải điểm chính xác. Chỉ theo dõi micro của bạn; không gửi chat
          Meet.
        </p>
      </header>
      {active && (
        <div className="presentation-controls">
          <button className="btn btn--secondary" onClick={() => action({ kind: 'missing' })}>
            Còn thiếu gì?
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => action({ kind: 'pause', paused: !snapshot.paused })}
          >
            {snapshot.paused ? 'Tiếp tục theo dõi' : 'Tạm dừng theo dõi'}
          </button>
          <label>
            <input
              type="checkbox"
              checked={snapshot.autoRemind}
              onChange={(e) => action({ kind: 'remind', enabled: e.target.checked })}
            />{' '}
            Nhắc khi sắp kết thúc
          </label>
          {onExit && (
            <button className="btn btn--ghost" onClick={onExit}>
              Thu gọn về danh sách
            </button>
          )}
          {onEnd && (
            <button className="btn btn--danger-solid" onClick={onEnd}>
              Kết thúc thuyết trình
            </button>
          )}
        </div>
      )}
      {snapshot.paused && active && (
        <p role="status">Đang tạm dừng theo dõi; checklist hiện có được giữ nguyên.</p>
      )}
      {snapshot.error && <p role="alert">{snapshot.error}</p>}
      {snapshot.hint && (
        <aside className="presentation-hint" role="status">
          {snapshot.hint}
        </aside>
      )}
      {!!snapshot.deviations?.length && (
        <section aria-label="Sai lệch cần xem lại">
          <h3>Sai lệch so với tài liệu</h3>
          {snapshot.deviations.map((d) => (
            <article className="presentation-hint" key={d.id}>
              <strong>
                {d.resolvedBy ? 'Đã tự sửa' : 'Cần xem lại'}: {d.note}
              </strong>
              <p>“{d.evidence.text}”</p>
              <blockquote>
                {d.citation.text}
                <footer>
                  {d.citation.docName}, tr. {d.citation.page}
                </footer>
              </blockquote>
              {d.resolvedBy && <p>Lời tự sửa: {d.resolvedBy.text}</p>}
            </article>
          ))}
        </section>
      )}
      <ol className="presentation-items">
        {snapshot.items.map((item, index) => (
          <li key={item.id} data-correctness={item.correctness}>
            <h3>
              {index + 1}. {item.text}
            </h3>
            <p>
              {item.required ? 'Bắt buộc' : 'Tùy chọn'} · {COVERAGE_LABEL[item.coverage]} ·{' '}
              {CORRECTNESS_LABEL[item.correctness]}
              {item.manual ? ' · sửa tay' : ''}
            </p>
            {active && (
              <div className="presentation-controls">
                <select
                  className="select"
                  aria-label={`Trạng thái ý ${index + 1}`}
                  value={item.coverage}
                  onChange={(e) =>
                    action({
                      kind: 'item',
                      itemId: item.id,
                      coverage: e.target.value as keyof typeof COVERAGE_LABEL,
                    })
                  }
                >
                  {Object.entries(COVERAGE_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                {item.manual && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => action({ kind: 'item', itemId: item.id, coverage: 'auto' })}
                  >
                    Bật lại tự theo dõi
                  </button>
                )}
              </div>
            )}
            {item.evidence && (
              <p>
                Lời bạn nói [{Math.floor(item.evidence.atMs / 1000)}s]: “{item.evidence.text}”
              </p>
            )}
            {item.note && <p>{item.note}</p>}
            {item.citation ? (
              <details>
                <summary>
                  {item.citation.docName} · tr. {item.citation.page}
                </summary>
                <blockquote>{item.citation.text}</blockquote>
              </details>
            ) : (
              <p>Ý tự thêm — chưa có nguồn kiểm chứng.</p>
            )}
          </li>
        ))}
      </ol>
      <button
        className="btn btn--secondary"
        disabled={exporting}
        onClick={async () => {
          setExporting(true);
          setError('');
          try {
            await downloadPdf(
              title,
              presentationMarkdown(title, snapshot),
              'bao-cao-thuyet-trinh.pdf',
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được PDF.');
          } finally {
            setExporting(false);
          }
        }}
      >
        {exporting ? 'Đang tạo PDF…' : 'Tải báo cáo thuyết trình PDF'}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>Không chia sẻ toàn màn hình hoặc cửa sổ chứa checklist nếu muốn giữ gợi ý riêng tư.</p>
    </section>
  );
}
