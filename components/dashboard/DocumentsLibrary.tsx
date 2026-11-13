"use client";

// components/dashboard/DocumentsLibrary.tsx — thư viện tài liệu đối chiếu.
//
// Tài liệu lưu ở backend MeetMate (agents/sidekick/meetmate-server). PDF gửi nguyên file, backend
// đọc lớp chữ và chia đoạn theo trang; DOCX/PPTX cũng được đọc ở backend, văn bản dán gửi
// dưới dạng trang chữ. Khi tạo cuộc họp, người dùng chọn tài liệu để gửi cùng phiên sang extension.
import { useRef, useState } from "react";
import { DOC_LIMITS } from "../../lib/documents";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";
import { IconFolder, IconInfo, IconPlus, IconTrash, IconX } from "./icons";

const DAY = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" });
const isPdf = (f: File) => /\.pdf$/i.test(f.name) || f.type === "application/pdf";
const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** File đã chọn trong hộp thoại; backend đọc và chia đoạn sau khi tải lên. */
type Picked = { file: File };

export function DocumentsLibrary() {
  const { pushToast, documents, docsLoaded, docsError, refreshDocuments, addDocument, removeDocument } = useDashboard();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetAdd = () => {
    setTitle("");
    setBody("");
    setPicked(null);
    setFileError("");
    setDragging(false);
  };

  const close = () => {
    if (saving) return;
    setAddOpen(false);
    resetAdd();
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError("");
    setPicked(null);
    if (!isPdf(file) && !/\.(docx|pptx)$/i.test(file.name)) {
      setFileError("Hỗ trợ PDF có lớp chữ, Word DOCX và slide PPTX.");
      return;
    }
    if (file.size > DOC_LIMITS.maxPdfBytes) {
      setFileError(`${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB, vượt giới hạn ${DOC_LIMITS.maxPdfBytes / 1024 / 1024} MB.`);
      return;
    }
    if (!file.size) { setFileError('Tệp đang trống. Hãy chọn lại file có nội dung.'); return; }
    setPicked({ file });
    setTitle(t => t.trim() || file.name.replace(/\.(pdf|docx|pptx)$/i, ''));
  };

  const canSave = !saving && title.trim() !== "" && (picked !== null || body.trim() !== "");

  const save = async () => {
    if (!canSave) return;
    const name = title.trim();
    setSaving(true);
    setFileError("");
    try {
      let meta;
      if (picked) {
        const suffix = picked.file.name.match(/\.[^.]+$/)?.[0] ?? '.pdf';
        const fileName = name.toLowerCase().endsWith(suffix.toLowerCase()) ? name : name + suffix;
        meta = await addDocument(new File([picked.file], fileName, { type: picked.file.type }));
      } else {
        meta = await addDocument({ name, format: "TEXT", size: new Blob([body]).size, pages: [body.trim()] });
      }
      setAddOpen(false);
      resetAdd();
      pushToast(`Đã thêm “${meta.name}”: ${meta.pageCount} trang, ${meta.chunkCount} đoạn.`);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    setDeleting(id);
    try {
      await removeDocument(id);
      pushToast(`Đã xóa “${name}”.`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn--primary" onClick={() => setAddOpen(true)} disabled={!!docsError}>
          <IconPlus />
          Thêm tài liệu
        </button>
      </div>

      {docsError ? (
        <p className="kb-note" role="alert">
          <IconInfo />
          <span>
            <strong>Chưa đọc được thư viện.</strong> {docsError}{" "}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void refreshDocuments()}>
              Thử lại
            </button>
          </span>
        </p>
      ) : (
        <p className="kb-note">
          <IconInfo />
          <span>
            Tài liệu lưu ở backend MeetMate trên máy này. Khi tạo cuộc họp, chọn tài liệu cần đối chiếu;
            trong họp, nói “Trợ lý ơi, …” để MeetMate tra trong đó và trích dẫn tên file, số trang. Mỗi
            lần tra, nội dung tài liệu được gửi tới Blaze.
          </span>
        </p>
      )}

      {!docsLoaded ? null : documents.length === 0 ? (
        <div className="empty-state">
          <IconFolder />
          <h3>Chưa có tài liệu nào</h3>
          <p>
            Thêm hợp đồng, kế hoạch, bảng giá hoặc tài liệu sản phẩm bạn muốn MeetMate tra cứu khi
            được hỏi trong cuộc họp.
          </p>
        </div>
      ) : (
        <div className="object-grid">
          {documents.map((doc) => (
            <article className="doc-card" key={doc.id}>
              <div className="session-card__top">
                <h3 className="doc-card__name">{doc.name}</h3>
                <button
                  className="icon-btn"
                  aria-label={`Xóa ${doc.name}`}
                  disabled={deleting === doc.id}
                  onClick={() => void remove(doc.id, doc.name)}
                >
                  <IconTrash />
                </button>
              </div>
              <p className="doc-card__excerpt">{doc.excerpt}</p>
              <ul className="doc-meta" aria-label="Thông tin tài liệu">
                <li>{doc.format}</li>
                <li>{doc.pageCount} trang</li>
                <li>{doc.chunkCount} đoạn</li>
                {doc.size ? <li>{sizeLabel(doc.size)}</li> : null}
              </ul>
              <div className="doc-foot">
                <span>Thêm ngày {DAY.format(new Date(doc.addedAt))}</span>
                <span className="doc-indexed">Đã chia đoạn</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={close}
        title="Thêm tài liệu"
        description="Tải PDF có lớp chữ, Word DOCX hoặc slide PPTX. Tài liệu được đọc và lưu để chọn cho phiên Assistant hoặc Teacher."
        footer={
          <>
            <button className="btn btn--ghost" onClick={close} disabled={saving}>
              Hủy
            </button>
            <button className="btn btn--primary" disabled={!canSave} onClick={() => void save()}>
              {saving ? "Đang đọc tài liệu…" : "Lưu tài liệu"}
            </button>
          </>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf,.docx,.pptx"
          className="visually-hidden"
          aria-label="Chọn file PDF, Word hoặc slide"
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
          {picked ? (
            <div className="dropzone__done">
              <strong>{picked.file.name}</strong>
              <span>
                {sizeLabel(picked.file.size)}. Nội dung sẽ được đọc khi bạn bấm Lưu.
              </span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => setPicked(null)}>
                <IconX />
                Chọn file khác
              </button>
            </div>
          ) : (
            <>
              <p>Kéo PDF, Word DOCX hoặc slide PPTX vào đây</p>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => fileRef.current?.click()}>
                Chọn file
              </button>
              <small>Tối đa {DOC_LIMITS.maxPdfBytes / 1024 / 1024} MB mỗi tệp. PDF scan và hình trong slide chưa có OCR.</small>
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
          <p className="field__hint">Tên này hiện trong trích dẫn khi MeetMate trả lời trong cuộc họp.</p>
        </div>

        {!picked ? (
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
