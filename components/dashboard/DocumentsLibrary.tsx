"use client";

// components/dashboard/DocumentsLibrary.tsx — kho tài liệu đối chiếu.
//
// Trang này là "lớp mục tiêu", không phải một tính năng đã xong: chưa có tải lên, trích
// xuất, embedding hay truy xuất thật. Thông tin lập chỉ mục (định dạng, số trang, số đoạn)
// và ô "Kiểm tra truy xuất" chạy trên dữ liệu mẫu (mocks/kb.json qua lib/mockApi.ts) và
// được gắn nhãn như vậy. Khi có Supabase + pgvector, chỉ thay phần bên trong mockApi.
import { useRef, useState } from "react";
import { initialDocs, type DocItem } from "../../lib/dashboardData";
import { parseDocx, type ParsedDoc } from "../../lib/docxText";
import { addKbChunks, removeKbChunks, searchKnowledgeBase, type KbHit } from "../../lib/mockApi";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";
import { IconFolder, IconInfo, IconPlus, IconSearch, IconTrash, IconX } from "./icons";

const DAY = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" });

export function DocumentsLibrary() {
  const { pushToast } = useDashboard();
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [parsed, setParsed] = useState<ParsedDoc | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const [query, setQuery] = useState("API trả về bao nhiêu bản ghi mỗi trang?");
  const [hits, setHits] = useState<KbHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setHits(await searchKnowledgeBase(query));
    setSearching(false);
  };

  const resetAdd = () => {
    setTitle("");
    setBody("");
    setParsed(null);
    setFileName("");
    setFileError("");
    setDragging(false);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError("");
    setParsed(null);
    if (!/\.docx$/i.test(file.name)) {
      setFileError("Bản mẫu chỉ đọc file .docx. PDF và XLSX là phạm vi kiến trúc, chưa làm ở bản này.");
      return;
    }
    setReading(true);
    try {
      const doc = await parseDocx(file);
      setParsed(doc);
      setFileName(file.name);
      setTitle((t) => t.trim() || file.name.replace(/\.docx$/i, ""));
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Không đọc được file này.");
    } finally {
      setReading(false);
    }
  };

  const canSave = title.trim() !== "" && (parsed !== null || body.trim() !== "");

  const save = () => {
    if (!canSave) return;
    const id = `doc-new-${++counter.current}`;
    let item: DocItem;
    if (parsed) {
      addKbChunks(id, title.trim(), parsed.chunks);
      item = {
        id,
        title: title.trim(),
        excerpt: parsed.paragraphs.map((p) => p.text).join(" ").slice(0, 220),
        addedAt: new Date().toISOString(),
        format: "DOCX",
        chunks: parsed.chunks.length,
        scope: "Cá nhân",
        owner: "Bạn",
      };
    } else {
      item = { id, title: title.trim(), excerpt: body.trim(), addedAt: new Date().toISOString() };
    }
    setDocs((prev) => [item, ...prev]);
    setAddOpen(false);
    resetAdd();
    pushToast(parsed ? `Đã đọc ${parsed.chunks.length} đoạn từ ${fileName} và thêm vào thư viện.` : "Đã thêm tài liệu vào thư viện.");
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
          <IconPlus />
          Thêm tài liệu
        </button>
      </div>

      <p className="kb-note">
        <IconInfo />
        <span>
          <strong>Dữ liệu mẫu.</strong> Giao diện mục tiêu của kho tài liệu: chưa có tải lên, trích xuất hay
          truy xuất thật. Tài liệu chỉ nằm trong phiên làm việc của nhóm và chỉ được dùng để đối chiếu
          nhận định trong cuộc họp.
        </span>
      </p>

      <section className="kb-search" aria-label="Kiểm tra truy xuất">
        <div className="kb-search__bar">
          <label className="kb-search__label" htmlFor="kb-q">
            Kiểm tra truy xuất
          </label>
          <div className="kb-search__row">
            <input
              id="kb-q"
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runSearch()}
              placeholder="Hỏi một điều có trong tài liệu của nhóm"
            />
            <button className="btn btn--primary" onClick={() => void runSearch()} disabled={searching}>
              <IconSearch />
              {searching ? "Đang truy xuất…" : "Truy xuất"}
            </button>
          </div>
        </div>
        {hits !== null ? (
          hits.length === 0 ? (
            <p className="kb-search__empty">
              Không có đoạn nào khớp. Đây là trạng thái “chưa đủ căn cứ”: hệ thống không suy đoán.
            </p>
          ) : (
            <ol className="kb-hits">
              {hits.map((h) => (
                <li className="kb-hit" key={`${h.doc}-${h.locator}`}>
                  <div className="kb-hit__head">
                    <span className="kb-hit__doc">{h.doc}</span>
                    <span className="kb-hit__loc">{h.locator}</span>
                    <span className="kb-hit__score">độ khớp {Math.round(h.score * 100)}%</span>
                  </div>
                  <p className="kb-hit__text">{h.excerpt}</p>
                </li>
              ))}
            </ol>
          )
        ) : null}
      </section>

      {docs.length === 0 ? (
        <div className="empty-state">
          <IconFolder />
          <h3>Chưa có tài liệu nào</h3>
          <p>
            Thêm bảng giá, tài liệu sản phẩm hoặc bộ câu hỏi bạn muốn đối chiếu khi
            họp. MeetMate chưa truy xuất những file này — chúng là lớp mục tiêu.
          </p>
        </div>
      ) : (
        <div className="object-grid">
          {docs.map((doc) => (
            <article className="doc-card" key={doc.id}>
              <div className="session-card__top">
                <h3 className="doc-card__name">{doc.title}</h3>
                <button
                  className="icon-btn"
                  aria-label={`Xóa ${doc.title}`}
                  onClick={() => {
                    removeKbChunks(doc.id);
                    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
                    pushToast("Đã xóa tài liệu.");
                  }}
                >
                  <IconTrash />
                </button>
              </div>
              <p className="doc-card__excerpt">{doc.excerpt}</p>
              {doc.format ? (
                <ul className="doc-meta" aria-label="Thông tin lập chỉ mục">
                  <li>{doc.format}</li>
                  {doc.pages ? <li>{doc.pages} trang</li> : null}
                  <li>{doc.chunks} đoạn</li>
                  <li>{doc.scope}</li>
                </ul>
              ) : null}
              {doc.format ? (
                <div className="doc-foot">
                  <span>
                    {doc.owner} · {DAY.format(new Date(doc.addedAt))}
                  </span>
                  <span className="doc-indexed">Đã lập chỉ mục</span>
                </div>
              ) : (
                <div className="doc-card__actions">
                  <span className="pill pill--credit">Thêm ngày {DAY.format(new Date(doc.addedAt))}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          resetAdd();
        }}
        title="Thêm tài liệu"
        description="Tải một file .docx lên, MeetMate tự đọc và chia thành các đoạn để đối chiếu trong cuộc họp. File được đọc ngay trên máy bạn, không gửi đi đâu."
        footer={
          <>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setAddOpen(false);
                resetAdd();
              }}
            >
              Hủy
            </button>
            <button className="btn btn--primary" disabled={!canSave} onClick={save}>
              Lưu tài liệu
            </button>
          </>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="visually-hidden"
          aria-label="Chọn file .docx"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div
          className={"dropzone" + (dragging ? " dropzone--on" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          {parsed ? (
            <div className="dropzone__done">
              <strong>{fileName}</strong>
              <span>
                Đã đọc {parsed.paragraphs.length} đoạn văn, khoảng {parsed.wordCount.toLocaleString("vi-VN")} từ, chia
                thành {parsed.chunks.length} đoạn truy xuất.
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setParsed(null);
                  setFileName("");
                }}
              >
                <IconX />
                Chọn file khác
              </button>
            </div>
          ) : (
            <>
              <p>{reading ? "Đang đọc file…" : "Kéo file .docx vào đây"}</p>
              <button type="button" className="btn btn--outline btn--sm" disabled={reading} onClick={() => fileRef.current?.click()}>
                Chọn file .docx
              </button>
              <small>Tối đa 10 MB. PDF và XLSX chưa đọc được ở bản mẫu.</small>
            </>
          )}
        </div>
        {fileError ? (
          <p className="field__error" role="alert">
            {fileError}
          </p>
        ) : null}

        <div className="field" style={{ marginTop: "var(--sp-md)" }}>
          <label className="field__label" htmlFor="doc-title">
            Tên tài liệu
          </label>
          <input
            id="doc-title"
            className="input"
            placeholder="Lấy từ tên file, có thể sửa"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {!parsed ? (
          <details className="dropzone__alt">
            <summary>Hoặc dán nội dung thay cho file</summary>
            <textarea
              id="doc-body"
              className="textarea"
              placeholder="Dán nội dung vào đây…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </details>
        ) : null}
      </Dialog>
    </>
  );
}
