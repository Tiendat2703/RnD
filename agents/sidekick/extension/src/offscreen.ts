import type { ExtToWeb } from '../../../../lib/bridgeProtocol';
import { ExaProvider } from '../../server/providers/exa';
import { startCapture } from './audio';
import { MAX_SOURCES } from './config';
import { runMock } from './mock';
import { blazeChat } from './llm';
import type { Msg } from './messages';
import { research } from './research';
import { MeetingSession } from './session';
import { BlazeStt } from './stt';
import { detectTopic } from './topic';

let teardown: (() => void) | null = null;

const status = (s: string) =>
  void chrome.runtime.sendMessage({ type: 'meetmate.status', status: s } satisfies Msg);
const emit = (event: ExtToWeb) =>
  void chrome.runtime.sendMessage({ type: 'meetmate.event', event } satisfies Msg);

async function start(
  streamId: string,
  blazeApiKey: string,
  exaApiKey: string,
  prefs: { sources: number; autoPost: boolean },
  mock: boolean,
) {
  teardown?.();
  if (mock) {
    // chế độ thử: không khóa, không ghi âm, không mạng, không gõ vào chat Meet
    const stopMock = runMock(emit);
    teardown = () => {
      stopMock();
      teardown = null;
    };
    status('Đang chạy');
    return;
  }
  const startedAt = Date.now();
  const maxSources = Math.max(1, Math.min(MAX_SOURCES, prefs.sources));
  let lineSeq = 0;

  const chat = blazeChat(blazeApiKey);
  const exa = new ExaProvider(exaApiKey);
  const session = new MeetingSession({
    detect: async (current, transcript, signal) => {
      emit({ type: 'stage', stage: 'topic' });
      const decision = await detectTopic(chat, current, transcript, signal);
      // session chỉ nghiên cứu khi có chủ đề mới; ngoài trường hợp đó pipeline về nghỉ
      const willResearch = !!decision?.topic && (current === null || decision.changed);
      if (!willResearch) emit({ type: 'stage', stage: null });
      return decision;
    },
    research: async (topic, signal) => {
      emit({ type: 'topic', topic });
      emit({ type: 'stage', stage: 'searching' });
      const result = await research(
        topic,
        {
          search: async (q, s) => {
            const found = await exa.search(q, s);
            emit({ type: 'stage', stage: 'writing' });
            return found;
          },
          chat,
        },
        signal,
      );
      if (!result) {
        emit({ type: 'stage', stage: null });
        return null;
      }
      const limited = { ...result, sources: result.sources.slice(0, maxSources) };
      emit({ type: 'research', result: limited });
      // tắt tự động gửi: kết quả hiện trên web nhưng không vào chat Meet
      emit({ type: 'stage', stage: prefs.autoPost ? 'posting' : null });
      return prefs.autoPost ? limited : null;
    },
    post: (text) =>
      void chrome.runtime.sendMessage({ type: 'meetmate.post', text } satisfies Msg),
    onError: (message) => {
      status(message);
      emit({ type: 'error', message });
    },
  });
  const stt = new BlazeStt({
    apiKey: blazeApiKey,
    onFinal: (text) => {
      emit({
        type: 'line',
        line: {
          id: `l-${++lineSeq}`,
          text,
          atMs: Date.now() - startedAt,
          // tab và micro đã trộn trước khi gửi STT nên không biết dòng này từ kênh nào
          source: 'mixed',
        },
      });
      session.onFinal(text);
    },
    onError: status,
  });
  try {
    await stt.connect();
    const stopAudio = await startCapture(
      streamId,
      (f) => stt.sendFrame(f),
      status,
      () => {
        // người dùng rời Meet hoặc đóng tab: kết thúc phiên
        teardown?.();
        emit({ type: 'ended', reason: 'meet-closed' });
      },
    );
    teardown = () => {
      session.stop();
      stt.close();
      stopAudio();
      teardown = null;
    };
    status('Đang chạy');
  } catch (e) {
    session.stop();
    stt.close();
    const message = e instanceof Error ? e.message : String(e);
    status(message);
    emit({ type: 'error', message });
  }
}

chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg.type === 'meetmate.offscreen.start') {
    void start(msg.streamId, msg.blazeApiKey, msg.exaApiKey, msg.prefs, msg.mock);
  } else if (msg.type === 'meetmate.offscreen.stop') {
    teardown?.();
  }
});
