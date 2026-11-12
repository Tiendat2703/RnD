// Content script chạy trong trang web console MeetMate. Là kênh duy nhất giữa
// web và extension: window.postMessage ↔ chrome.runtime. Không có khóa API nào
// đi qua đây, và chỉ các loại lệnh của `WebToExt` được chuyển tiếp.
import {
  BRIDGE_EXT,
  BRIDGE_WEB,
  type Envelope,
  type ExtToWeb,
  type WebToExt,
} from '../../../../lib/bridgeProtocol';
import type { Msg } from './messages';

const ALLOWED: WebToExt['type'][] = ['ping', 'session.prepare', 'session.stop', 'sessions.list', 'sessions.delete', 'sessions.markSynced'];

function toWeb(payload: ExtToWeb) {
  const envelope: Envelope<ExtToWeb> = { source: BRIDGE_EXT, payload };
  window.postMessage(envelope, window.location.origin);
}

window.addEventListener('message', async (e) => {
  if (e.source !== window || e.origin !== window.location.origin) return;
  const data = e.data as Envelope<WebToExt> | undefined;
  if (!data || data.source !== BRIDGE_WEB || !data.payload) return;
  if (!ALLOWED.includes(data.payload.type)) return;
  try {
    const reply = (await chrome.runtime.sendMessage({
      type: 'meetmate.web',
      msg: data.payload,
    } satisfies Msg)) as ExtToWeb | undefined;
    if (reply) toWeb(reply);
  } catch {
    // extension vừa được nạp lại: trang phải tải lại để có kết nối mới
  }
});

chrome.runtime.onMessage.addListener((msg: Msg) => {
  if (msg.type === 'meetmate.toweb') toWeb(msg.event);
});
