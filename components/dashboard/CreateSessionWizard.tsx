"use client";

// components/dashboard/CreateSessionWizard.tsx — hộp thoại "Cuộc họp mới".
//
// Hai bước, rail trái không đổi giữa hai bước. Wizard cũ của đối thủ hỏi job
// post, company, CV và "Answer style" vì sản phẩm của họ là người trả lời thay
// bạn. Ở đây không có gì để điền về phía người được họp: MeetMate chỉ cần biết
// cuộc họp này là gì và bạn muốn nó tìm nguồn ra sao.
//
// Bước một do đó gần như trống — và đó là điểm đúng, không phải điểm thiếu.
import { useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import {
  LANGUAGES,
  MEETING_KIND_LABEL,
  MODELS,
  initialDocs,
  type MeetingKind,
} from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Segmented, Switch, useModalBehaviour } from "./controls";
import {
  IconChevronDown,
  IconFolder,
  IconInfo,
  IconSend,
  IconSettings,
  IconTranscript,
  IconX,
} from "./icons";

const KINDS = Object.keys(MEETING_KIND_LABEL) as MeetingKind[];

export function CreateSessionWizard() {
  const {
    wizard,
    closeWizard,
    meetings,
    requestInstall,
    updateMeeting,
    prefs,
    setPrefs,
    setPrefsOpen,
    pushToast,
  } = useDashboard();

  const editing = wizard.editId ? meetings.find((m) => m.id === wizard.editId) ?? null : null;

  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<MeetingKind>("san-pham");
  const [title, setTitle] = useState("");
  const [docId, setDocId] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehaviour(wizard.open, closeWizard, panelRef);

  // mở mới = reset; mở để sửa = điền lại từ bản ghi
  const lastOpen = useRef(false);
  if (wizard.open && !lastOpen.current) {
    lastOpen.current = true;
    setStep(1);
    setKind(wizard.kind ?? editing?.kind ?? "san-pham");
    setTitle(editing?.title ?? "");
    setDocId("");
  }
  if (!wizard.open && lastOpen.current) lastOpen.current = false;

  const nextLabel = useMemo(() => {
    if (editing) return "Lưu thay đổi";
    return step === 1 ? "Tiếp" : "Bắt đầu MeetMate";
  }, [editing, step]);

  if (!wizard.open) return null;

  const finish = () => {
    if (editing) {
      updateMeeting(editing.id, { title: title.trim() || editing.title, kind });
      pushToast("Đã cập nhật cuộc họp.");
      closeWizard();
      return;
    }
    requestInstall({
      title: title.trim() || `${MEETING_KIND_LABEL[kind]} · ${meetings.length + 1}`,
      kind,
    });
  };

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeWizard();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Sửa cuộc họp" : "Cuộc họp mới"}
        tabIndex={-1}
        className="wiz"
      >
        <aside className="wiz__rail">
          <h2 className="wiz__title">{editing ? "Sửa cuộc họp" : "Cuộc họp mới"}</h2>
          <p className="wiz__sub">Đặt tên cho phiên và chọn cách MeetMate tìm nguồn.</p>

          {/* sửa một cuộc họp thì không có bước "tùy chọn phiên": bấm "Lưu thay đổi"
              là xong, nên bộ đếm bước cũng chỉ được hứa một bước */}
          <ol className="stepper" aria-label="Tiến trình">
            <li className={cn("stepper__step", step === 1 && "stepper__step--active")}>
              <span className="stepper__dot">1</span> Thông tin
            </li>
            {editing ? null : (
              <>
                <li className={cn("stepper__link", step === 2 && "stepper__link--done")} aria-hidden />
                <li className={cn("stepper__step", step === 2 && "stepper__step--active")}>
                  <span className="stepper__dot">2</span> Tùy chọn
                </li>
              </>
            )}
          </ol>

          <div className="wiz__rail-spacer" />

          {/* không có nút "View tutorial" giả: thứ người dùng cần biết ở đây là
              máy ghi không phải là tab này */}
          <p className="wiz__note">
            <IconInfo />
            <span>
              MeetMate nghe cuộc họp từ extension Chrome. Tab này chỉ hiển thị những gì extension
              ghi lại.
            </span>
          </p>
        </aside>

        <div className="wiz__main">
          <div className="wiz__top">
            <button className="icon-btn wiz__close" aria-label="Đóng" onClick={closeWizard}>
              <IconX />
            </button>
          </div>

          {step === 1 ? (
            <div className="wiz__body" key="step-1">
              <p className="wiz__eyebrow">Loại cuộc họp</p>
              <Segmented<MeetingKind>
                ariaLabel="Loại cuộc họp"
                compact
                options={KINDS.map((k) => ({ id: k, label: MEETING_KIND_LABEL[k] }))}
                value={kind}
                onChange={setKind}
              />

              <div className="field">
                <label className="field__label" htmlFor="wiz-title">
                  Tên cuộc họp <span className="field__optional">(Không bắt buộc)</span>
                </label>
                <input
                  id="wiz-title"
                  className="input"
                  placeholder="vd. Chốt bảng giá gói SME"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="field__hint">
                  Không nhập thì MeetMate tự đặt theo loại và số thứ tự của phiên.
                </p>
              </div>

              <p className="wiz__eyebrow">Tài liệu đối chiếu</p>
              <label className="field">
                <span className="field__label">Knowledge base</span>
                <span className="select-wrap">
                  <select
                    className="select"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    aria-label="Chọn tài liệu đối chiếu"
                  >
                    <option value="">
                      {initialDocs.length ? "Không dùng tài liệu nào" : "Chưa có tài liệu nào"}
                    </option>
                    {initialDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown />
                </span>
              </label>
              <p className="wiz__helper">
                Lớp truy xuất của MeetMate là: ngữ cảnh cuộc họp → tài liệu của bạn → tìm nguồn trên
                web. Chọn một tài liệu ở đây mới chỉ đánh dấu mục tiêu — pipeline chưa đọc file này.
              </p>
            </div>
          ) : (
            <div className="wiz__body" key="step-2">
              <p className="wiz__eyebrow">Phiên âm và mô hình</p>

              <div className="wrow">
                <span className="wrow__icon">
                  <IconTranscript />
                </span>
                <span className="wrow__meta">
                  <span className="wrow__title">Ngôn ngữ phiên âm</span>
                  <span className="wrow__note">
                    Tiếng Việt, kể cả khi câu trộn tiếng Anh — đó là lý do Blaze STT được chọn.
                  </span>
                </span>
                <span className="dchip">{LANGUAGES[0]}</span>
              </div>

              <div className="wrow wrow--stack">
                <span className="wrow__icon">
                  <IconInfo />
                </span>
                <span className="wrow__meta">
                  <span className="wrow__title">Mô hình đang chạy</span>
                  <span className="wrow__note">Cố định theo kiến trúc, không chọn ở đây.</span>
                </span>
                <ul className="wiz__models">
                  {MODELS.map((m) => (
                    <li key={m.name}>
                      <strong>{m.name}</strong>
                      <span>{m.note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="wiz__eyebrow">Nghiên cứu</p>

              <div className="wrow">
                <span className="wrow__icon">
                  <IconSettings />
                </span>
                <span className="wrow__meta">
                  <span className="wrow__title">Tùy chọn nghiên cứu</span>
                  <span className="wrow__note">
                    {prefs.sources} nguồn mỗi chủ đề ·{" "}
                    {prefs.queryLanguage === "auto"
                      ? "truy vấn theo ngôn ngữ câu hỏi"
                      : prefs.queryLanguage === "vi"
                        ? "truy vấn tiếng Việt"
                        : "truy vấn tiếng Anh"}
                  </span>
                </span>
                <button className="btn btn--secondary btn--sm" onClick={() => setPrefsOpen(true, "wizard")}>
                  Chỉnh
                </button>
              </div>

              <div className="wrow">
                <span className="wrow__icon">
                  <IconSend />
                </span>
                <span className="wrow__meta">
                  <span className="wrow__title">Tự động gửi vào chat Meet</span>
                  <span className="wrow__note">
                    {prefs.autoPost
                      ? "Kết quả tới chat mà bạn không phải bấm."
                      : "Kết quả chỉ hiện trong khung bên MeetMate, không vào chat Meet."}
                  </span>
                </span>
                <Switch
                  checked={prefs.autoPost}
                  onChange={(v) => setPrefs({ autoPost: v })}
                  label="Tự động gửi vào chat Meet"
                />
              </div>

              <div className="wrow">
                <span className="wrow__icon">
                  <IconFolder />
                </span>
                <span className="wrow__meta">
                  <span className="wrow__title">Lưu bản ghi vào vùng làm việc</span>
                  <span className="wrow__note">
                    Trong họp, hỏi ý mọi người trước khi ghi — bản mô tả nêu rõ đây là trách nhiệm
                    của người dùng.
                  </span>
                </span>
                <Switch
                  checked={prefs.saveTranscript}
                  onChange={(v) => setPrefs({ saveTranscript: v })}
                  label="Lưu bản ghi vào vùng làm việc"
                />
              </div>
            </div>
          )}

          <div className="wiz__foot">
            {step === 1 ? (
              <button className="btn btn--secondary" onClick={closeWizard}>
                Hủy
              </button>
            ) : (
              <button className="btn btn--secondary" onClick={() => setStep(1)}>
                Quay lại
              </button>
            )}
            {step === 1 ? (
              <button className="btn btn--ink" onClick={editing ? finish : () => setStep(2)}>
                {nextLabel}
              </button>
            ) : (
              <button className="btn btn--ink" onClick={finish}>
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
