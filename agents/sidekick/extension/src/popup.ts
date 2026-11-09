import type { PipelineStage } from '../../../../lib/types';
import {
  MOCK_KEY,
  RUN_KEY,
  SESSION_KEY,
  STAGE_KEY,
  STATUS_KEY,
  type Msg,
  type SessionDraft,
} from './messages';
import { icon } from './ui/icons';
import { installFonts } from './ui/fonts';
import { renderStages } from './ui/stages';
import { classify } from './ui/status';
import theme from './ui/theme.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const blaze = $<HTMLInputElement>('blaze');
const exa = $<HTMLInputElement>('exa');
const mock = $<HTMLInputElement>('mock');
const toggle = $<HTMLButtonElement>('toggle');
const keysEl = $('keys');
const mockEl = document.querySelector('label.mock') as HTMLElement;
const pill = $('pill');
const stagesEl = $('stages');
const statusEl = $('status');
const sessionEl = $('session');
const sessionTitle = $('session-title');

const style = document.createElement('style');
style.textContent = theme;
document.head.append(style);
installFonts();

// ---- trạng thái hiển thị ----
let status = '';
let stage: PipelineStage | null = null;
/** thông báo do popup tự đặt (thiếu khóa, sai tab…) — thắng `status` cho tới lần đổi trạng thái sau */
let notice: string | null = null;

/** phiên đang mở — không suy từ dòng trạng thái, vì cảnh báo giữa phiên ghi đè dòng đó */
let runFlag = false;
const live = () => runFlag;
const busy = () => !runFlag && classify(status) === 'busy';
const active = () => live() || busy();

function render() {
  const kind = classify(notice ?? status);

  // pill: chỉ "đang nghe" mới đặc màu petrol
  pill.className = `pill${live() ? ' pill--live' : ''}`;
  pill.textContent = live() ? 'Đang nghe' : busy() ? 'Đang khởi động' : 'Chưa nghe';

  stagesEl.replaceChildren(renderStages(live() ? (stage ?? 'listening') : null));

  // dải trạng thái: vàng = chạy kém, đỏ = bị chặn, ghi chú = hướng dẫn
  statusEl.replaceChildren();
  const text = notice ?? status;
  if (kind === 'warn' || kind === 'error') {
    const band = document.createElement('div');
    band.className = `band band--${kind}`;
    band.append(icon(kind === 'warn' ? 'warn' : 'error'), document.createTextNode(text));
    statusEl.append(band);
  } else if (kind === 'info' || (kind === 'idle' && !text)) {
    const note = document.createElement('div');
    note.className = 'note';
    note.append(
      icon('info'),
      document.createTextNode(
        kind === 'info' ? text : 'Mở một tab Google Meet đang họp, rồi bấm Bắt đầu nghe.',
      ),
    );
    statusEl.append(note);
  }

  toggle.dataset.running = String(active());
  toggle.disabled = busy();
  toggle.replaceChildren(
    icon(active() ? 'stop' : 'play'),
    document.createTextNode(busy() ? 'Đang khởi động…' : active() ? 'Dừng nghe' : 'Bắt đầu nghe'),
  );

  keysEl.hidden = mock.checked || active(); // chế độ thử không dùng khóa; đang nghe thì không sửa khóa
  mockEl.hidden = active(); // đổi chế độ giữa phiên không có nghĩa
}

function setSession(s: SessionDraft | null) {
  sessionEl.hidden = !s;
  sessionTitle.textContent = s?.title ?? '';
}

async function init() {
  const saved = (await chrome.storage.local.get(['blazeApiKey', 'exaApiKey', MOCK_KEY])) as {
    blazeApiKey?: string;
    exaApiKey?: string;
    [MOCK_KEY]?: boolean;
  };
  blaze.value = saved.blazeApiKey ?? '';
  exa.value = saved.exaApiKey ?? '';
  mock.checked = saved[MOCK_KEY] === true;

  const stored = (await chrome.storage.session.get([STATUS_KEY, STAGE_KEY, SESSION_KEY, RUN_KEY])) as {
    [STATUS_KEY]?: string;
    [STAGE_KEY]?: PipelineStage;
    [SESSION_KEY]?: SessionDraft;
    [RUN_KEY]?: boolean;
  };
  runFlag = stored[RUN_KEY] === true;
  status = stored[STATUS_KEY] ?? '';
  stage = stored[STAGE_KEY] ?? null;
  setSession(stored[SESSION_KEY] ?? null);
  render();
}

mock.addEventListener('change', () => {
  void chrome.storage.local.set({ [MOCK_KEY]: mock.checked });
  notice = null;
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  if (changes[SESSION_KEY]) setSession((changes[SESSION_KEY].newValue as SessionDraft) ?? null);
  if (changes[RUN_KEY]) runFlag = changes[RUN_KEY].newValue === true;
  if (changes[STAGE_KEY]) stage = (changes[STAGE_KEY].newValue as PipelineStage | undefined) ?? null;
  if (changes[STATUS_KEY]) {
    status = (changes[STATUS_KEY].newValue as string | undefined) ?? '';
    notice = null;
  }
  render();
});

async function micGranted(): Promise<boolean> {
  try {
    const p = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return p.state === 'granted';
  } catch {
    return false;
  }
}

function tell(message: string) {
  notice = message;
  render();
}

toggle.addEventListener('click', async () => {
  if (active()) {
    await chrome.runtime.sendMessage({ type: 'meetmate.stop' } satisfies Msg);
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://meet.google.com/')) {
    tell('Hãy mở MeetMate trong tab Google Meet');
    return;
  }
  if (mock.checked) {
    // chế độ thử: không khóa, không micro, không ghi âm tab
    await chrome.runtime.sendMessage({
      type: 'meetmate.start',
      tabId: tab.id,
      streamId: '',
    } satisfies Msg);
    return;
  }
  const blazeApiKey = blaze.value.trim();
  const exaApiKey = exa.value.trim();
  if (!blazeApiKey || !exaApiKey) {
    tell('Thiếu khóa Blaze hoặc Exa');
    return;
  }
  await chrome.storage.local.set({ blazeApiKey, exaApiKey });
  if (!(await micGranted())) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission.html') });
    tell('Cấp quyền micro ở tab vừa mở rồi bấm Bắt đầu nghe lại');
    return;
  }
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  await chrome.runtime.sendMessage({
    type: 'meetmate.start',
    tabId: tab.id,
    streamId,
  } satisfies Msg);
});

void init();
