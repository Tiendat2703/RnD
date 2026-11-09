import { describe, expect, it, vi } from 'vitest';
import { BlazeStt, blazeSttUrl, type SttSocket } from './stt';

function fakeSocket() {
  const sent: unknown[] = [];
  const socket: SttSocket = {
    binaryType: '',
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    readyState: 0,
    send: (d) => void sent.push(d),
    close: vi.fn(),
  };
  const emit = (obj: unknown) => socket.onmessage?.({ data: JSON.stringify(obj) });
  return { socket, sent, emit };
}

function setup() {
  const f = fakeSocket();
  const onFinal = vi.fn();
  const onError = vi.fn();
  const stt = new BlazeStt({
    apiKey: 'k',
    onFinal,
    onError,
    socketFactory: () => f.socket,
  });
  return { ...f, stt, onFinal, onError };
}

describe('BlazeStt', () => {
  it('builds the url with encoded key', () => {
    const url = blazeSttUrl('a&b');
    expect(url).toContain('model=blaze-stt-1.5-realtime');
    expect(url).toContain('language=vi');
    expect(url).toContain('api_key=a%26b');
  });

  it('resolves connect on session.created', async () => {
    const { stt, emit } = setup();
    const p = stt.connect();
    emit({ type: 'session.created', session: {} });
    await expect(p).resolves.toBeUndefined();
  });

  it('emits trimmed final text, ignores empty and partial', async () => {
    const { stt, emit, onFinal } = setup();
    const p = stt.connect();
    emit({ type: 'session.created', session: {} });
    await p;
    emit({ type: 'transcript.text.done', text: '  Xin chào  ' });
    emit({ type: 'transcript.text.done', text: '   ' });
    emit({ type: 'transcript.text.partial', text: 'Xin' });
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith('Xin chào');
  });

  it('reports server errors', async () => {
    const { stt, emit, onError } = setup();
    const p = stt.connect();
    emit({ type: 'session.created', session: {} });
    await p;
    emit({ type: 'error', error: { message: 'Insufficient credits' } });
    expect(onError).toHaveBeenCalledWith('Blaze STT: Insufficient credits');
  });

  it('reports unexpected close but not a requested one', async () => {
    const a = setup();
    const pa = a.stt.connect();
    a.emit({ type: 'session.created', session: {} });
    await pa;
    a.socket.onclose?.();
    expect(a.onError).toHaveBeenCalledWith('Mất kết nối Blaze STT');

    const b = setup();
    const pb = b.stt.connect();
    b.emit({ type: 'session.created', session: {} });
    await pb;
    b.socket.readyState = 1;
    b.stt.close();
    b.socket.onclose?.();
    expect(b.onError).not.toHaveBeenCalled();
  });

  it('sends frames only when open and signals done on close', async () => {
    const { stt, socket, sent, emit } = setup();
    const p = stt.connect();
    emit({ type: 'session.created', session: {} });
    await p;
    const frame = new Int16Array([1, 2]);
    stt.sendFrame(frame);
    expect(sent).toEqual([]);
    socket.readyState = 1;
    stt.sendFrame(frame);
    expect(sent).toEqual([frame.buffer]);
    stt.close();
    expect(sent.at(-1)).toBe('{"type":"input_audio.done"}');
  });
});
