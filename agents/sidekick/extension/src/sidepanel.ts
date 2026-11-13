import { COVERAGE_LABEL, CORRECTNESS_LABEL, presentationStats, type PresentationAction } from '../../../../lib/presentation';
import type { AskStep } from './assistant';
import { FULL_DOC_MAX_CHARS } from './config';
import { MEETING_KIND_LABEL } from '../../../../lib/types';
import type { SavedSession } from '../../../../lib/bridgeProtocol';
import { listDocs, type StoredDoc } from './docs/store';
import { listDrafts, summaryOf, type DraftSummary } from './drafts';
import { CURRENT_KEY, SESSIONS_KEY, listSessions } from './sessionStore';
import { pickMeetingTab } from './meet-url';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Card, type Msg, type SelectReply, type Settings, type StartReply } from './messages';
import { EMPTY_VIEW, type View } from './view';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const send = (msg: Msg) => chrome.runtime.sendMessage(msg).catch(() => undefined);
const time = (at: number) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

let view: View = EMPTY_VIEW;
let docs: StoredDoc[] = [];
// web sessions waiting to be recorded, the chosen one, the one being recorded, and the latest saved
let drafts: DraftSummary[] = [];
let selected: string | null = null;
let recording: string | null = null;
let lastSession: SavedSession | null = null;
let settings: Settings = DEFAULT_SETTINGS;
let hasBlazeKey = false;
let partial = '';
let localNotice: { level: 'info' | 'error'; message: string } | null = null;

const STEP_LABEL: Record<AskStep, string> = {
  route: 'Đã nghe câu hỏi, đang tra tài liệu và chọn nguồn…',
  docs: 'Đang tra tài liệu…',
  web: 'Đang tìm trên web…',
  writing: 'Đã có nguồn, đang viết câu trả lời…',
};

const STATE_LABEL: Record<View['state'], string> = {
  idle: 'Chưa chạy', starting: 'Đang kết nối', live: 'Đang nghe', reconnecting: 'Đang kết nối lại', error: 'Lỗi',
};
const KIND_LABEL: Record<Card['kind'], string> = {
  contradiction: 'Mâu thuẫn với tài liệu', partial: 'Khớp một phần', supported: 'Khớp tài liệu',
  answer: 'Trả lời từ tài liệu', not_in_doc: 'Tài liệu không có', research: 'Nguồn tham khảo',
};
const CHAT_LABEL: Record<Card['chat'], string> = {
  pending: 'Đang gửi vào chat…', sent: 'Đã gửi vào chat Meet', failed: 'Không gửi được vào chat', off: 'Chỉ hiện ở đây',
};

const running = () => view.state === 'live' || view.state === 'starting' || view.state === 'reconnecting';

