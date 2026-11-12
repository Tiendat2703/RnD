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

const STATE_LABEL: Record<View['state'], string> = {
  idle: 'Chưa chạy', starting: 'Đang kết nối', live: 'Đang nghe', reconnecting: 'Đang kết nối lại', error: 'Lỗi',
};
const KIND_LABEL: Record<Card['kind'], string> = {
  contradiction: 'Có thể lệch tài liệu', answer: 'Trả lời từ tài liệu', not_in_doc: 'Tài liệu không có', research: 'Nguồn tham khảo',
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
  const chatText = c.repeat ? 'Đã báo trước đó, không gửi lại vào chat' : `${CHAT_LABEL[c.chat]}${c.chatError ? `: ${esc(c.chatError)}` : ''}`;
  const chat = `<footer class="chat ${c.chat}">${chatText}</footer>`;
  return `<article class="card ${c.kind}">
    <header><span class="chip">${KIND_LABEL[c.kind]}${c.mode === 'ask' ? ' · được hỏi' : ''}</span><time>${time(c.at)}</time></header>
    ${said}${title}<p class="${c.kind === 'research' ? '' : 'text'}">${esc(c.text)}</p>${quote}${links}${chat}
  </article>`;
}

function renderCards(): void {
  $('cards').innerHTML = view.cards.map(renderCard).join('');
  $('cards-empty').hidden = view.cards.length > 0;
  $('card-count').textContent = view.cards.length ? `(${view.cards.length})` : '';
}

function renderTranscript(): void {
  const list = $('transcript');
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
  list.innerHTML = view.transcript.map(l => `<li><time>${time(l.at)}</time> ${esc(l.text)}</li>`).join('');
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
}

async function choose(id: string | null): Promise<void> {
  const reply = (await send({ type: 'mm.selectDraft', id })) as SelectReply | undefined;
  if (!reply?.ok) say('error', reply?.error ?? 'Không đổi được phiên');
  await refreshSessions();
  await refreshDocs();
}

function render(): void {
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
  $('toggle').addEventListener('click', () => void (running() ? stop() : start()));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes[STORAGE_KEYS.view]) {
      const next = (changes[STORAGE_KEYS.view].newValue as View | undefined) ?? EMPTY_VIEW;
      if (next.transcript.length !== view.transcript.length) partial = '';
      // A newer message from the background replaces whatever the panel said itself.
      if (next.state !== view.state || next.notice?.at !== view.notice?.at) localNotice = null;
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
