// lib/extensionBridge.ts — nói chuyện với extension MeetMate từ trang web.
//
// Kênh duy nhất là window.postMessage tới content script của extension. Nếu
// extension chưa cài (hoặc trang được mở trước khi cài), không ai trả lời và
// `pingExtension` trả về null — web console không có cách nào khác để biết, nên
// không bao giờ giả vờ rằng đã phát hiện nó.
import {
  BRIDGE_EXT,
  BRIDGE_WEB,
  type Envelope,
  type ExtInfo,
  type ExtToWeb,
  type WebToExt,
} from "./bridgeProtocol";

export function sendToExtension(msg: WebToExt): void {
  if (typeof window === "undefined") return;
  const envelope: Envelope<WebToExt> = { source: BRIDGE_WEB, payload: msg };
  window.postMessage(envelope, window.location.origin);
}

/** Nghe mọi sự kiện extension gửi về; trả về hàm huỷ đăng ký. */
export function onExtensionEvent(handler: (event: ExtToWeb) => void): () => void {
  const listener = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    const data = e.data as Envelope<ExtToWeb> | undefined;
    if (!data || data.source !== BRIDGE_EXT || !data.payload) return;
    handler(data.payload);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

/** Hỏi extension còn sống không. null = không ai trả lời trong `timeoutMs`. */
export function pingExtension(timeoutMs = 1200): Promise<ExtInfo | null> {
  return new Promise((resolve) => {
    let done = false;
    const off = onExtensionEvent((ev) => {
      if (ev.type !== "pong" || done) return;
      done = true;
      off();
      window.clearTimeout(timer);
      resolve(ev.info);
    });
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      off();
      resolve(null);
    }, timeoutMs);
    sendToExtension({ type: "ping" });
  });
}
