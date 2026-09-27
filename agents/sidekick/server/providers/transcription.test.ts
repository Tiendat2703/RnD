import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import {
  RealtimeTranscriber,
  encodePcm16Le,
  type TranscriptionSocket,
} from './transcription';

class FakeSocket extends EventEmitter implements TranscriptionSocket {
  sent: string[] = [];
  closed = false;
  terminated = false;

  send(data: string) { this.sent.push(data); }
  close() { this.closed = true; this.emit('close'); }
  terminate() { this.terminated = true; }
}

function message(socket: FakeSocket, event: object) {
  socket.emit('message', Buffer.from(JSON.stringify(event)));
}

describe('OpenAI realtime transcription', () => {
  it('configures a Vietnamese and English STT-only session', async () => {
    const socket = new FakeSocket();
    let url = '';
    let credential = '';
    const transcriber = new RealtimeTranscriber({
      apiKey: 'test-key',
      languages: ['vi', 'en'],
      onTranscript: vi.fn(),
      socketFactory: (nextUrl, apiKey) => {
        url = nextUrl;
        credential = apiKey;
        queueMicrotask(() => {
          socket.emit('open');
          message(socket, { type: 'session.created' });
          message(socket, { type: 'session.updated' });
        });
        return socket;
      },
    });

    await transcriber.connect();

    expect(url).toBe('wss://api.openai.com/v1/realtime?intent=transcription');
    expect(credential).toBe('test-key');
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24_000 },
            transcription: { model: 'gpt-live-transcribe', delay: 'medium', languages: ['vi', 'en'] },
            turn_detection: null,
          },
        },
      },
    });
  });

  it('encodes PCM16 little endian, chunks audio, and commits the turn', async () => {
    const socket = new FakeSocket();
    const transcriber = new RealtimeTranscriber({
      apiKey: 'test-key',
      onTranscript: vi.fn(),
      socketFactory: () => {
        queueMicrotask(() => {
          message(socket, { type: 'session.created' });
          message(socket, { type: 'session.updated' });
        });
        return socket;
      },
    });
    await transcriber.connect();

    transcriber.transcribe([new Int16Array([1, -2, 32767, -32768])]);

    expect(encodePcm16Le(new Int16Array([1, -2]))).toBe('AQD+/w==');
    expect(JSON.parse(socket.sent[1])).toEqual({
      type: 'input_audio_buffer.append',
      audio: 'AQD+//9/AIA=',
    });
    expect(JSON.parse(socket.sent[2])).toEqual({ type: 'input_audio_buffer.commit' });
  });

  it('delivers final transcripts and never exposes provider payloads in errors', async () => {
    const socket = new FakeSocket();
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const transcriber = new RealtimeTranscriber({
      apiKey: 'test-key',
      onTranscript,
      onError,
      socketFactory: () => {
        queueMicrotask(() => {
          message(socket, { type: 'session.created' });
          message(socket, { type: 'session.updated' });
        });
        return socket;
      },
    });
    await transcriber.connect();

    message(socket, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: '  Xin chào Sidekick.  ',
    });
    message(socket, {
      type: 'error',
      error: { code: 'rate_limit-exceeded', message: 'secret provider payload' },
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(onTranscript).toHaveBeenCalledWith({ itemId: 'item-1', transcript: 'Xin chào Sidekick.' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'OpenAI transcription failed (rate_limit-exceeded).',
    }));
    expect(onError.mock.calls[0][0].message).not.toContain('secret provider payload');
  });
});
