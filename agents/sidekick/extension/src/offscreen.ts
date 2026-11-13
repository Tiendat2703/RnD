import { createPresentationPipeline } from './presentation-pipeline';
import { ExaProvider } from '../../server/providers/exa';
import { startCapture } from './audio';
import { RESEARCH_MAX_SOURCES, RESEARCH_SOURCE_CHARS } from './config';
import { buildLibrary, type DocLibrary } from './doccheck';
import { listDocs } from './docs/store';
import { LiveStt, type SttState } from './live-stt';
import { blazeChat } from './llm';
import type { Msg, PanelEvent, RunState, Settings, StartReply } from './messages';
import { createPipeline, type Pipeline } from './pipeline';
import { createTeacherPipeline } from './teacher-pipeline';
import { BlazeStt } from './stt';

// The offscreen page owns the meeting: audio capture, STT and the pipeline. It only has
// chrome.runtime, so everything else goes through messages to the background.
const emit = (event: PanelEvent) => void chrome.runtime.sendMessage({ type: 'mm.event', event } satisfies Msg).catch(() => undefined);
const notice = (level: 'info' | 'error', message: string) => emit({ kind: 'notice', level, message });

async function loadLibrary(): Promise<DocLibrary | null> {
  const chunks = (await listDocs()).flatMap(d => d.chunks);
  return chunks.length ? buildLibrary(chunks) : null;
}

type Session = { stt: LiveStt; pipeline: Pipeline; stopAudio: () => void; presentation?: ReturnType<typeof createPresentationPipeline>; id?: string; revision?: string };
let session: Session | null = null;
let library: DocLibrary | null = null;
let settings: Settings | null = null;

const STATE: Record<SttState, RunState | null> = { connecting: 'starting', live: 'live', reconnecting: 'reconnecting', stopped: null };

function stop(): void {
  if (!session) return;
  const { stt, pipeline, stopAudio, presentation } = session;
  session = null;
  stopAudio();
  stt.stop(); // keeps reading the last finals for a second
  if(presentation) pipeline.stop();
  else setTimeout(()=>pipeline.stop(),1_200);
}

async function start(msg: Extract<Msg, { type: 'mm.offscreen.start' }>): Promise<StartReply> {
  stop();
  settings = msg.settings;
  library = await loadLibrary();
  if (!library) notice('info', msg.assistantType === 'teacher' ? 'Teacher chưa có tài liệu trong phiên. Bạn vẫn có thể hỏi kiến thức chung; hãy thêm slide hoặc giáo trình từ web để học theo file.' : 'Chưa có tài liệu: MeetMate chỉ nghe và research web, chưa đối chiếu được.');
  const chat = blazeChat(msg.blazeApiKey);
  const exaKey = msg.exaApiKey;
  const presentation = msg.presentation && msg.sessionId ? createPresentationPipeline({id:msg.sessionId,snapshot:msg.presentation,chat,emit}) : undefined;
  const pipeline = presentation ?? (msg.assistantType === 'teacher' ? createTeacherPipeline : createPipeline)({
    sessionTitle: msg.sessionTitle,
    chat,
    library: () => library,
    search: exaKey
      ? (q, s) => new ExaProvider(exaKey, undefined, { numResults: RESEARCH_MAX_SOURCES, maxCharacters: RESEARCH_SOURCE_CHARS }).search(q, s)
      : null,
    settings: () => settings!,
    emit,
    post: (cardId, messages) => void chrome.runtime.sendMessage({ type: 'mm.post', cardId, messages } satisfies Msg).catch(() => undefined),
  });
  if (settings.webResearch && !exaKey) notice('info', 'Chưa có khóa Exa: research web đang tắt.');

  const stt = new LiveStt({
    create: handlers => new BlazeStt({ apiKey: msg.blazeApiKey, ...handlers }),
    onFinal: text => pipeline.onFinal(text),
    onPartial: text => pipeline.onPartial(text),
    onState: (state, detail) => {
      const mapped = STATE[state];
      if (mapped && session) emit({ kind: 'state', state: mapped, detail });
    },
    onFatal: message => {
      stop();
      emit({ kind: 'state', state: 'error', detail: message });
    },
  });

  try {
    await stt.start();
    const stopAudio = await startCapture({
      streamId: msg.streamId,
      microphoneOnly: Boolean(presentation),
      workletUrl: chrome.runtime.getURL('pcm-worklet.js'),
      onFrame: frame => stt.sendFrame(frame),
      onNotice: message => notice('info', message),
      onEnded: () => {
        stop();
        emit({ kind: 'state', state: 'idle', detail: 'Tab Meet đã dừng phát âm thanh' });
      },
    });
    session = { stt, pipeline, stopAudio, presentation, id:msg.sessionId, revision:msg.presentation?.revision };
    emit({ kind: 'state', state: 'live' });
    return { ok: true };
  } catch (error) {
    stt.stop();
    pipeline.stop();
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: /Permission|NotAllowed/i.test(message) ? 'Chrome chưa cho phép ghi âm. Cấp quyền micro rồi bấm Bắt đầu lại.' : message };
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'mm.offscreen.start':
      void start(msg).then(sendResponse);
      return true;
    case 'mm.presentation.action':
      if (session?.id === msg.id && session.revision === msg.revision) session.presentation?.action(msg.action);
      return false;
    case 'mm.offscreen.stop':
      stop();
      return false;
    case 'mm.settings':
      settings = msg.settings;
      return false;
    case 'mm.verify':
      session?.pipeline.verify(msg.text);
      return false;
    case 'mm.docs.changed':
      if (session?.presentation) return false;
      void loadLibrary().then(lib => {
        library = lib;
        if (session) notice('info', `Đã cập nhật tài liệu cho cuộc họp (${lib?.chunks.length ?? 0} đoạn).`);
      });
      return false;
    default:
      return false;
  }
});
