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

const OPEN = 1;

export function blazeSttUrl(apiKey: string): string {
  const q = new URLSearchParams({
    model: BLAZE_STT_MODEL,
    language: 'vi',
    api_key: apiKey,
  });
  return `${BLAZE_STT_URL}?${q.toString()}`;
}

export class BlazeStt {
  private socket: SttSocket | null = null;
  private closing = false;

  constructor(
    private opts: {
      apiKey: string;
      onFinal: (text: string) => void;
      onError: (message: string) => void;
      socketFactory?: (url: string) => SttSocket;
    },
  ) {}

  connect(): Promise<void> {
    const url = blazeSttUrl(this.opts.apiKey);
    const socket = this.opts.socketFactory
      ? this.opts.socketFactory(url)
      : (new WebSocket(url) as unknown as SttSocket);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    return new Promise<void>((resolve, reject) => {
      let ready = false;
      socket.onmessage = (e) => {
        if (typeof e.data !== 'string') return;
        let msg: { type?: string; text?: string; error?: { message?: string } };
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        if (msg.type === 'session.created') {
          ready = true;
          resolve();
        } else if (msg.type === 'transcript.text.done') {
          const text = (msg.text ?? '').trim();
          if (text) this.opts.onFinal(text);
        } else if (msg.type === 'error') {
          const m = `Blaze STT: ${msg.error?.message ?? 'lỗi không rõ'}`;
          this.opts.onError(m);
          if (!ready) reject(new Error(m));
        }
      };
      socket.onerror = () => {
        if (!ready) reject(new Error('Mất kết nối Blaze STT'));
      };
      socket.onclose = () => {
        if (!this.closing) this.opts.onError('Mất kết nối Blaze STT');
        if (!ready) reject(new Error('Mất kết nối Blaze STT'));
      };
    });
  }

  sendFrame(frame: Int16Array): void {
    if (!this.socket || this.socket.readyState !== OPEN) return;
    this.socket.send(frame.buffer);
  }

  close(): void {
    this.closing = true;
    if (this.socket?.readyState === OPEN) {
      this.socket.send('{"type":"input_audio.done"}');
    }
    this.socket?.close();
  }
}
