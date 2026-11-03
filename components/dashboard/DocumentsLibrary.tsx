"use client";

// components/dashboard/DocumentsLibrary.tsx — kho tài liệu đối chiếu.
//
// Trang này là "lớp mục tiêu", không phải một tính năng đã xong: MeetMate chưa
// truy xuất được những file này — extension chỉ nghe âm thanh. Trang nói rõ điều
// đó ở mô tả, thay vì để một nút "Thêm tài liệu" gợi rằng nội dung sẽ được đưa
// vào kết quả nghiên cứu.
import { useRef, useState } from "react";
import { initialDocs, type DocItem } from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Dialog } from "./Dialog";
import { IconFolder, IconPlus, IconTrash } from "./icons";

const DAY = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" });

export function DocumentsLibrary() {
  const { pushToast } = useDashboard();
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const counter = useRef(0);

  const canSave = title.trim() !== "" && body.trim() !== "";

  const save = () => {
    if (!canSave) return;
    setDocs((prev) => [
      {
        id: `doc-new-${++counter.current}`,
        title: title.trim(),
        excerpt: body.trim(),
        addedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setAddOpen(false);
    setTitle("");
    setBody("");
    pushToast("Đã thêm tài liệu vào thư viện.");
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
          <IconPlus />
          Thêm tài liệu
        </button>
      </div>

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
                    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
                    pushToast("Đã xóa tài liệu.");
                  }}
                >
                  <IconTrash />
                </button>
              </div>
              <p className="doc-card__excerpt">{doc.excerpt}</p>
              <div className="doc-card__actions">
                <span className="pill pill--credit">
                  Thêm ngày {DAY.format(new Date(doc.addedAt))}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm tài liệu"
        description="Dán nội dung bạn muốn đối chiếu trong cuộc họp. Bản demo giữ ngay trong trang này, không gửi đi đâu."
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setAddOpen(false)}>
              Hủy
            </button>
            <button className="btn btn--primary" disabled={!canSave} onClick={save}>
              Lưu tài liệu
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field__label" htmlFor="doc-title">
            Tên tài liệu
          </label>
          <input
            id="doc-title"
            className="input"
            placeholder="vd. Bảng giá dự kiến các gói MeetMateAI"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginTop: "var(--sp-md)" }}>
          <label className="field__label" htmlFor="doc-body">
            Nội dung
          </label>
          <textarea
            id="doc-body"
            className="textarea"
            placeholder="Dán nội dung vào đây…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
