"use client";

// components/dashboard/AddDocumentsDialog.tsx — thêm tài liệu vào cuộc họp đang diễn ra.
//
// Nội dung các đoạn của tài liệu đã chọn được lấy từ backend và gửi cho extension (`session.addDocuments`).
// Extension gộp vào kho của phiên đang nghe và báo lại (`documents.added`); từ câu hỏi kế tiếp
// "Trợ lý ơi, …" sẽ tra được tài liệu mới. Chỉ báo "đã thêm" khi extension xác nhận.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDocument } from "../../lib/backendApi";
import { parseDocx } from "../../lib/docxText";
import { DOC_LIMITS, toSessionDocument } from "../../lib/documents";
import { onExtensionEvent, sendToExtension } from "../../lib/extensionBridge";
import { cn } from "../../lib/utils";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";

const ACK_TIMEOUT_MS = 8000;

interface Props {
  /** cuộc họp đang diễn ra; null = đóng */
  meeting: { id: string; title: string } | null;
  onClose: () => void;
}

export function AddDocumentsDialog({ meeting, onClose }: Props) {
  const { documents, docsLoaded, docsError, pushToast, addDocument } = useDashboard();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const offRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setPicked([]);
    setError("");
    setSending(false);
  }, [meeting?.id]);
  useEffect(() => () => offRef.current?.(), []);

  // tải file thẳng từ hộp thoại: vào thư viện (backend) rồi được chọn sẵn
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      try {
        let meta;
        if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
          if (file.size > DOC_LIMITS.maxPdfBytes) throw new Error(`${file.name}: file lớn hơn 40 MB.`);
          meta = await addDocument(file);
        } else if (/\.docx$/i.test(file.name)) {
          const parsed = await parseDocx(file);
          meta = await addDocument({
            name: file.name.replace(/\.docx$/i, ""),
            format: "DOCX",
            size: file.size,
            pages: [parsed.paragraphs.map((p) => p.text).join("\n")],
          });
        } else {
          throw new Error(`${file.name}: chỉ đọc được PDF (có lớp chữ) và .docx.`);
        }
        const id = meta.id;
        setPicked((prev) => (prev.includes(id) ? prev : [...prev, id]));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setUploading(false);
  };

  const close = () => {
    if (sending || uploading) return;
    onClose();
  };

  const send = async () => {
    if (!meeting || picked.length === 0 || sending) return;
    setSending(true);
    setError("");
    try {
      const docs = (await Promise.all(picked.map((id) => getDocument(id)))).map(toSessionDocument);
      const chars = docs.reduce((n, d) => n + d.chunks.reduce((m, c) => m + c.text.length, 0), 0);
      if (chars > DOC_LIMITS.maxSessionChars) {
        setError("Tài liệu đã chọn quá lớn cho một phiên. Bỏ bớt tài liệu.");
        setSending(false);
        return;
      }
      const ack = await new Promise<{ ok: boolean; added: number; total: number; error: string }>((resolve) => {
        const timer = window.setTimeout(() => {
          offRef.current?.();
          resolve({ ok: false, added: 0, total: 0, error: "Extension không trả lời. Kiểm tra extension còn chạy và tải lại trang." });
        }, ACK_TIMEOUT_MS);
        offRef.current = onExtensionEvent((ev) => {
          if (ev.type !== "documents.added" || ev.id !== meeting.id) return;
          window.clearTimeout(timer);
          offRef.current?.();
          resolve({ ok: ev.ok, added: ev.added ?? 0, total: ev.total ?? 0, error: ev.error ?? "Extension không thêm được tài liệu." });
        });
        sendToExtension({ type: "session.addDocuments", id: meeting.id, documents: docs });
      });
      if (!ack.ok) {
        setError(ack.error);
        setSending(false);
        return;
      }
      pushToast(
        ack.added > 0
          ? `Đã thêm ${ack.added} tài liệu vào “${meeting.title}” (tổng ${ack.total}). Dùng được từ câu hỏi tiếp theo.`
          : "Các tài liệu này đã có sẵn trong phiên.",
      );
      setSending(false);
      onClose();
    } catch (e) {
      setError(`Không lấy được tài liệu từ backend: ${e instanceof Error ? e.message : String(e)}`);
      setSending(false);
    }
  };

  return (
    <Dialog
      open={meeting !== null}
      onClose={close}
      title="Thêm tài liệu vào cuộc họp"
      description={
        meeting
          ? `“${meeting.title}” đang diễn ra. Tài liệu thêm vào được MeetMate tra từ câu hỏi “Trợ lý ơi, …” kế tiếp; phần đã nói trước đó không bị đối chiếu lại.`
          : undefined
      }
      footer={
        <>
          <button className="btn btn--ghost" onClick={close} disabled={sending}>
            Hủy
          </button>
          <button className="btn btn--primary" disabled={picked.length === 0 || sending || uploading} onClick={() => void send()}>
            {sending ? "Đang gửi…" : picked.length ? `Thêm ${picked.length} tài liệu` : "Thêm tài liệu"}
          </button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="visually-hidden"
        aria-label="Chọn file PDF hoặc .docx"
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      {docsError ? (
        <p className="field__error" role="alert">
          {docsError}
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-sm)", marginBottom: "var(--sp-sm)" }}>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            disabled={uploading || sending}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Đang tải lên và đọc…" : "Tải file mới lên"}
          </button>
          <small className="wiz__helper" style={{ margin: 0 }}>
            PDF (có lớp chữ) hoặc .docx; file tải lên vào thư viện và được chọn sẵn.
          </small>
        </div>
      )}
      {docsError ? null : !docsLoaded ? null : documents.length === 0 ? (
        <p className="wiz__helper">
          Thư viện chưa có tài liệu. Bấm “Tải file mới lên”, hoặc dán nội dung ở{" "}
          <Link href="/dashboard/documents" onClick={onClose}>
            trang Tài liệu
          </Link>
          ; cuộc họp vẫn tiếp tục.
        </p>
      ) : (
        <div className="doclist" role="group" aria-label="Chọn tài liệu cần thêm">
          {documents.map((d) => {
            const on = picked.includes(d.id);
            return (
              <label key={d.id} className={cn("choice", on && "choice--on")}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={sending || uploading}
                  onChange={() => setPicked((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                />
                <span>
                  <span className="choice__title">{d.name}</span>
                  <span className="choice__note">
                    {d.format} · {d.pageCount} trang · {d.chunkCount} đoạn
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
