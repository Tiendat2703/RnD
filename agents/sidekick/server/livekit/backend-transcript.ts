import { createHash } from 'node:crypto';

export const TRANSCRIPT_SCHEMA_VERSION = 1 as const;
export const TRANSCRIPT_PATH = '/v1/livekit/transcripts';

export type FinalTranscriptEvent = {
  schemaVersion: typeof TRANSCRIPT_SCHEMA_VERSION;
  type: 'transcript.final';
  eventId: string;
  meetingId: string;
  roomName: string;
  sequence: number;
  participant: {
    identity: string;
    trackSid?: string;
  };
  source: 'audio' | 'text';
  sourceId: string;
  text: string;
  timing?: {
    startedAtMs?: number;
    endedAtMs?: number;
  };
  createdAt: string;
};

export type TranscriptForwarderConfig = {
  backendUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  concurrency?: number;
  maxQueue?: number;
};

type Fetch = typeof fetch;
type QueueItem = { event: FinalTranscriptEvent };

export type TranscriptForwarderOptions = TranscriptForwarderConfig & {
  fetch?: Fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  onPermanentFailure?: (event: FinalTranscriptEvent, error: Error) => void | Promise<void>;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function transcriptForwarderConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TranscriptForwarderConfig {
  return {
    backendUrl: env.SIDEKICK_BACKEND_URL?.trim() || undefined,
    token: env.SIDEKICK_BACKEND_TOKEN?.trim() || undefined,
    timeoutMs: positiveInteger(env.SIDEKICK_BACKEND_TIMEOUT_MS, 5_000),
    maxAttempts: positiveInteger(env.SIDEKICK_BACKEND_MAX_ATTEMPTS, 4),
    concurrency: positiveInteger(env.SIDEKICK_BACKEND_CONCURRENCY, 4),
    maxQueue: positiveInteger(env.SIDEKICK_BACKEND_MAX_QUEUE, 512),
  };
}

export function transcriptEventId(input: {
  roomName: string;
  participantIdentity: string;
  sourceId: string;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([input.roomName, input.participantIdentity, input.sourceId]))
    .digest('hex');
}

function endpointFor(rawUrl: string): URL {
  const base = new URL(rawUrl);
  const local = base.hostname === 'localhost' || base.hostname === '127.0.0.1' || base.hostname === '::1';
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && local)) {
    throw new Error('SIDEKICK_BACKEND_URL must use HTTPS (HTTP is allowed only for localhost).');
  }
  if (!base.pathname || base.pathname === '/') base.pathname = TRANSCRIPT_PATH;
  base.hash = '';
  return base;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Bounded, concurrent delivery from a room job to the durable backend. A final
 * transcript is acknowledged only by a 2xx response. eventId and the
 * Idempotency-Key header let the backend safely accept retries.
 */
export class TranscriptForwarder {
  readonly configured: boolean;
  private readonly endpoint?: URL;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly concurrency: number;
  private readonly maxQueue: number;
  private readonly fetch: Fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly onPermanentFailure?: TranscriptForwarderOptions['onPermanentFailure'];
  private readonly queue: QueueItem[] = [];
  private readonly idleWaiters = new Set<() => void>();
  private active = 0;

  constructor(options: TranscriptForwarderOptions = {}) {
    this.endpoint = options.backendUrl ? endpointFor(options.backendUrl) : undefined;
    this.token = options.token;
    this.configured = Boolean(this.endpoint);
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxAttempts = options.maxAttempts ?? 4;
    this.concurrency = options.concurrency ?? 4;
    this.maxQueue = options.maxQueue ?? 512;
    this.fetch = options.fetch ?? fetch;
    this.sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    this.onPermanentFailure = options.onPermanentFailure;
  }

  get pending(): number {
    return this.queue.length + this.active;
  }

  enqueue(event: FinalTranscriptEvent): boolean {
    if (!this.configured) return false;
    if (this.pending >= this.maxQueue) {
      void this.reportFailure(event, new Error('Backend transcript queue is full.'));
      return false;
    }
    this.queue.push({ event });
    this.pump();
    return true;
  }

  async drain(timeoutMs = 10_000): Promise<boolean> {
    if (this.pending === 0) return true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const idle = new Promise<boolean>(resolve => {
      const waiter = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.idleWaiters.add(waiter);
      timer = setTimeout(() => {
        this.idleWaiters.delete(waiter);
        resolve(false);
      }, timeoutMs);
    });
    return idle;
  }

  private pump(): void {
    while (this.active < this.concurrency && this.queue.length) {
      const item = this.queue.shift();
      if (!item) break;
      this.active++;
      void this.deliver(item.event)
        .catch(error => this.reportFailure(
          item.event,
          error instanceof Error ? error : new Error('Backend transcript delivery failed.'),
        ))
        .finally(() => {
          this.active--;
          this.pump();
          this.resolveIdle();
        });
    }
  }

  private async deliver(event: FinalTranscriptEvent): Promise<void> {
    if (!this.endpoint) return;
    let lastError = new Error('Backend transcript delivery failed.');
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      let response: Response | undefined;
      try {
        response = await this.fetch(this.endpoint, {
          method: 'POST',
          headers: {
            ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
            'content-type': 'application/json',
            'idempotency-key': event.eventId,
            'user-agent': 'sidekick-livekit-ingest/1',
          },
          body: JSON.stringify(event),
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error instanceof Error && error.name !== 'AbortError'
          ? error
          : new Error('Backend transcript request timed out.');
      } finally {
        clearTimeout(timeout);
      }
      if (response?.ok) return;
      if (response) {
        lastError = new Error(`Backend transcript endpoint returned HTTP ${response.status}.`);
        if (!retryableStatus(response.status)) throw lastError;
      }
      if (attempt < this.maxAttempts) await this.sleep(Math.min(250 * 4 ** (attempt - 1), 4_000));
    }
    throw lastError;
  }

  private async reportFailure(event: FinalTranscriptEvent, error: Error): Promise<void> {
    try {
      await this.onPermanentFailure?.(event, error);
    } catch {
      // Failure reporting must not reject the delivery queue.
    }
  }

  private resolveIdle(): void {
    if (this.pending !== 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}
