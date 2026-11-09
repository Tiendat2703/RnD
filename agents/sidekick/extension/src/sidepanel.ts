import { FULL_DOC_MAX_CHARS } from './config';
import { ingestPdf } from './docs/ingest';
import { deleteDoc, listDocs, saveDoc, type StoredDoc } from './docs/store';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Card, type Msg, type Settings, type StartReply } from './messages';
import { EMPTY_VIEW, type View } from './view';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const send = (msg: Msg) => chrome.runtime.sendMessage(msg).catch(() => undefined);
const time = (at: number) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

let view: View = EMPTY_VIEW;
let docs: StoredDoc[] = [];
let busy: { name: string; error?: string }[] = [];
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
  const parts = [elapsed(), `${docs.length} tài liệu`, settings.postToChat ? 'gửi vào chat' : 'không gửi chat'].filter(Boolean);
  $('meta').textContent = parts.join(' · ');

  const notice = $('notice');
  const shown = localNotice
    ?? (view.state === 'error' && view.detail ? { level: 'error' as const, message: view.detail } : null)
    ?? (view.state === 'reconnecting' ? { level: 'info' as const, message: `Mất kết nối nhận dạng giọng nói, đang thử lại… ${view.detail ?? ''}` } : null)
    ?? (view.notice && running() ? view.notice : null)
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
  const chat = `<footer class="chat ${c.chat}">${CHAT_LABEL[c.chat]}${c.chatError ? `: ${esc(c.chatError)}` : ''}</footer>`;
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
      <button class="btn link" type="button" data-delete="${esc(d.id)}" aria-label="Xóa ${esc(d.name)}">Xóa</button>
    </li>`);
  const pending = busy.map(b => `<li class="${b.error ? 'bad' : 'busy'}"><span class="name">${esc(b.error ?? `Đang đọc ${b.name}…`)}</span>${b.error ? `<button class="btn link" type="button" data-dismiss="${esc(b.name)}">Đóng</button>` : ''}</li>`);
  $('docs').innerHTML = [...rows, ...pending].join('');
  $('doc-count').textContent = docs.length ? `(${docs.length})` : '';
  const chars = docs.reduce((n, d) => n + d.chars, 0);
  $('docs-mode').textContent = !docs.length ? ''
    : chars <= FULL_DOC_MAX_CHARS
      ? `${docs.reduce((n, d) => n + d.pageCount, 0)} trang. Toàn bộ tài liệu được dùng mỗi lần đối chiếu.`
      : 'Tài liệu lớn: mỗi lần đối chiếu, MeetMate chọn khoảng 20 đoạn liên quan nhất.';
}

function render(): void {
  renderControl();
  renderCards();
  renderTranscript();
  renderDocs();
}

async function refreshDocs(): Promise<void> {
  docs = await listDocs();
  render();
}

async function addFiles(files: FileList | File[]): Promise<void> {
  const list = [...files];
  busy.push(...list.map(f => ({ name: f.name })));
  renderDocs();
  for (const file of list) {
    const entry = busy.find(b => b.name === file.name && !b.error)!;
    try {
      await saveDoc(await ingestPdf(file));
      busy = busy.filter(b => b !== entry);
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
    }
    await refreshDocs();
  }
  void send({ type: 'mm.docs.changed' });
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/meet\.google\.com\/[a-z]+-[a-z]+-[a-z]+/.test(tab.url ?? '')) {
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
  } catch {
    return say('error', 'Chrome chưa cho phép MeetMate ghi âm tab này. Bấm biểu tượng MeetMate trên thanh công cụ khi đang ở tab Meet, rồi bấm Bắt đầu nghe.');
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
  ($('docs-box') as HTMLDetailsElement).open = docs.length === 0;
  ($('settings-box') as HTMLDetailsElement).open = !hasBlazeKey;
  render();

  bindKey('blaze-key', STORAGE_KEYS.blaze);
  bindKey('exa-key', STORAGE_KEYS.exa);
  $('post-chat').addEventListener('change', e => saveSettings({ ...settings, postToChat: (e.target as HTMLInputElement).checked }));
  $('web-research').addEventListener('change', e => saveSettings({ ...settings, webResearch: (e.target as HTMLInputElement).checked }));
  $('toggle').addEventListener('click', () => void (running() ? stop() : start()));

  const file = $<HTMLInputElement>('file');
  file.addEventListener('change', () => {
    if (file.files?.length) void addFiles(file.files);
    file.value = '';
  });
  const drop = $('drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files);
  });
  $('docs').addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const id = target.dataset.delete;
    if (id) void deleteDoc(id).then(refreshDocs).then(() => send({ type: 'mm.docs.changed' }));
    const dismissed = target.dataset.dismiss;
    if (dismissed) { busy = busy.filter(b => b.name !== dismissed); renderDocs(); }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes[STORAGE_KEYS.view]) {
      const next = (changes[STORAGE_KEYS.view].newValue as View | undefined) ?? EMPTY_VIEW;
      if (next.transcript.length !== view.transcript.length) partial = '';
      if (next.state !== view.state) localNotice = null;
      view = next;
      render();
    }
    if (area === 'local' && changes[STORAGE_KEYS.blaze]) {
      hasBlazeKey = Boolean(String(changes[STORAGE_KEYS.blaze].newValue ?? '').trim());
      renderControl();
    }
  });
  chrome.runtime.onMessage.addListener((msg: Msg) => {
    if (msg.type === 'mm.event' && msg.event.kind === 'partial') {
      partial = msg.event.text;
      renderControl();
    }
    return false;
  });
  setInterval(() => { if (running()) renderControl(); }, 1_000);
}

void init();
