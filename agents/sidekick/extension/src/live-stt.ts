import { STT_RETRY_BASE_MS, STT_RETRY_MAX_MS } from './config';
import { isFatalSttError } from './stt';

export type SttLike = { connect(): Promise<void>; sendFrame(frame: Int16Array): void; close(): void };
export type SttHandlers = {
  onFinal: (text: string) => void;
  onPartial: (text: string) => void;
  onError: (message: string, fatal: boolean) => void;
};
export type SttState = 'connecting' | 'live' | 'reconnecting' | 'stopped';
type Schedule = (fn: () => void, ms: number) => () => void;

const defaultSchedule: Schedule = (fn, ms) => {
  const timer = setTimeout(fn, ms);
  return () => clearTimeout(timer);
};

/**
 * Keeps one STT connection alive for a whole meeting. Audio never waits on it: frames sent
 * while reconnecting are dropped, so the stream stays realtime instead of building a backlog.
 */
export class LiveStt {
  private current: SttLike | null = null;
  private stopped = false;
  private attempts = 0;
  private cancelRetry: (() => void) | null = null;
  private readonly schedule: Schedule;

  constructor(private readonly opts: {
    create: (handlers: SttHandlers) => SttLike;
    onFinal: (text: string) => void;
    onPartial: (text: string) => void;
    onState: (state: SttState, detail?: string) => void;
    onFatal: (message: string) => void;
    baseDelayMs?: number;
    maxDelayMs?: number;
    schedule?: Schedule;
  }) {
    this.schedule = opts.schedule ?? defaultSchedule;
  }

  /** The first connection must succeed: a wrong key should fail at Start, not mid-meeting. */
  async start(): Promise<void> {
    this.opts.onState('connecting');
    const stt = this.spawn();
    try {
      await stt.connect();
    } catch (error) {
      this.stopped = true;
      this.opts.onState('stopped');
      throw error;
    }
    if (this.stopped) return stt.close();
    this.current = stt;
    this.opts.onState('live');
  }

  sendFrame(frame: Int16Array): void {
    this.current?.sendFrame(frame);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.cancelRetry?.();
    this.current?.close();
    this.current = null;
    this.opts.onState('stopped');
  }

  private spawn(): SttLike {
    const stt: SttLike = this.opts.create({
      // A closing socket may still deliver its last finals; those are real speech, keep them.
      onFinal: text => { if (!this.stopped) this.opts.onFinal(text); },
      onPartial: text => { if (!this.stopped && stt === this.current) this.opts.onPartial(text); },
      onError: (message, fatal) => {
        if (this.stopped || stt !== this.current) return;
        this.current = null;
        if (fatal) return this.fail(message);
        this.retry(message);
      },
    });
    return stt;
  }

  private fail(message: string): void {
    this.stop();
    this.opts.onFatal(message);
  }

  private retry(reason: string): void {
    const base = this.opts.baseDelayMs ?? STT_RETRY_BASE_MS;
    const delay = Math.min(base * 2 ** this.attempts, this.opts.maxDelayMs ?? STT_RETRY_MAX_MS);
    this.attempts++;
    this.opts.onState('reconnecting', reason);
    this.cancelRetry = this.schedule(() => void this.reconnect(), delay);
  }

  private async reconnect(): Promise<void> {
    this.cancelRetry = null;
    if (this.stopped) return;
    const stt = this.spawn();
    try {
      await stt.connect();
    } catch (error) {
      if (this.stopped) return;
      const message = error instanceof Error ? error.message : String(error);
      return isFatalSttError(error) ? this.fail(message) : this.retry(message);
    }
    if (this.stopped) return stt.close();
    this.current = stt;
    this.attempts = 0;
    this.opts.onState('live');
  }
}
