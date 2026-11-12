"use client";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { teacherApi } from '../../lib/backendApi';
import { TEACHER_ACTIONS, TEACHER_LIMITS, type TeacherAction, type TeacherConfig, type TeacherMessage, type TeacherRoom as Room, type TeacherRoomSummary } from '../../lib/teacher';
import { rememberTeacherAccess, teacherToken } from '../../lib/teacherAccess';
import { useDashboard } from './DashboardContext';
import { IconBook, IconCopy, IconFile, IconSend, IconUpload } from './icons';

export function TeacherRoom({ id }: { id: string }) {
  const { pushToast } = useDashboard();
  const [room, setRoom] = useState<Room | null>(null);
  const [info, setInfo] = useState<TeacherRoomSummary | null>(null);
  const [config, setConfig] = useState<TeacherConfig | null>(null);
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [action, setAction] = useState<TeacherAction>('ask');
  const [draft, setDraft] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [highlight, setHighlight] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const unsentRequest = useRef<{ requestId: string; text: string; action: TeacherAction; documentId?: string } | null>(null);
  const updateRoom = useCallback((next: Room) => setRoom(current => !current || next.updatedAt >= current.updatedAt ? next : current), []);

  useEffect(() => {
    let active = true;
    setLoading(true); setRoom(null); setInfo(null); setConfig(null); setError('');
    setDocumentId(''); setHighlight(''); setInviteLink(''); setDraft(''); unsentRequest.current = null;
    const stored = teacherToken(id); setToken(stored);
    void Promise.all([teacherApi.info(id), teacherApi.config()]).then(async ([info, config]) => {
      if (!active) return;
      setInfo(info); setConfig(config);
      if (stored) {
        try { const room = await teacherApi.room(id, stored); if (active) setRoom(room); }
        catch (error) { if (active) setError(error instanceof Error ? error.message : 'Không mở được phòng học.'); }
      }
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Không mở được phòng học.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!room || !token) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await teacherApi.room(id, token);
        if (active) { updateRoom(next); setConnectionError(''); }
      } catch { if (active) setConnectionError('Đang mất kết nối. Các tin mới sẽ đồng bộ khi kết nối trở lại.'); }
      if (active) timer = setTimeout(poll, 2500);
    };
    timer = setTimeout(poll, 2500);
    return () => { active = false; clearTimeout(timer); };
  }, [id, token, Boolean(room), updateRoom]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [room?.messages.length, sending]);

  async function join() {
    if (!name.trim() || sending) return;
    setSending(true); setError('');
    try {
      const access = await teacherApi.join(id, name.trim());
      rememberTeacherAccess(id, access.memberToken); setToken(access.memberToken); setRoom(access.room);
    } catch (error) { setError(error instanceof Error ? error.message : 'Không tham gia được phòng.'); }
    finally { setSending(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    setUploading(true); setError('');
    try {
      for (const file of Array.from(files)) {
        if (file.size > TEACHER_LIMITS.fileBytes) throw new Error(`${file.name}: tối đa 10 MB mỗi tệp.`);
        const next = await teacherApi.upload(id, token, file);
        updateRoom(next); setDocumentId(next.documents[next.documents.length - 1].id);
      }
      pushToast('Đã đọc tài liệu. Teacher có thể dùng nội dung này để giảng bài.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Không đọc được tài liệu.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function send(retry?: TeacherMessage) {
    if (sending || uploading || room?.busy || !config?.ai || (!retry && action === 'research' && !config.web)) return;
    const question = retry ? room?.messages.find(message => message.requestId === retry.requestId && message.role === 'student') : null;
    const text = (question?.text ?? draft).trim();
    if (!text) { composer.current?.focus(); return; }
    setSending(true); setError('');
    try {
      let request: { requestId: string; text: string; action: TeacherAction; documentId?: string } = {
        requestId: retry?.requestId ?? crypto.randomUUID(), text, action: question?.action ?? action,
        documentId: (question ? question.documentId : documentId) || undefined,
      };
      const unsent = unsentRequest.current;
      if (!retry && unsent && unsent.text === request.text && unsent.action === request.action && unsent.documentId === request.documentId) request = unsent;
      unsentRequest.current = request;
      const next = await teacherApi.message(id, token, request);
      unsentRequest.current = null;
      updateRoom(next); if (!retry) setDraft('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Không gửi được câu hỏi. Nội dung bạn nhập vẫn được giữ lại.'); }
    finally { setSending(false); }
  }

  async function invite() {
    const link = window.location.href;
    setInviteLink(link);
    try { await navigator.clipboard.writeText(link); pushToast('Đã sao chép liên kết phòng học.'); }
    catch { pushToast('Bạn có thể sao chép liên kết đang hiện trong phòng.'); }
  }

  if (loading) return <p role="status">Đang mở phòng học…</p>;
  if (!room) return <section className="teacher-join">
    <Link href="/dashboard/teacher">← Các phòng học</Link><IconBook /><span className="teacher-eyebrow">TEACHER / {info?.mode === 'group' ? 'HỌC NHÓM' : 'PHÒNG HỌC'}</span>
    <h2>{info?.title ?? 'Không mở được phòng học'}</h2><p>{info?.subject}</p>
    {info?.mode === 'group' ? <><p>Tham gia để cùng xem tài liệu, đặt câu hỏi và học với Teacher.</p>
      <form onSubmit={e => { e.preventDefault(); void join(); }}><label className="field__label" htmlFor="join-name">Tên của bạn</label>
        <input className="input" id="join-name" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Tên hiển thị trong nhóm" required />
        <button className="btn btn--primary" disabled={sending || !name.trim()}>{sending ? 'Đang tham gia…' : 'Vào phòng học'}</button></form></>
      : info && <p>Đây là phòng cá nhân. Hãy mở bằng trình duyệt đã tạo phòng, hoặc tạo phòng nhóm để mời người khác.</p>}
    {error && <p className="teacher-error" role="alert">{error}</p>}
  </section>;

  const selected = room.documents.find(doc => doc.id === documentId);
  return <div className="teacher-study">
    <header className="teacher-room-head"><div><Link href="/dashboard/teacher" className="teacher-back">← Phòng học</Link>
      <h2>{room.title}</h2><p>{room.subject} <span>·</span> {room.level} <span>·</span> {room.mode === 'group' ? 'Học nhóm' : 'Học cá nhân'}</p></div>
      {room.mode === 'group' && <button className="btn btn--secondary" onClick={invite}><IconCopy /> Mời bạn học</button>}
    </header>
    {inviteLink && <label className="teacher-invite">Liên kết mời vào phòng<input className="input" value={inviteLink} readOnly onFocus={e => e.target.select()} /></label>}
    {config && !config.ai && <p className="teacher-notice" role="status">Teacher chưa được kết nối AI. Tài liệu và phòng học vẫn dùng được; cần cấu hình dịch vụ AI để Teacher trả lời.</p>}
    {connectionError && <p className="teacher-notice" role="status">{connectionError}</p>}
    {error && <p className="teacher-error" role="alert">{error}</p>}
    <div className="teacher-workspace">
      <aside className="teacher-materials" aria-label="Tài liệu và thành viên">
        <div className="teacher-section-head"><h3>Tài liệu học tập</h3><span>{room.documents.length}/{TEACHER_LIMITS.documents}</span></div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.txt,.md" multiple hidden onChange={e => void upload(e.target.files)} />
        <button className="teacher-upload" onClick={() => fileRef.current?.click()} disabled={uploading || room.busy || sending}><IconUpload />{uploading ? 'Đang đọc tài liệu…' : 'Tải tài liệu lên'}<small>PDF, Word, slide, TXT · tối đa 10 MB/tệp</small></button>
        {!room.documents.length && <p className="teacher-small">Tải giáo trình, slide bài giảng hoặc đề bài. Teacher sẽ sử dụng phần văn bản đọc được trong file.</p>}
        <div className="teacher-document-list">{room.documents.map(doc => <button className="teacher-document" aria-pressed={documentId === doc.id} key={doc.id} onClick={() => { setDocumentId(doc.id); setHighlight(''); }}>
          <IconFile /><span><strong>{doc.name}</strong><small>{doc.format} · {doc.sections.length} phần</small></span>
        </button>)}</div>
        {selected && <details className="teacher-document-preview" open key={`${selected.id}-${highlight}`}>
          <summary>Nội dung đã đọc · {selected.name}</summary>
          <div>{selected.sections.filter(section => !highlight || section.locator === highlight).map((section, i) => <section key={i}><strong>{section.locator}</strong><p>{section.text}</p></section>)}</div>
          {highlight && <button className="btn btn--secondary btn--sm" onClick={() => setHighlight('')}>Xem toàn bộ</button>}
        </details>}
        <section className="teacher-members"><h3>{room.mode === 'group' ? 'Nhóm học tập' : 'Người học'} <span>({room.members.length})</span></h3>
          {room.members.map(member => <div key={member.id}><span className="teacher-avatar">{member.name.slice(0, 1).toUpperCase()}</span>{member.name}</div>)}
          {room.mode === 'group' && <p className="teacher-small">Mọi thành viên cùng xem tài liệu và hội thoại. Nội dung mới tự đồng bộ trong phòng.</p>}
        </section>
      </aside>
      <section className="teacher-classroom" aria-label="Hội thoại với Teacher">
        <div className="teacher-classroom__head"><span className="teacher-avatar teacher-avatar--ai"><IconBook /></span><div><strong>Teacher</strong><small>Học để hiểu, luyện để tự làm được.</small></div><span className="teacher-chat-label">{room.mode === 'group' ? 'Hội thoại chung' : 'Giáo viên của bạn'}</span></div>
        <div className="teacher-messages" role="log" aria-live="polite" aria-relevant="additions text">
          {!room.messages.length && <div className="teacher-welcome"><span className="teacher-eyebrow">CHÀO MỪNG ĐẾN LỚP HỌC</span><h3>Hôm nay mình cùng học gì?</h3>
            <p>{room.goal || 'Bắt đầu bằng một tài liệu hoặc một câu hỏi. Teacher sẽ giúp bạn đi từ điều chưa hiểu đến cách tự giải quyết.'}</p>
            <div>{(['teach', 'exercises', 'solve'] as TeacherAction[]).map(value => <button key={value} onClick={() => { setAction(value); setDraft(value === 'teach' ? 'Hãy giảng cho mình các ý chính và ví dụ trong tài liệu.' : value === 'exercises' ? 'Hãy ra bài tập từ dễ đến khó để mình luyện kiến thức trong tài liệu.' : 'Mình cần hướng dẫn giải bài tập sau: '); composer.current?.focus(); }}>
              <strong>{TEACHER_ACTIONS[value].label}</strong><span>{value === 'teach' ? 'Hiểu từng ý với ví dụ' : value === 'exercises' ? 'Luyện từ dễ đến khó' : 'Tìm cách làm, từng bước'}</span></button>)}</div>
          </div>}
          {room.messages.map(message => <article key={message.id} className={`teacher-message teacher-message--${message.role}`}>
            <header><strong>{message.name}</strong><span>{TEACHER_ACTIONS[message.action].label}</span><time dateTime={new Date(message.createdAt).toISOString()}>{new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Saigon' }).format(message.createdAt)}</time></header>
            <div className="teacher-message__body">{message.status === 'pending' ? 'Teacher đang chuẩn bị câu trả lời…' : message.text}</div>
            {message.status === 'error' && <button className="btn btn--secondary btn--sm" disabled={sending || room.busy} onClick={() => void send(message)}>Thử lại câu hỏi này</button>}
            {!!message.citations?.length && <div className="teacher-citations"><strong>Từ tài liệu học tập</strong>{message.citations.map((citation, i) => <button key={i} onClick={() => { setDocumentId(citation.documentId); setHighlight(citation.locator); }}>
              <span>{citation.documentName} · {citation.locator}</span><q>{citation.quote}</q></button>)}</div>}
            {!!message.sources?.length && <div className="teacher-sources"><strong>Tài liệu tìm trên web</strong>{message.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>}
          </article>)}
          {sending && !room.busy && <p className="teacher-thinking" role="status">Teacher đang xử lý câu hỏi…</p>}<div ref={bottom} />
        </div>
        <form className="teacher-composer" onSubmit={e => { e.preventDefault(); void send(); }}>
          <div className="teacher-actions" aria-label="Cách Teacher giúp bạn">{(Object.keys(TEACHER_ACTIONS) as TeacherAction[]).map(value => <button type="button" key={value} aria-pressed={action === value} onClick={() => setAction(value)}>{TEACHER_ACTIONS[value].label}</button>)}</div>
          <label className="teacher-context">Học từ<select aria-label="Tài liệu dùng cho câu hỏi" value={documentId} onChange={e => { setDocumentId(e.target.value); setHighlight(''); }}>
            <option value="">Tất cả tài liệu trong phòng</option>{room.documents.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
          </select></label>
          <div className="teacher-composer__input"><textarea ref={composer} aria-label="Câu hỏi cho Teacher" maxLength={TEACHER_LIMITS.messageChars} value={draft} disabled={sending} onChange={e => setDraft(e.target.value)} rows={3} placeholder={TEACHER_ACTIONS[action].hint}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
            <button className="btn btn--primary" type="submit" disabled={!draft.trim() || sending || room.busy || uploading || !config?.ai || (action === 'research' && !config.web)} aria-label="Gửi câu hỏi"><IconSend /></button></div>
          <p className="teacher-small">{action === 'research' && !config?.web ? 'Tìm tài liệu web chưa được cấu hình. Các chế độ học từ file vẫn dùng được khi Teacher đã kết nối AI.' : 'Enter để gửi · Shift + Enter để xuống dòng. Bạn có thể mở phần trích dẫn để kiểm tra lại tài liệu.'}</p>
        </form>
      </section>
    </div>
  </div>;
}
