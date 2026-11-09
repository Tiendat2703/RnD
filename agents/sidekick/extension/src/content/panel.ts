// Panel MeetMate nằm ngay trong trang Google Meet (shadow DOM, không đụng CSS của
// Meet). Đây là nơi người dùng theo dõi phiên. Nó nổi trên lưới video tối của Meet
// nên luôn dùng theme tối; mọi thứ khác — token, hàng sáu bước, dải cảnh báo, giải
// phẫu bài đăng — là cùng một bộ với popup và web console (MEETMATE-DESIGN.md).
//
// Nguồn được vẽ bằng `toChatPosts` của web (lib/formatChat.ts), nên thẻ ở đây và tin
// thật gõ vào chat Meet không thể lệch nhau về chữ hay số ký tự.
import type { ExtToWeb } from '../../../../../lib/bridgeProtocol';
import { stampFromMs, toChatPosts } from '../../../../../lib/formatChat';
import {
  EVIDENCE_LABEL,
  KIND_LABEL,
  memoryOf,
  stampOf,
  type EvidenceStatus,
  type KnowledgeCard,
} from '../../../../../lib/evidence';
import type { PipelineStage, ResearchResult } from '../../../../../lib/types';
import type { Msg } from '../messages';
import { installFonts } from '../ui/fonts';
import { icon } from '../ui/icons';
import { renderStages } from '../ui/stages';
import { classify } from '../ui/status';
import theme from '../ui/theme.css';

interface TopicView {
  name: string;
  query: string;
  result: ResearchResult | null;
  /** số tin của chủ đề này đã thật sự vào chat Meet */
  posted: number;
}

interface LineView {
  text: string;
  atMs: number;
}

interface State {
  sessionId: string | null;
  /** phiên còn mở, kể cả khi đang chạy kém */
  active: boolean;
  /** chế độ thử: dữ liệu giả, nói rõ trên panel */
  mock: boolean;
  cards: KnowledgeCard[];
  votes: Record<string, 'useful' | 'not-useful'>;
  visible: boolean;
  collapsed: boolean;
  status: string;
  stage: PipelineStage | null;
  lines: LineView[];
  topics: TopicView[];
  error: string | null;
}

const MAX_LINES = 4;
const MAX_TOPICS = 3;
const MAX_CARDS = 6;
/** Quyết định và phụ thuộc chỉ vào dòng tóm tắt bối cảnh phiên; panel hiện phần cần người họp xem. */
const SHOWN_KINDS = ['claim', 'question', 'assumption'];
const state: State = {
  sessionId: null,
  active: false,
  mock: false,
  cards: [],
  votes: {},
  visible: false,
  collapsed: false,
  status: '',
  stage: null,
  lines: [],
  topics: [],
  error: null,
};

const PANEL_CSS = `
  :host { all: initial; }
  .panel { box-sizing: border-box; position: fixed; top: 16px; left: 16px; z-index: 2147483000; width: 360px;
    max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden;
    background: rgba(22, 28, 34, 0.94); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    border: 1px solid var(--hairline); border-radius: 16px; }
  .panel__head { display: flex; align-items: center; gap: 8px; padding: 12px; }
  .panel__head .grow { flex: 1 1 auto; }
  .panel__stages { padding: 0 12px 12px; overflow-x: auto; }
  .panel__body { display: grid; gap: 12px; padding: 4px 12px 12px; overflow-y: auto; overscroll-behavior: contain; align-content: start; }
  .panel__foot { padding: 12px; border-top: 1px solid var(--hairline); }
  .section { display: grid; gap: 4px; }
  .line { display: grid; grid-template-columns: 40px 1fr; gap: 8px; }
  .line time { font: 400 12px/20px var(--font-mono); color: var(--muted); }
  .line span { overflow-wrap: anywhere; }
  .section .ev-card + .ev-card { margin-top: 8px; }
  .topic { display: grid; gap: 8px; }
  .topic__title { margin: 0; font: 600 16px/24px var(--font-display); overflow-wrap: anywhere; }
`;

let host: HTMLElement | null = null;
let root: ShadowRoot | null = null;

