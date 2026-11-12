"use client";

// components/dashboard/CreateSessionWizard.tsx — hộp thoại "Cuộc họp mới".
//
// Chọn Assistant để tiếp tục luồng Google Meet, hoặc Teacher để tạo phòng học
// trên web. Hai loại phiên dùng chung cửa tạo mới nhưng có cấu hình riêng.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { teacherApi } from "../../lib/backendApi";
import { rememberTeacherAccess } from "../../lib/teacherAccess";
import { cn } from "../../lib/utils";
import {
  LANGUAGES,
  MEETING_KIND_LABEL,
  MODELS,
  type MeetingKind,
} from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { Segmented, Switch, useModalBehaviour } from "./controls";
import {
  IconFolder,
  IconInfo,
  IconSend,
  IconSettings,
  IconTranscript,
  IconX,
} from "./icons";

const KINDS = Object.keys(MEETING_KIND_LABEL) as MeetingKind[];

export function CreateSessionWizard() {
  const router = useRouter();
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
    documents,
    docsLoaded,
    docsError,
  } = useDashboard();

  const editing = wizard.editId ? meetings.find((m) => m.id === wizard.editId) ?? null : null;

  const [step, setStep] = useState(0);
  const [assistant, setAssistant] = useState<'assistant' | 'teacher'>('assistant');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('Cơ bản');
  const [goal, setGoal] = useState('');
  const [name, setName] = useState('');
  const [studyMode, setStudyMode] = useState<'solo' | 'group'>('solo');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [kind, setKind] = useState<MeetingKind>("san-pham");
  const [title, setTitle] = useState("");
  const [docIds, setDocIds] = useState<string[]>([]);

  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehaviour(wizard.open, closeWizard, panelRef);

  // mở mới = reset; mở để sửa = điền lại từ bản ghi
  const lastOpen = useRef(false);
  if (wizard.open && !lastOpen.current) {
    lastOpen.current = true;
    setStep(editing ? 1 : 0);
    setAssistant('assistant');
    setSubject(''); setGoal(''); setName(''); setLevel('Cơ bản'); setStudyMode('solo'); setCreateError('');
    setKind(wizard.kind ?? editing?.kind ?? "san-pham");
    setTitle(editing?.title ?? "");
    setDocIds([]);
  }
  if (!wizard.open && lastOpen.current) lastOpen.current = false;

  const nextLabel = useMemo(() => {
    if (editing) return "Lưu thay đổi";
    if (step === 0) return 'Tiếp tục';
    if (assistant === 'teacher') return creating ? 'Đang tạo phòng…' : 'Tạo phòng học';
    return step === 1 ? "Tiếp" : "Bắt đầu MeetMate";
  }, [editing, step, assistant, creating]);

  if (!wizard.open) return null;

  const finish = async () => {
    if (creating) return;
    if (!editing && assistant === 'teacher') {
      if (!subject.trim() || !name.trim()) { setCreateError('Hãy nhập môn học và tên của bạn.'); return; }
      setCreating(true); setCreateError('');
      try {
        const access = await teacherApi.create({ title: title.trim() || `Học ${subject.trim()}`.slice(0, 160), subject: subject.trim(), goal: goal.trim(), level, mode: studyMode, name: name.trim() });
        rememberTeacherAccess(access.room.id, access.memberToken);
        closeWizard();
        router.push(`/dashboard/teacher/${access.room.id}`);
      } catch (error) { setCreateError(error instanceof Error ? error.message : 'Không tạo được phòng học.'); }
      finally { setCreating(false); }
      return;
    }
    if (editing) {
      updateMeeting(editing.id, { title: title.trim() || editing.title, kind });
      pushToast("Đã cập nhật cuộc họp.");
      closeWizard();
      return;
    }
    requestInstall({
      title: title.trim() || `${MEETING_KIND_LABEL[kind]} · ${meetings.length + 1}`,
      kind,
      // tài liệu đã bị xóa khỏi thư viện trong lúc wizard mở thì không gửi
      documentIds: docIds.filter((id) => documents.some((d) => d.id === id)),
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
          <p className="wiz__sub">Chọn trợ lý phù hợp cho cuộc họp hoặc buổi học của bạn.</p>

          {/* sửa một cuộc họp thì không có bước "tùy chọn phiên": bấm "Lưu thay đổi"
              là xong, nên bộ đếm bước cũng chỉ được hứa một bước */}
          <ol className="stepper" aria-label="Tiến trình">
            {!editing && <>
              <li className={cn('stepper__step', step === 0 && 'stepper__step--active')}>
                <span className="stepper__dot">1</span> Chọn assistant
              </li>
              <li className={cn('stepper__link', step >= 1 && 'stepper__link--done')} aria-hidden />
            </>}
            <li className={cn("stepper__step", step === 1 && "stepper__step--active")}>
              <span className="stepper__dot">{editing ? 1 : 2}</span> Thông tin
            </li>
            {editing || assistant === 'teacher' ? null : (
              <>
                <li className={cn("stepper__link", step === 2 && "stepper__link--done")} aria-hidden />
                <li className={cn("stepper__step", step === 2 && "stepper__step--active")}>
                  <span className="stepper__dot">3</span> Tùy chọn
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
              {assistant === 'teacher' ? 'Teacher hoạt động ngay trên web. Học qua chat, tải tài liệu và mời nhóm vào cùng phòng.' : 'Assistant nghe cuộc họp từ extension Chrome. Gọi “trợ lý” để tra tài liệu hoặc tìm web.'}
            </span>
          </p>
        </aside>

        <div className="wiz__main">
          <div className="wiz__top">
            <button className="icon-btn wiz__close" aria-label="Đóng" onClick={closeWizard}>
              <IconX />
            </button>
          </div>

          {step === 0 ? (
            <div className="wiz__body" key="choose-assistant">
              <p className="wiz__eyebrow">Bạn muốn đồng hành cùng ai?</p>
              <h3 className="assistant-picker__heading">Một trợ lý, đúng việc bạn cần.</h3>
              <div className="assistant-picker" role="radiogroup" aria-label="Chọn assistant">
                <button type="button" role="radio" aria-checked={assistant === 'assistant'} className="assistant-choice" onClick={() => setAssistant('assistant')}>
                  <span className="assistant-choice__tag">CUỘC HỌP</span>
                  <strong>Assistant</strong>
                  <span>Trợ lý cuộc họp hiện tại. Nghe trên Google Meet, tra tài liệu và tìm nguồn khi bạn gọi.</span>
                  <small>Google Meet · Extension Chrome</small>
                </button>
                <button type="button" role="radio" aria-checked={assistant === 'teacher'} className="assistant-choice" onClick={() => setAssistant('teacher')}>
                  <span className="assistant-choice__tag">HỌC TẬP</span>
                  <strong>Teacher</strong>
                  <span>Giáo viên ảo giúp hiểu bài, giảng từ slide và Word, tìm tài liệu, ra và giải bài tập.</span>
                  <small>Phòng học trên web · Cá nhân hoặc nhóm</small>
                </button>
              </div>
            </div>
          ) : step === 1 && assistant === 'teacher' && !editing ? (
            <div className="wiz__body" key="teacher-info">
              <p className="wiz__eyebrow">Thiết lập buổi học với Teacher</p>
              <div className="field"><label className="field__label" htmlFor="teacher-title">Tên phòng học <span className="field__optional">(Không bắt buộc)</span></label>
                <input id="teacher-title" className="input" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="vd. Cùng ôn xác suất cuối kỳ" /></div>
              <div className="teacher-form-grid">
                <div className="field"><label className="field__label" htmlFor="teacher-subject">Môn học / chủ đề</label>
                  <input id="teacher-subject" className="input" value={subject} maxLength={160} onChange={e => setSubject(e.target.value)} placeholder="vd. Xác suất thống kê" required /></div>
                <div className="field"><label className="field__label" htmlFor="teacher-level">Trình độ</label>
                  <select id="teacher-level" className="select" value={level} onChange={e => setLevel(e.target.value)}>
                    {['Cơ bản', 'Trung cấp', 'Nâng cao', 'Phổ thông', 'Đại học'].map(value => <option key={value}>{value}</option>)}
                  </select></div>
              </div>
              <div className="field"><label className="field__label" htmlFor="teacher-goal">Bạn muốn đạt được điều gì?</label>
                <textarea id="teacher-goal" className="input" rows={2} maxLength={1200} value={goal} onChange={e => setGoal(e.target.value)} placeholder="vd. Hiểu phân phối chuẩn và tự giải được bài tập" /></div>
              <div className="field"><label className="field__label" htmlFor="teacher-name">Tên của bạn</label>
                <input id="teacher-name" className="input" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Tên hiển thị trong phòng học" required /></div>
              <Segmented<'solo' | 'group'> ariaLabel="Hình thức học" options={[{ id: 'solo', label: 'Học cá nhân' }, { id: 'group', label: 'Học theo nhóm' }]} value={studyMode} onChange={setStudyMode} />
              <p className="field__hint">Sau khi tạo phòng, bạn có thể tải PDF, slide PPTX, Word DOCX hoặc văn bản. {studyMode === 'group' ? 'Mời bạn bè bằng liên kết để cùng xem tài liệu và trao đổi với Teacher.' : 'Phòng cá nhân chỉ mở bằng trình duyệt đã tạo phòng.'}</p>
              {createError && <p className="teacher-error" role="alert">{createError}</p>}
            </div>
          ) : step === 1 ? (
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
              {!docsLoaded ? (
                <p className="wiz__helper">Đang tải thư viện tài liệu…</p>
              ) : docsError ? (
                <p className="wiz__helper" role="alert">
                  Chưa đọc được thư viện tài liệu: {docsError}
                </p>
              ) : documents.length === 0 ? (
                <p className="wiz__helper">
                  Chưa có tài liệu nào. Thêm PDF ở trang{" "}
                  <Link href="/dashboard/documents" onClick={closeWizard}>
                    Tài liệu
                  </Link>{" "}
                  rồi tạo cuộc họp, hoặc họp không cần tài liệu.
                </p>
              ) : (
                <>
                  <div className="doclist" role="group" aria-label="Chọn tài liệu đối chiếu">
                    {documents.map((d) => {
                      const on = docIds.includes(d.id);
                      return (
                        <label key={d.id} className={cn("choice", on && "choice--on")}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setDocIds((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]))
                            }
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
                  <p className="wiz__helper">
                    Khi bấm “Gửi phiên cho MeetMate”, nội dung tài liệu đã chọn được gửi sang extension.
                    Trong họp, nói “Trợ lý ơi, …” để MeetMate tra trong các tài liệu này.
                  </p>
                </>
              )}
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
            {step === 0 || editing ? (
              <button className="btn btn--secondary" onClick={closeWizard}>
                Hủy
              </button>
            ) : (
              <button className="btn btn--secondary" disabled={creating} onClick={() => setStep(step - 1)}>
                Quay lại
              </button>
            )}
            {step < 2 ? (
              <button className="btn btn--ink" disabled={creating} onClick={editing || (step === 1 && assistant === 'teacher') ? finish : () => setStep(step + 1)}>
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