function elapsed(): string {
  if (!view.startedAt || !running()) return '';
  const s = Math.floor((Date.now() - view.startedAt) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderControl(): void {
  const pill = $('pill');
  pill.dataset.state = view.state;
  pill.textContent = STATE_LABEL[view.state];
  const toggle = $<HTMLButtonElement>('toggle');
  toggle.textContent = running() ? 'Dừng' : 'Bắt đầu nghe';
  toggle.className = running() ? 'btn big stop' : 'btn primary big';
  const parts = [elapsed(), `${docs.length} tài liệu`, settings.postToChat ? 'gửi vào chat' : 'không gửi chat', `v${chrome.runtime.getManifest().version}`].filter(Boolean);
  if(view.presentation) parts.splice(2,1,'Thuyết trình · chỉ micro · không gửi chat');
  $('meta').textContent = running() ? parts.join(' · ')
    : `${parts.join(' · ')} — mẹo: bấm biểu tượng MeetMate trên thanh công cụ khi đang ở tab Meet để bắt đầu nghe ngay`;

  const notice = $('notice');
  const shown = localNotice
    ?? (view.state === 'error' && view.detail ? { level: 'error' as const, message: view.detail } : null)
    ?? (view.state === 'reconnecting' ? { level: 'info' as const, message: `Mất kết nối nhận dạng giọng nói, đang thử lại… ${view.detail ?? ''}` } : null)
    ?? (view.notice && (running() || Date.now() - view.notice.at < 60_000) ? view.notice : null)
    ?? (!hasBlazeKey ? { level: 'info' as const, message: 'Nhập khóa Blaze trong phần Cài đặt để bắt đầu.' } : null);
  notice.hidden = !shown;
  if (shown) {
    notice.dataset.level = shown.level;
    notice.textContent = shown.message;
  }

  const working = running() ? view.progress : null;
  $('working').hidden = !working;
  if (working) {
    const secs = Math.max(0, Math.floor((Date.now() - working.at) / 1000));
    const q = working.question.length > 80 ? `${working.question.slice(0, 79)}…` : working.question;
    $('working-step').textContent = `${STEP_LABEL[working.step]}${secs >= 1 ? ` · ${secs} giây` : ''}`;
    $('working-q').textContent = q ? `“${q}”` : '';
  }

  const last = view.transcript.at(-1);
  $('live').hidden = !running();
  $('live-final').textContent = partial ? '' : last?.text ?? 'Đang nghe…';
  $('live-partial').textContent = partial;
}

function renderCard(c: Card): string {
  const said = c.utterance && c.kind !== 'research' ? `<p class="said">“${esc(c.utterance)}”</p>` : '';
  const title = c.title ? `<p class="text">${esc(c.title)}</p>` : '';
  const quote = c.quote ? `<blockquote>“${esc(c.quote)}”${c.source ? `<cite>${esc(c.source)}</cite>` : ''}</blockquote>` : '';
  const links = c.links?.length
    ? `<ol class="links">${c.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a><br>${esc(l.reason)}</li>`).join('')}</ol>`
    : '';
  const own = c.mode === 'auto' || c.mode === 'verify';
  const chatText = own ? 'Chỉ bạn thấy, không gửi vào chat'
    : c.repeat ? 'Đã báo trước đó, không gửi lại vào chat' : `${CHAT_LABEL[c.chat]}${c.chatError ? `: ${esc(c.chatError)}` : ''}`;
  const chat = `<footer class="chat ${own ? 'off' : c.chat}">${chatText}</footer>`;
  const how = c.mode === 'ask' ? ' · được hỏi' : c.mode === 'auto' ? ' · tự kiểm' : c.mode === 'verify' ? ' · bạn bấm kiểm' : '';
  // a claim that matches the document is good news: one compact line with its source
  if (c.kind === 'supported') {
    return `<article class="card supported">
      <header><span class="chip">✓ ${KIND_LABEL.supported}${how}</span><time>${time(c.at)}</time></header>
      ${said}<p>${esc(c.text)}${c.source ? ` <cite>${esc(c.source)}</cite>` : ''}</p>
    </article>`;
  }
  return `<article class="card ${c.kind}">
    <header><span class="chip">${KIND_LABEL[c.kind]}${how}</span><time>${time(c.at)}</time></header>
    ${said}${title}<p class="${c.kind === 'research' ? '' : 'text'}">${esc(c.text)}</p>${quote}${links}${chat}
  </article>`;
}

function renderPresentation(): void {
  let container=document.getElementById('presentation');
  if(!container){container=document.createElement('section');container.id='presentation';container.className='box';document.querySelector('.control')!.after(container);}
  const p=view.presentation ?? lastSession?.presentation;
  container.hidden=!p;
  document.querySelector<HTMLElement>('.results')!.hidden=Boolean(p);
  if(!p)return;
  const id=view.presentationId??lastSession?.id??'';
  const active=running() && Boolean(view.presentation);
  const stats=presentationStats(p);
  container.innerHTML='<h2>Thuyết trình · chỉ bạn thấy</h2><p>'+stats.covered+'/'+stats.total+' ý bắt buộc đã nói · '+stats.skipped+' bỏ qua</p>'
    +'<p>Mức bao phủ không phải điểm chính xác. Không gửi chat Meet. Chia sẻ riêng nội dung, tránh chia sẻ cửa sổ chứa checklist.</p>'
    +(active?'<button class="btn" data-action="missing">Còn thiếu gì?</button> <button class="btn" data-action="pause">'+(p.paused?'Tiếp tục':'Tạm dừng')+'</button><p><label><input id="presentation-remind" type="checkbox" '+(p.autoRemind?'checked':'')+'> Nhắc khi sắp kết thúc</label></p>':'')
    +(p.hint?'<p class="notice">'+esc(p.hint)+'</p>':'')+(p.error?'<p role="alert">'+esc(p.error)+'</p>':'')
    +(p.deviations?.length?'<h3>Sai lệch so với tài liệu</h3>'+p.deviations.map(d=>'<article class="card"><strong>'+esc(d.note)+(d.resolvedBy?' — đã tự sửa':' — cần xem lại')+'</strong><p>'+esc(d.evidence.text)+'</p><blockquote>'+esc(d.citation.text)+'<cite>'+esc(d.citation.docName)+', tr. '+d.citation.page+'</cite></blockquote>'+(d.resolvedBy?'<p>Lời tự sửa: '+esc(d.resolvedBy.text)+'</p>':'')+'</article>').join(''):'')
    +'<ol class="presentation-items">'+p.items.map((i,n)=>'<li><strong>'+esc(i.text)+'</strong><p>'+COVERAGE_LABEL[i.coverage]+' · '+CORRECTNESS_LABEL[i.correctness]+(i.manual?' · sửa tay':'')+'</p>'
      +(active?'<select data-item="'+esc(i.id)+'" aria-label="Trạng thái ý '+(n+1)+'">'+Object.entries(COVERAGE_LABEL).map(([v,l])=>'<option value="'+v+'" '+(i.coverage===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'+(i.manual?' <button class="btn" data-auto="'+esc(i.id)+'">Tự theo dõi</button>':''):'')
      +(i.evidence?'<p>['+Math.floor(i.evidence.atMs/1000)+'s] '+esc(i.evidence.text)+'</p>':'')+(i.note?'<p>'+esc(i.note)+'</p>':'')
      +(i.citation?'<details><summary>'+esc(i.citation.docName)+' · tr. '+i.citation.page+'</summary><blockquote>'+esc(i.citation.text)+'</blockquote></details>':'<p>Ý chưa có nguồn.</p>')+'</li>').join('')+'</ol>';
  const action=(action:PresentationAction)=>void send({type:'mm.web',msg:{type:'presentation.action',id,revision:p.revision,action}});
  container.querySelector('[data-action="missing"]')?.addEventListener('click',()=>action({kind:'missing'}));
  container.querySelector('[data-action="pause"]')?.addEventListener('click',()=>action({kind:'pause',paused:!p.paused}));
  container.querySelector('#presentation-remind')?.addEventListener('change',e=>action({kind:'remind',enabled:(e.target as HTMLInputElement).checked}));
  container.querySelectorAll<HTMLSelectElement>('[data-item]').forEach(el=>el.addEventListener('change',()=>action({kind:'item',itemId:el.dataset.item!,coverage:el.value as keyof typeof COVERAGE_LABEL})));
  container.querySelectorAll<HTMLElement>('[data-auto]').forEach(el=>el.addEventListener('click',()=>action({kind:'item',itemId:el.dataset.auto!,coverage:'auto'})));
}

function renderCards(): void {
  $('cards').innerHTML = view.cards.map(renderCard).join('');
  $('cards-empty').hidden = view.cards.length > 0;
  $('card-count').textContent = view.cards.length ? `(${view.cards.length})` : '';
}

function renderTranscript(): void {
  const list = $('transcript');
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
  const canCheck = running() && docs.length > 0;
  list.classList.toggle('checkable', canCheck);
  list.innerHTML = view.transcript.map((l, i) => `<li data-i="${i}"${canCheck ? ' tabindex="0" title="Bấm để kiểm câu này với tài liệu (chỉ bạn thấy)"' : ''}><time>${time(l.at)}</time> ${esc(l.text)}</li>`).join('');
  if (atBottom) list.scrollTop = list.scrollHeight;
  $('line-count').textContent = view.transcript.length ? `(${view.transcript.length} câu)` : '';
}

function renderDocs(): void {
  const rows = docs.map(d => `<li>
      <span class="name" title="${esc(d.name)}">${esc(d.name)}</span>
      <span class="info">${d.pageCount} trang</span>
    </li>`);
  $('docs').innerHTML = rows.length ? rows.join('') : '<li class="empty">Phiên này không có tài liệu.</li>';
  $('doc-count').textContent = docs.length ? `(${docs.length})` : '';
  const chars = docs.reduce((n, d) => n + d.chars, 0);
  $('docs-mode').textContent = !docs.length ? ''
    : chars <= FULL_DOC_MAX_CHARS
      ? `${docs.reduce((n, d) => n + d.pageCount, 0)} trang. Toàn bộ tài liệu được dùng mỗi lần đối chiếu.`
      : 'Tài liệu lớn: mỗi lần đối chiếu, MeetMate chọn khoảng 20 đoạn liên quan nhất.';
}

function renderSession(): void {
  const box = document.querySelector<HTMLElement>('.session')!;
  const select = $<HTMLSelectElement>('draft');
  const info = $('session-info');
  box.toggleAttribute('data-recording', !!recording);
  if (recording) {
    // the session being recorded is no longer a draft once it ends, so name it from the store
    const name = lastSession?.id === recording ? lastSession.title : drafts.find(d => d.id === recording)?.title ?? 'Cuộc họp';
    select.innerHTML = `<option>${esc(name)}</option>`;
    select.disabled = true;
    info.innerHTML = `Đang ghi phiên <code>${esc(recording)}</code>. Dừng nghe rồi mới đổi được phiên.`;
  } else {
    const options = drafts.map(d => `<option value="${esc(d.id)}">${esc(d.title)} · ${d.docCount} tài liệu · ${time(d.preparedAt)}</option>`);
    options.push(`<option value="">Phiên mới (tự tạo mã khi bắt đầu)</option>`);
    select.innerHTML = options.join('');
    select.value = selected && drafts.some(d => d.id === selected) ? selected : '';
    select.disabled = false;
    const chosen = drafts.find(d => d.id === select.value);
    info.innerHTML = chosen
      ? `Từ web · ${esc(MEETING_KIND_LABEL[chosen.kind] ?? chosen.kind)} · mã <code>${esc(chosen.id)}</code>`
        + (chosen.docCount ? `<br>Tài liệu: ${chosen.docNames.map(esc).join(', ')}` : '<br>Phiên này không có tài liệu.')
      : drafts.length
        ? 'Không dùng phiên nào từ web: bắt đầu nghe sẽ tạo phiên mới với mã <code>ext-…</code>, không có tài liệu. Phiên vẫn hiện trên web sau khi họp.'
        : 'Chưa có phiên nào từ web. Tạo “Cuộc họp mới” trên web MeetMate rồi bấm “Gửi phiên cho MeetMate” để có tài liệu; nếu bắt đầu ngay, MeetMate tạo phiên mới với mã <code>ext-…</code>.';
  }
  const last = $('session-last');
  const showLast = !!lastSession && lastSession.endedAt !== null && lastSession.id !== recording;
  last.hidden = !showLast;
  if (showLast && lastSession) {
    last.innerHTML = `Phiên vừa ghi: ${esc(lastSession.title)} (<code>${esc(lastSession.id)}</code>) · ${lastSession.lines.length} câu · `
      + (typeof lastSession.syncedAt === 'number' ? 'đã lưu lên backend' : 'chờ “Lưu phiên” trên web');
  }
}

async function refreshSessions(): Promise<void> {
  drafts = (await listDrafts()).map(summaryOf);
  selected = ((await chrome.storage.local.get(STORAGE_KEYS.selectedDraft))[STORAGE_KEYS.selectedDraft] as string | null | undefined) ?? null;
  recording = ((await chrome.storage.session.get(CURRENT_KEY))[CURRENT_KEY] as string | undefined) ?? null;
  lastSession = (await listSessions())[0] ?? null;
  renderSession();
  renderPresentation();
}

async function choose(id: string | null): Promise<void> {
  const reply = (await send({ type: 'mm.selectDraft', id })) as SelectReply | undefined;
  if (!reply?.ok) say('error', reply?.error ?? 'Không đổi được phiên');
  await refreshSessions();
  await refreshDocs();
}

function render(): void {
  renderPresentation();
  renderSession();
  renderControl();
  renderCards();
  renderTranscript();
  renderDocs();
}

async function refreshDocs(): Promise<void> {
  docs = await listDocs();
  render();
}

function say(level: 'info' | 'error', message: string): void {
  localNotice = { level, message };
  renderControl();
}

async function start(): Promise<void> {
  localNotice = null;
  if (!hasBlazeKey) {
    ($('settings-box') as HTMLDetailsElement).open = true;
    return say('error', 'Thiếu khóa Blaze. Nhập khóa trong phần Cài đặt.');
  }
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = pickMeetingTab(active, await chrome.tabs.query({ url: 'https://meet.google.com/*' }));
  if (!tab?.id) {
    return say('error', 'Hãy mở tab Google Meet đang có cuộc họp, rồi bấm Bắt đầu nghe.');
  }
  const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);
  if (mic?.state === 'prompt') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission.html') });
    return say('info', 'Cấp quyền micro trong tab vừa mở, rồi quay lại bấm Bắt đầu nghe.');
  }
  let streamId: string;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  } catch (error) {
    // Expected in most browsers: only a toolbar click may start a tab capture.
    console.info('tabCapture from the side panel:', error);
    return say('info', 'Để bắt đầu, bấm biểu tượng MeetMate trên thanh công cụ (cạnh thanh địa chỉ) khi đang ở tab Meet. MeetMate sẽ bắt đầu nghe ngay.');
  }
  const toggle = $<HTMLButtonElement>('toggle');
  toggle.disabled = true;
  try {
    const reply = (await send({ type: 'mm.start', tabId: tab.id, streamId })) as StartReply | undefined;
    if (!reply?.ok) say('error', reply?.error ?? 'Không bắt đầu được');
  } finally {
    toggle.disabled = false;
  }
}

async function stop(): Promise<void> {
  const toggle = $<HTMLButtonElement>('toggle');
  toggle.disabled = true;
  await send({ type: 'mm.stop' });
  toggle.disabled = false;
}

function saveSettings(next: Settings): void {
  settings = next;
  void chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  void send({ type: 'mm.settings', settings });
  renderControl();
}

function bindKey(id: string, key: string): void {
  const input = $<HTMLInputElement>(id);
  input.addEventListener('change', () => {
    void chrome.storage.local.set({ [key]: input.value.trim() });
  });
}

async function init(): Promise<void> {
  const local = await chrome.storage.local.get([STORAGE_KEYS.blaze, STORAGE_KEYS.exa, STORAGE_KEYS.settings]);
  $<HTMLInputElement>('blaze-key').value = String(local[STORAGE_KEYS.blaze] ?? '');
  $<HTMLInputElement>('exa-key').value = String(local[STORAGE_KEYS.exa] ?? '');
  hasBlazeKey = Boolean(String(local[STORAGE_KEYS.blaze] ?? '').trim());
  settings = { ...DEFAULT_SETTINGS, ...(local[STORAGE_KEYS.settings] as Partial<Settings> | undefined) };
  $<HTMLInputElement>('post-chat').checked = settings.postToChat;
  $<HTMLInputElement>('web-research').checked = settings.webResearch;
  $<HTMLInputElement>('auto-check').checked = settings.autoCheck;
  view = ((await chrome.storage.session.get(STORAGE_KEYS.view))[STORAGE_KEYS.view] as View | undefined) ?? EMPTY_VIEW;
  docs = await listDocs();
  ($('settings-box') as HTMLDetailsElement).open = !hasBlazeKey;
  await refreshSessions();
  render();
  $<HTMLSelectElement>('draft').addEventListener('change', e => void choose((e.target as HTMLSelectElement).value || null));

  bindKey('blaze-key', STORAGE_KEYS.blaze);
  bindKey('exa-key', STORAGE_KEYS.exa);
  $('post-chat').addEventListener('change', e => saveSettings({ ...settings, postToChat: (e.target as HTMLInputElement).checked }));
  $('web-research').addEventListener('change', e => saveSettings({ ...settings, webResearch: (e.target as HTMLInputElement).checked }));
  $('auto-check').addEventListener('change', e => saveSettings({ ...settings, autoCheck: (e.target as HTMLInputElement).checked }));
  // click (or Enter on) a transcript line: check it against the session's documents
  const verifyLine = (target: EventTarget | null) => {
    const li = (target as HTMLElement | null)?.closest<HTMLElement>('li[data-i]');
    const line = li ? view.transcript[Number(li.dataset.i)] : undefined;
    if (!line || !running() || !docs.length) return;
    void chrome.runtime.sendMessage({ type: 'mm.verify', text: line.text } satisfies Msg).catch(() => undefined);
    localNotice = { level: 'info', message: `Đang kiểm: “${line.text.length > 70 ? `${line.text.slice(0, 69)}…` : line.text}”` };
    renderControl();
  };
  $('transcript').addEventListener('click', e => verifyLine(e.target));
  $('transcript').addEventListener('keydown', e => { if (e.key === 'Enter') verifyLine(e.target); });
  $('toggle').addEventListener('click', () => void (running() ? stop() : start()));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes[STORAGE_KEYS.view]) {
      const next = (changes[STORAGE_KEYS.view].newValue as View | undefined) ?? EMPTY_VIEW;
      if (next.transcript.length !== view.transcript.length) partial = '';
      // A newer message from the background replaces whatever the panel said itself.
      if (next.state !== view.state || next.notice?.at !== view.notice?.at) localNotice = null;
      // a clicked line's verdict arrived: drop the "checking…" note
      if (next.cards.length !== view.cards.length && localNotice?.message.startsWith('Đang kiểm')) localNotice = null;
      view = next;
      render();
    }
    if ((area === 'local' && (changes[STORAGE_KEYS.selectedDraft] || changes[SESSIONS_KEY])) || (area === 'session' && changes[CURRENT_KEY])) {
      void refreshSessions();
    }
    if (area === 'local' && changes[STORAGE_KEYS.blaze]) {
      hasBlazeKey = Boolean(String(changes[STORAGE_KEYS.blaze].newValue ?? '').trim());
      renderControl();
    }
  });
  chrome.runtime.onMessage.addListener((msg: Msg) => {
    // the web console sent a session with its documents; the background replaced the library
    if (msg.type === 'mm.docs.changed') void refreshDocs();
    if (msg.type === 'mm.drafts.changed') void refreshSessions();
    if (msg.type === 'mm.event' && msg.event.kind === 'partial') {
      partial = msg.event.text;
      renderControl();
    }
    return false;
  });
  setInterval(() => { if (running()) renderControl(); }, 1_000);
}

void init();
