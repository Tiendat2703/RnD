import { describe, expect, it, vi } from 'vitest';
import { BlazeStt, blazeSttUrl, isFatalSttError, type SttSocket } from './stt';

function fakeSocket() {
  const sent: (string | ArrayBufferLike)[] = [];
  const socket: SttSocket = {
    binaryType: 'blob',
    onopen: null, onclose: null, onerror: null, onmessage: null,
    readyState: 0,
    send: data => { sent.push(data); },
    close: () => { socket.readyState = 3; },
  };
  const emit = (event: object) => socket.onmessage?.({ data: JSON.stringify(event) });
  const open = () => { socket.readyState = 1; socket.onopen?.(); };
  return { socket, sent, emit, open };
}

function setup() {
  const fake = fakeSocket();
  const finals: string[] = [];
  const errors: string[] = [];
  const fatal: boolean[] = [];
  const partials: string[] = [];
  let url = '';
  const stt = new BlazeStt({
    apiKey: 'k',
    onFinal: text => finals.push(text),
    onPartial: text => partials.push(text),
    onError: (message, isFatal) => { errors.push(message); fatal.push(isFatal); },
    socketFactory: u => { url = u; return fake.socket; },
  });
  const ready = async () => {
    const connected = stt.connect();
    fake.open();
    fake.emit({ type: 'successful-authentication' });
    fake.emit({ type: 'ready' });
    await connected;
  };
  return { stt, fake, finals, errors, fatal, partials, url: () => url, ready };
}

describe('blazeSttUrl', () => {
  it('points at the legacy realtime endpoint and never carries the key', () => {
    expect(blazeSttUrl()).toMatch(/^wss:\/\/.+\/v1\/stt\/realtime$/);
  });
});

describe('BlazeStt', () => {
  it('sends the token handshake on open and connects on ready', async () => {
    const { fake, url, ready } = setup();
    await ready();
    expect(url()).not.toContain('k');
    expect(JSON.parse(String(fake.sent[0]))).toEqual({ token: 'k', language: 'vi', model: 'stt-stream-1.5' });
    expect(fake.socket.binaryType).toBe('arraybuffer');
  });

  it('reports trimmed finals and ignores partials and empty text', async () => {
    const { fake, finals, errors, ready } = setup();
    await ready();
    fake.emit({ type: 'partial', text: 'Xin' });
    fake.emit({ type: 'final', text: '  Xin chào  ' });
    fake.emit({ type: 'final', text: '   ' });
    expect(finals).toEqual(['Xin chào']);
    expect(errors).toEqual([]);
  });

  it('reports provider and billing errors', async () => {
    const { fake, errors, ready } = setup();
    await ready();
    fake.emit({ type: 'error', text: 'bad audio' });
    fake.emit({ type: 'insufficient-credits' });
    expect(errors).toEqual(['Blaze STT: bad audio', 'Blaze STT: insufficient-credits']);
  });

  it('rejects connect when the socket closes before ready', async () => {
    const { stt, fake } = setup();
    const connected = stt.connect();
    fake.open();
    fake.socket.onclose?.();
    await expect(connected).rejects.toThrow('Mất kết nối Blaze STT');
  });

  it('reports an unexpected close once, and only the provider error if one came first', async () => {
    const a = setup();
    await a.ready();
    a.fake.socket.onclose?.();
    expect(a.errors).toEqual(['Mất kết nối Blaze STT']);
    const b = setup();
    await b.ready();
    b.fake.emit({ type: 'error', text: 'quota' });
    b.fake.socket.onclose?.();
    expect(b.errors).toEqual(['Blaze STT: quota']);
  });

  it('drops frames before ready and sends only the frame bytes after', async () => {
    const { stt, fake, ready } = setup();
    stt.sendFrame(new Int16Array([1, 2]));
    expect(fake.sent).toEqual([]);
    await ready();
    const backing = new Int16Array([9, 3, 4]);
    stt.sendFrame(backing.subarray(1));
    expect(new Int16Array(fake.sent[1] as ArrayBuffer)).toEqual(new Int16Array([3, 4]));
  });

  it('rejects connect on an error or billing state before ready, without onError', async () => {
    const { stt, fake, errors } = setup();
    const connected = stt.connect();
    fake.open();
    fake.emit({ type: 'insufficient-credits' });
    await expect(connected).rejects.toThrow('Blaze STT: insufficient-credits');
    expect(fake.socket.readyState).toBe(3);
    fake.socket.onclose?.();
    expect(errors).toEqual([]);
  });

  it('rejects connect on an unexpected message before ready', async () => {
    const { stt, fake } = setup();
    const connected = stt.connect();
    fake.open();
    fake.emit({ type: 'final', text: 'x' });
    await expect(connected).rejects.toThrow('final');
  });

  it('rejects connect when ready never arrives', async () => {
    vi.useFakeTimers();
    try {
      const { stt, fake } = setup();
      const connected = stt.connect();
      fake.open();
      fake.emit({ type: 'successful-authentication' });
      vi.advanceTimersByTime(10_000);
      await expect(connected).rejects.toThrow('Blaze STT không phản hồi');
      expect(fake.socket.readyState).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes the socket after an error during the session', async () => {
    const { fake, ready } = setup();
    await ready();
    fake.emit({ type: 'error', text: 'quota' });
    expect(fake.socket.readyState).toBe(3);
  });

  it('close stops frames at once but keeps reading finals for one second', async () => {
    vi.useFakeTimers();
    try {
      const { stt, fake, finals, errors, ready } = setup();
      await ready();
      stt.close();
      stt.sendFrame(new Int16Array([1]));
      expect(fake.sent).toHaveLength(1); // the handshake only
      fake.emit({ type: 'final', text: 'Câu cuối' });
      expect(fake.socket.readyState).toBe(1);
      vi.advanceTimersByTime(1_000);
      expect(fake.socket.readyState).toBe(3);
      fake.socket.onclose?.();
      expect(finals).toEqual(['Câu cuối']);
      expect(errors).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes trimmed partials to onPartial without treating them as finals', async () => {
    const { fake, finals, partials, ready } = setup();
    await ready();
    fake.emit({ type: 'partial', text: ' Xin ' });
    fake.emit({ type: 'partial', text: '' });
    expect(partials).toEqual(['Xin']);
    expect(finals).toEqual([]);
  });

  it('marks billing errors fatal and plain server errors and drops retryable', async () => {
    const { fake, fatal, ready } = setup();
    await ready();
    fake.emit({ type: 'error', text: 'bad audio' });
    const b = setup();
    await b.ready();
    b.fake.emit({ type: 'insufficient-credits' });
    const c = setup();
    await c.ready();
    c.fake.socket.onclose?.();
    expect([...fatal, ...b.fatal, ...c.fatal]).toEqual([false, true, false]);
  });

  it('rejects connect with a fatal error when the handshake is refused, and a retryable one on drop', async () => {
    const a = setup();
    const refused = a.stt.connect();
    a.fake.open();
    a.fake.emit({ type: 'error', text: 'invalid token' });
    const reason = await refused.catch(e => e);
    expect(isFatalSttError(reason)).toBe(true);
    const b = setup();
    const dropped = b.stt.connect();
    b.fake.open();
    b.fake.socket.onclose?.();
    expect(isFatalSttError(await dropped.catch(e => e))).toBe(false);
  });
});