function ensureRoot(): ShadowRoot {
  if (root) return root;
  installFonts(); // @font-face phải nằm ở tài liệu, không nằm trong shadow root
  host = document.createElement('div');
  host.id = 'meetmate-panel';
  root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = theme + PANEL_CSS;
  root.append(style);
  document.documentElement.append(host);
  return root;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const safeUrl = (u: string) => /^https?:\/\//i.test(u);

function iconButton(name: 'minus' | 'expand' | 'close', label: string, onClick: () => void) {
  const b = el('button', 'icon-btn');
  b.type = 'button';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.append(icon(name));
  b.addEventListener('click', onClick);
  return b;
}

/** Knowledge Card: nhận định + trạng thái bằng chứng + trích dẫn tài liệu (cùng giải phẫu bài đăng). */
function renderCard(card: KnowledgeCard): HTMLElement {
  const art = el('article', 'ev-card');
  const head = el('div', 'ev-card__head');
  head.append(el('span', 'eyebrow eyebrow--prov', `MeetMate: ${KIND_LABEL[card.kind]}`));
  if (card.error) {
    const chip = el('span', 'ev-chip ev-chip--error', '! Lỗi xử lý');
    head.append(chip);
  } else if (card.status) {
    const chip = el('span', `ev-chip ev-chip--${card.status}`);
    chip.append(icon(`ev-${card.status}` as `ev-${EvidenceStatus}`), document.createTextNode(EVIDENCE_LABEL[card.status]));
    head.append(chip);
  }
  head.append(el('time', 'ev-card__time', stampOf(card.atMs)));
  art.append(head);
  art.append(el('p', 'ev-card__quote', `“${card.quote}”`));
  art.append(el('p', 'ev-card__summary', card.summary));
  for (const c of card.citations) {
    const cite = el('div', 'ev-cite');
    cite.append(el('span', 'ev-cite__doc', c.doc), el('span', 'ev-cite__loc', c.locator), el('span', 'ev-cite__excerpt', c.excerpt));
    art.append(cite);
  }
  if (card.status) {
    const foot = el('div', 'ev-card__foot');
    for (const [vote, label] of [['useful', 'Hữu ích'], ['not-useful', 'Không hữu ích']] as const) {
      const b = el('button', 'ev-fb', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.votes[card.id] === vote));
      // bản mẫu: chỉ ghi nhận trong panel. Khi có backend, gửi `meetmate.feedback` cho background.
      b.addEventListener('click', () => {
        state.votes[card.id] = vote;
        render();
      });
      foot.append(b);
    }
    art.append(foot);
  }
  return art;
}

function memoryLine(cards: KnowledgeCard[]): string {
  const m = memoryOf(cards);
  const parts = [
    m.decisions.length ? `${m.decisions.length} quyết định` : '',
    m.dependencies.length ? `${m.dependencies.length} phụ thuộc` : '',
    m.assumptions.length ? `${m.assumptions.length} giả định` : '',
  ].filter(Boolean);
  return parts.length ? `Đã ghi vào bối cảnh phiên: ${parts.join(' · ')}` : '';
}

function renderTopic(t: TopicView, running: boolean): HTMLElement {
  const wrap = el('section', 'topic');
  const head = el('div');
  head.append(el('h4', 'topic__title', t.name));
  head.append(el('div', 'caption', t.query));
  wrap.append(head);

  if (!t.result) {
    wrap.append(el('div', 'note', 'Đang tìm nguồn…'));
    return wrap;
  }
  const posts = toChatPosts(t.result);
  const total = posts.length - 1; // không tính tin chủ đề
  posts.forEach((p, i) => {
    const sent = i < t.posted;
    const post = el('article', `post${sent ? '' : ' post--unsent'}`);
    post.append(el('div', 'eyebrow eyebrow--prov', p.eyebrow));
    post.append(el('p', 'post__title', p.title));
    if (p.url) {
      if (safeUrl(p.url)) {
        const a = el('a', 'post__url', p.url);
        a.href = p.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        post.append(a);
      } else {
        post.append(el('span', 'post__url', p.url));
      }
    }
    if (p.why) post.append(el('p', 'post__why', p.why));
    const where = i === 0 ? 'tóm tắt' : `nguồn ${i}/${total}`;
    const sentence = sent ? 'đã vào chat' : running ? 'chưa gửi vào chat' : 'không gửi';
    post.append(el('div', 'post__foot', `${where} · ${p.chars} ký tự · ${sentence}`));
    wrap.append(post);
  });
  return wrap;
}

