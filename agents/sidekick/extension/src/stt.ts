import { BLAZE_STT_MODEL, BLAZE_STT_URL } from './config';

export type SttSocket = {
  binaryType: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  readyState: number;
  send(data: string | ArrayBufferLike): void;
  close(): void;
};

type SttEvent = { type?: string; text?: string };

const OPEN = 1;
const CONNECT_TIMEOUT_MS = 10_000;
// Chrome dispatches no message once a socket is CLOSING, so finals still in flight need this grace.
const CLOSE_GRACE_MS = 1_000;
// A billing state arrives as its own message type instead of an `error`.
const BILLING_TYPES = new Set(['insufficient-credits', 'invoice-not-paid', 'subscription-not-found', 'plan-upgrade-required']);

export function blazeSttUrl(): string {
  return BLAZE_STT_URL;
}

/**
 * Blaze legacy realtime STT: send {token, language, model}, wait for
 * successful-authentication then ready, stream PCM16 16 kHz mono, read partial/final.
 */
export class BlazeStt {
  private socket?: SttSocket;
  private ready = false;
  private closing = false;
  private errored = false;

  constructor(private readonly opts: {
    apiKey: string;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
    socketFactory?: (url: string) => SttSocket;
  }) {}

  connect(): Promise<void> {
    const factory = this.opts.socketFactory ?? (url => new WebSocket(url) as unknown as SttSocket);
    const socket = factory(blazeSttUrl());
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // The rejection carries the cause; the close that follows must not report it again.
        this.errored = true;
        socket.close();
        reject(new Error(message));
      };
      const timer = setTimeout(() => fail('Blaze STT không phản hồi'), CONNECT_TIMEOUT_MS);

      // The key travels in the first message, never in the URL.
      socket.onopen = () => socket.send(JSON.stringify({ token: this.opts.apiKey, language: 'vi', model: BLAZE_STT_MODEL }));
      socket.onmessage = ({ data }) => {
        let event: SttEvent;
        try {
          event = JSON.parse(String(data)) as SttEvent;
        } catch {
          return;
        }
        const fault = event.type === 'error' || BILLING_TYPES.has(event.type ?? '');
        if (!this.ready) {
          if (event.type === 'successful-authentication') return;
          if (event.type !== 'ready') return fail(fault ? `Blaze STT: ${event.text || event.type}` : `Blaze STT trả về '${event.type}' trước 'ready'`);
          this.ready = true;
          settled = true;
          clearTimeout(timer);
          resolve();
        } else if (event.type === 'final') {
          const text = event.text?.trim();
          if (text) this.opts.onFinal(text);
        } else if (fault) {
          this.errored = true;
          this.opts.onError(`Blaze STT: ${event.text || event.type}`);
          socket.close();
        }
      };
      socket.onclose = () => {
        this.ready = false;
        if (!settled) return fail('Mất kết nối Blaze STT');
        // The server's own error message already explains the close; do not overwrite it.
        if (!this.closing && !this.errored) this.opts.onError('Mất kết nối Blaze STT');
      };
    });
  }

  sendFrame(frame: Int16Array): void {
    if (!this.ready || this.closing || this.socket?.readyState !== OPEN) return;
    // Int16Array is little-endian on every platform Chrome runs on, matching PCM s16le.
    this.socket.send(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength));
  }

  /** The legacy protocol has no end message: closing the socket ends the session. */
  close(): void {
    if (this.closing) return;
    this.closing = true;
    setTimeout(() => this.socket?.close(), CLOSE_GRACE_MS);
  }
}
