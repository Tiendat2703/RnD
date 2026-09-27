import WebSocket, { type RawData } from 'ws';

const TRANSCRIPTION_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';
const OPEN_TIMEOUT_MS = 15_000;
const PCM_SAMPLES_PER_CHUNK = 24_000;

type TranscriptionEvent = {
  type?: string;
  item_id?: string;
  delta?: string;
  transcript?: string;
  error?: { code?: string };
};

export type TranscriptEvent = {
  itemId: string;
  transcript: string;
};

export type TranscriptDeltaEvent = {
  itemId: string;
  delta: string;
};

export interface TranscriptionSocket {
  on(event: 'open', listener: () => void): this;
  on(event: 'message', listener: (data: RawData | string) => void): this;
  on(event: 'error', listener: () => void): this;
  on(event: 'close', listener: () => void): this;
  send(data: string): void;
  close(): void;
  terminate(): void;
}

export type TranscriptionSocketFactory = (url: string, apiKey: string) => TranscriptionSocket;

export type RealtimeTranscriberOptions = {
  apiKey: string;
  languages?: string[];
  prompt?: string;
  onDelta?: (event: TranscriptDeltaEvent) => void | Promise<void>;
  onTranscript: (event: TranscriptEvent) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  socketFactory?: TranscriptionSocketFactory;
  openTimeoutMs?: number;
};

function defaultSocketFactory(url: string, apiKey: string): TranscriptionSocket {
  return new WebSocket(url, { headers: { Authorization: `Bearer ${apiKey}` } });
}

function safeProviderError(event: TranscriptionEvent): Error {
  const code = event.error?.code?.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80);
  return new Error(code ? `OpenAI transcription failed (${code}).` : 'OpenAI transcription failed.');
}

export function encodePcm16Le(samples: Int16Array): string {
  const pcm = Buffer.allocUnsafe(samples.length * 2);
  for (let index = 0; index < samples.length; index++) pcm.writeInt16LE(samples[index], index * 2);
  return pcm.toString('base64');
}

export class RealtimeTranscriber {
  private readonly options: RealtimeTranscriberOptions;
  private socket?: TranscriptionSocket;
  private ready = false;
  private closed = false;

  constructor(options: RealtimeTranscriberOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.closed) throw new Error('Transcription session is closed.');
    if (this.ready) return;
    if (!this.options.apiKey) throw new Error('OPENAI_API_KEY is required for speech transcription.');

    const socketFactory = this.options.socketFactory ?? defaultSocketFactory;
    const socket = socketFactory(TRANSCRIPTION_URL, this.options.apiKey);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(() => {
        socket.terminate();
        finish(new Error('OpenAI transcription connection timed out.'));
      }, this.options.openTimeoutMs ?? OPEN_TIMEOUT_MS);

      socket.on('message', data => {
        let event: TranscriptionEvent;
        try {
          event = JSON.parse(data.toString()) as TranscriptionEvent;
        } catch {
          void this.reportError(new Error('OpenAI transcription returned an invalid event.'));
          return;
        }

        if (event.type === 'session.created') {
          const transcription: Record<string, unknown> = {
            model: 'gpt-live-transcribe',
            delay: 'medium',
          };
          if (this.options.languages?.length) transcription.languages = this.options.languages;
          if (this.options.prompt) transcription.prompt = this.options.prompt;
          socket.send(JSON.stringify({
            type: 'session.update',
            session: {
              type: 'transcription',
              audio: {
                input: {
                  format: { type: 'audio/pcm', rate: 24_000 },
                  transcription,
                  turn_detection: null,
                },
              },
            },
          }));
          return;
        }

        if (event.type === 'session.updated') {
          this.ready = true;
          finish();
          return;
        }

        if (event.type === 'error') {
          const error = safeProviderError(event);
          if (!this.ready) finish(error);
          void this.reportError(error);
          return;
        }

        const itemId = event.item_id?.trim();
        if (event.type === 'conversation.item.input_audio_transcription.delta'
          && itemId && typeof event.delta === 'string' && event.delta) {
          void Promise.resolve(this.options.onDelta?.({ itemId, delta: event.delta }))
            .catch(() => this.reportError(new Error('Could not publish transcription progress.')));
          return;
        }

        if (event.type === 'conversation.item.input_audio_transcription.completed'
          && itemId && typeof event.transcript === 'string') {
          const transcript = event.transcript.trim();
          if (!transcript) return;
          void Promise.resolve(this.options.onTranscript({ itemId, transcript }))
            .catch(() => this.reportError(new Error('Could not process completed transcription.')));
          return;
        }

        if (event.type === 'conversation.item.input_audio_transcription.failed') {
          void this.reportError(new Error('OpenAI could not transcribe this audio turn.'));
        }
      });
      socket.on('error', () => {
        const error = new Error('OpenAI transcription connection failed.');
        if (!this.ready) finish(error);
        void this.reportError(error);
      });
      socket.on('close', () => {
        this.ready = false;
        if (!this.closed) {
          const error = new Error('OpenAI transcription connection closed unexpectedly.');
          finish(error);
          void this.reportError(error);
        }
      });
    });
  }

  transcribe(frames: readonly Int16Array[]): void {
    if (!this.ready || !this.socket) throw new Error('Transcription session is not ready.');
    let samples = 0;
    for (const frame of frames) samples += frame.length;
    if (samples === 0) return;

    const combined = new Int16Array(samples);
    let offset = 0;
    for (const frame of frames) {
      combined.set(frame, offset);
      offset += frame.length;
    }
    for (let start = 0; start < combined.length; start += PCM_SAMPLES_PER_CHUNK) {
      const chunk = combined.subarray(start, Math.min(start + PCM_SAMPLES_PER_CHUNK, combined.length));
      this.socket.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: encodePcm16Le(chunk),
      }));
    }
    this.socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    this.socket?.close();
  }

  private async reportError(error: Error): Promise<void> {
    try {
      await this.options.onError?.(error);
    } catch {
      // Error reporting must never create an unhandled rejection in the socket loop.
    }
  }
}