function render() {
  const shadow = ensureRoot();
  shadow.querySelector('.panel')?.remove();
  if (!state.visible) return;

  const kind = classify(state.error ?? state.status);
  const running = state.active;

  const box = el('div', 'mm mm--dark panel');
  box.setAttribute('role', 'complementary');
  box.setAttribute('aria-label', 'MeetMate');

  const head = el('div', 'panel__head');
  head.append(el('span', 'wordmark', 'MeetMate'));
  const pill = el('span', `pill${running ? ' pill--live' : ''}`);
  pill.textContent = running ? 'Đang nghe' : kind === 'idle' ? 'Đã dừng' : 'Chưa nghe';
  head.append(pill);
  if (state.mock) head.append(el('span', 'pill pill--sample', 'Dữ liệu mẫu'));
  head.append(el('span', 'grow'));
  head.append(
    iconButton(state.collapsed ? 'expand' : 'minus', state.collapsed ? 'Mở rộng' : 'Thu gọn', () => {
      state.collapsed = !state.collapsed;
      render();
    }),
    iconButton('close', 'Ẩn panel', () => {
      state.visible = false;
      render();
    }),
  );
  box.append(head);

  if (!state.collapsed) {
    if (running) {
      const strip = el('div', 'panel__stages');
      strip.append(renderStages(state.stage ?? 'listening'));
      box.append(strip);
    }

    const body = el('div', 'panel__body');
    const message = state.error ?? state.status;
    if (kind === 'warn' || kind === 'error') {
      const band = el('div', `band band--${kind}`);
      band.append(icon(kind === 'warn' ? 'warn' : 'error'), document.createTextNode(message));
      body.append(band);
    } else if (kind === 'info' || kind === 'idle') {
      const note = el('div', 'note');
      note.append(icon('info'), document.createTextNode(message));
      body.append(note);
    }

    if (state.lines.length > 0) {
      const sec = el('section', 'section');
      sec.append(el('div', 'eyebrow', 'Vừa nghe'));
      for (const l of state.lines) {
        const row = el('div', 'line');
        row.append(el('time', undefined, stampFromMs(l.atMs)), el('span', undefined, l.text));
        sec.append(row);
      }
      body.append(sec);
    } else if (running) {
      body.append(
        el('div', 'note', 'Chưa có dòng nào. MeetMate nghe tab Meet và micro của bạn.'),
      );
    }

    if (state.cards.length > 0) {
      const sec = el('section', 'section');
      sec.append(el('div', 'eyebrow', 'Thẻ đối chiếu'));
      const note = memoryLine(state.cards);
      if (note) sec.append(el('div', 'caption', note));
      const shown = state.cards.filter((c) => SHOWN_KINDS.includes(c.kind));
      for (const c of shown.slice(-MAX_CARDS).reverse()) sec.append(renderCard(c));
      body.append(sec);
    }

    for (const t of state.topics.slice(-MAX_TOPICS).reverse()) body.append(renderTopic(t, running));
    box.append(body);

    if (running) {
      const foot = el('div', 'panel__foot');
      const stop = el('button', 'btn');
      stop.type = 'button';
      stop.append(icon('stop'), document.createTextNode('Dừng nghe'));
      stop.addEventListener('click', () => {
        void chrome.runtime.sendMessage({ type: 'meetmate.stop' } satisfies Msg);
      });
      foot.append(stop);
      box.append(foot);
    }
  }
  shadow.append(box);
}

/** Phiên đang mở (kể cả chạy kém): content script chỉ canh "đã rời họp" khi true. */
export function isActive(): boolean {
  return state.active;
}

/** Cập nhật panel theo sự kiện extension; ẩn/hiện do trạng thái phiên quyết định. */
export function applyEvent(ev: ExtToWeb): void {
  switch (ev.type) {
    case 'status':
      if (ev.sessionId !== null && ev.sessionId !== state.sessionId) {
        // phiên mới: bỏ nội dung của phiên trước
        state.sessionId = ev.sessionId;
        state.lines = [];
        state.topics = [];
        state.cards = [];
        state.votes = {};
        state.stage = null;
        state.error = null;
      }
      state.status = ev.status;
      state.active = ev.active ?? ev.running;
      if (ev.mock !== undefined) state.mock = ev.mock;
      if (ev.sessionId !== null || ev.running) state.visible = true;
      if (ev.running) state.error = null;
      break;
    case 'line':
      state.lines = [...state.lines, { text: ev.line.text, atMs: ev.line.atMs }].slice(-MAX_LINES);
      break;
    case 'topic':
      state.topics.push({ name: ev.topic.topic, query: ev.topic.query, result: null, posted: 0 });
      break;
    case 'card':
      if (!state.cards.some((c) => c.id === ev.card.id)) state.cards.push(ev.card);
      break;
    case 'stage':
      state.stage = ev.stage;
      break;
    case 'research': {
      const t = state.topics.at(-1);
      if (t) t.result = ev.result;
      break;
    }
    case 'posted': {
      const t = state.topics.at(-1);
      if (t) t.posted += 1;
      break;
    }
    case 'error':
      state.error = ev.message;
      state.visible = true;
      break;
    case 'ended':
      state.stage = null;
      state.active = false;
      state.status = 'Phiên đã kết thúc và được lưu';
      state.error = null;
      // panel tự ẩn sau ít giây để không nằm lại trên trang sau khi họp xong
      window.setTimeout(() => {
        if (!state.active) {
          state.visible = false;
          render();
        }
      }, 8000);
      break;
    default:
      return;
  }
  render();
}
