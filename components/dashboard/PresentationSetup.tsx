'use client';
import { useEffect, useRef, useState } from 'react';
import { generatePresentationChecklist } from '../../lib/backendApi';
import { parsePresentation, type PresentationSnapshot } from '../../lib/presentation';

export function PresentationSetup({
  documentIds,
  onChange,
}: {
  documentIds: string[];
  onChange: (p: PresentationSnapshot | null) => void;
}) {
  const [snapshot, setSnapshot] = useState<PresentationSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const callback = useRef(onChange);
  callback.current = onChange;
  const key = 'meetmate.presentation.draft:' + documentIds.slice().sort().join(',');
  const update = (p: PresentationSnapshot | null) => {
    setSnapshot(p);
    callback.current(p);
    try {
      if (p) localStorage.setItem(key, JSON.stringify(p));
      else localStorage.removeItem(key);
    } catch {
      setError('Không lưu được bản nháp trong trình duyệt. Giữ cửa sổ này mở.');
    }
  };
  useEffect(() => {
    alive.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const p = parsePresentation(JSON.parse(saved));
        setSnapshot(p);
        callback.current(p);
      }
    } catch {
      setError('Bản nháp cũ không đọc được. Hãy tạo lại.');
    }
    return () => {
      alive.current = false;
    };
  }, [key]);
  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const p = await generatePresentationChecklist(documentIds);
      if (alive.current) update(p);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Không tạo được checklist.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <section className="presentation-setup" aria-label="Chuẩn bị thuyết trình">
      <h3>Checklist thuyết trình</h3>
      <p>
        AI đề xuất ý từ tài liệu. Kiểm tra, chỉnh sửa và xác nhận trước khi bắt đầu. Ý bạn sửa sẽ
        cần tự kiểm tra lại nguồn.
      </p>
      <button
        className="btn btn--secondary"
        disabled={busy || !documentIds.length}
        onClick={() => void generate()}
      >
        {busy
          ? 'Đang đọc tài liệu…'
          : snapshot
            ? 'Tạo lại từ tài liệu'
            : 'Tạo checklist từ tài liệu'}
      </button>
      {!documentIds.length && <p role="alert">Quay lại chọn ít nhất một tài liệu.</p>}
      {error && <p role="alert">{error}</p>}
      {snapshot && (
        <>
          <ol className="presentation-items">
            {snapshot.items.map((item, index) => (
              <li key={item.id}>
                <label>
                  Ý {index + 1}
                  <textarea
                    aria-label={`Ý ${index + 1}`}
                    className="input"
                    rows={2}
                    maxLength={1000}
                    value={item.text}
                    onChange={(e) =>
                      update({
                        ...snapshot,
                        confirmed: false,
                        items: snapshot.items.map((i) =>
                          i.id === item.id ? { ...i, text: e.target.value, citation: null } : i,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(e) =>
                      update({
                        ...snapshot,
                        confirmed: false,
                        items: snapshot.items.map((i) =>
                          i.id === item.id ? { ...i, required: e.target.checked } : i,
                        ),
                      })
                    }
                  />{' '}
                  Ý bắt buộc
                </label>
                {item.citation ? (
                  <blockquote>
                    {item.citation.text}
                    <footer>
                      {item.citation.docName}, tr. {item.citation.page}
                    </footer>
                  </blockquote>
                ) : (
                  <p>Ý tự chỉnh sửa, chưa có nguồn được xác minh.</p>
                )}
                <div className="presentation-controls">
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={index === 0}
                    onClick={() => {
                      const items = [...snapshot.items];
                      [items[index - 1], items[index]] = [items[index], items[index - 1]];
                      update({ ...snapshot, confirmed: false, items });
                    }}
                  >
                    Lên
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={index === snapshot.items.length - 1}
                    onClick={() => {
                      const items = [...snapshot.items];
                      [items[index + 1], items[index]] = [items[index], items[index + 1]];
                      update({ ...snapshot, confirmed: false, items });
                    }}
                  >
                    Xuống
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      update({
                        ...snapshot,
                        confirmed: false,
                        items: snapshot.items.filter((i) => i.id !== item.id),
                      })
                    }
                  >
                    Xóa ý {index + 1}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="btn btn--secondary"
            disabled={snapshot.items.length >= 40}
            onClick={() =>
              update({
                ...snapshot,
                confirmed: false,
                items: [
                  ...snapshot.items,
                  {
                    id: crypto.randomUUID(),
                    text: 'Ý mới',
                    required: true,
                    citation: null,
                    coverage: 'pending',
                    correctness: 'unchecked',
                    manual: false,
                  },
                ],
              })
            }
          >
            Thêm ý
          </button>
          <p>
            <label>
              <input
                type="checkbox"
                checked={snapshot.confirmed}
                disabled={!snapshot.items.length || snapshot.items.some((i) => !i.text.trim())}
                onChange={(e) =>
                  update({
                    ...snapshot,
                    revision: crypto.randomUUID(),
                    confirmed: e.target.checked,
                  })
                }
              />{' '}
              Tôi đã kiểm tra và xác nhận checklist
            </label>
          </p>
        </>
      )}
      <p>
        Chỉ nghe micro của bạn; không gửi chat Meet. Side panel vẫn có thể bị thấy khi chia sẻ toàn
        màn hình hoặc cửa sổ Chrome. Hãy chia sẻ riêng nội dung trình bày.
      </p>
    </section>
  );
}
