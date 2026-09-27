import { randomUUID } from 'node:crypto';
import { newMeeting } from '../domain';
import { MeetingStore, publicMeeting } from '../store';
import { MeetingWorker } from '../worker';
import type { Meeting } from '../../shared/types';

type Worker = Pick<MeetingWorker, 'run'>;
export type SessionOutput = {
  type: 'result' | 'state';
  meeting: Meeting;
  text?: string;
};

export type TranscriptMetadata = {
  audio?: boolean;
  trackSid?: string;
  startedAtMs?: number;
  endedAtMs?: number;
};

export type SidekickSessionOptions = {
  debounceMs?: number;
  maxWaitMs?: number;
  maxBatchSize?: number;
};

export function resultText(meeting: Meeting): string {
  const errors = [
    meeting.error,
    ...meeting.documents.filter(d => d.saveStatus === 'failed').map(d => d.error || 'Document save failed.'),
    meeting.recordSaveStatus === 'failed'
      ? meeting.recordDocument?.error || 'Meeting record save failed.'
      : undefined,
  ].filter(Boolean);
  const links = [
    ...meeting.documents.filter(d => d.saveStatus === 'saved' && d.url).map(d => d.title + ': ' + d.url),
    meeting.recordSaveStatus === 'saved' && meeting.recordUrl ? 'Meeting record: ' + meeting.recordUrl : '',
  ].filter(Boolean);
  return [
    errors.length ? 'Work is incomplete: ' + errors.join('; ') : meeting.spokenResponse || meeting.summary || 'Meeting updated.',
    ...links,
  ].join('\n').slice(0, 12000);
}

/**
 * One session owns one meeting. Transcript ingestion stays fast while model work
 * is coalesced into bounded batches with at most one reasoning pass in flight.
 */
export class SidekickSession {
  readonly meetingId: string;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private readonly maxBatchSize: number;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private maxWaitTimer?: ReturnType<typeof setTimeout>;
  private buffered = 0;
  private running?: Promise<void>;
  private rerunNeeded = false;
  private closing?: Promise<void>;
  private accepting = true;

  constructor(
    private store: MeetingStore,
    private worker: Worker,
    private publish: (output: SessionOutput) => Promise<void>,
    options: SidekickSessionOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? 8_000;
    this.maxWaitMs = options.maxWaitMs ?? 20_000;
    this.maxBatchSize = options.maxBatchSize ?? 20;
    const meeting = newMeeting('live');
    this.meetingId = meeting.id;
    store.save(meeting);
  }

  snapshot(): Meeting {
    return structuredClone(publicMeeting(this.store.get(this.meetingId)));
  }

  submit(
    identity: string,
    eventId: string,
    rawText: string,
    metadata: TranscriptMetadata = {},
  ): Promise<void> {
    const text = rawText.trim();
    if (!text || text.length > 16000) throw new Error('Text must contain 1 to 16000 characters.');
    const meeting = this.store.get(this.meetingId);
    const key = JSON.stringify([identity, eventId]);
    if (meeting.receivedEventIds?.includes(key)) return this.running ?? Promise.resolve();
    if (!this.accepting || meeting.phase !== 'active') throw new Error('This meeting is closing or ended.');
    if (meeting.transcript.length >= 3000 || this.buffered >= 256) throw new Error('Meeting input limit reached.');

    meeting.receivedEventIds ??= [];
    meeting.receivedEventIds.push(key);
    const previousSequence = meeting.transcript.at(-1)?.sequence ?? 0;
    meeting.transcript.push({
      id: randomUUID(),
      role: 'user',
      text,
      at: new Date().toISOString(),
      participantIdentity: identity,
      sequence: previousSequence + 1,
      ...metadata,
    });
    meeting.revision++;
    this.store.save(meeting);
    this.buffered++;

    const directlyAddressed = /\bsidekick\b/i.test(text);
    if (directlyAddressed || this.buffered >= this.maxBatchSize || this.debounceMs === 0) {
      return this.flush();
    }
    this.armTimers();
    return Promise.resolve();
  }

  /** Force the current transcript batch through the worker and wait for it. */
  flush(): Promise<void> {
    this.clearTimers();
    if (this.running) {
      this.rerunNeeded = true;
      return this.running;
    }

    const meeting = this.store.get(this.meetingId);
    if (!this.buffered && meeting.processedRevision >= meeting.revision) return Promise.resolve();
    this.buffered = 0;
    const startedAt = Date.now();
    const revision = meeting.revision;
    const task = (async () => {
      await this.worker.run(this.meetingId);
      const snapshot = this.snapshot();
      await this.publish({ type: 'result', meeting: snapshot, text: resultText(snapshot) });
      console.info(JSON.stringify({
        event: 'sidekick.reasoning.completed',
        meetingId: this.meetingId,
        revision,
        durationMs: Date.now() - startedAt,
      }));
    })();
    this.running = task.finally(() => {
      this.running = undefined;
      const current = this.store.get(this.meetingId);
      if (
        this.accepting
        && current.phase === 'active'
        && (this.rerunNeeded || this.buffered > 0)
      ) {
        this.rerunNeeded = false;
        this.armTimers();
      }
    });
    return this.running;
  }

  async sendState(): Promise<void> {
    await this.publish({ type: 'state', meeting: this.snapshot() });
  }

  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.accepting = false;
    this.clearTimers();
    const meeting = this.store.get(this.meetingId);
    if (meeting.phase === 'active') {
      meeting.phase = 'closing';
      meeting.revision++;
      this.store.save(meeting);
    }

    this.closing = (async () => {
      await this.running?.catch(() => undefined);
      const current = this.store.get(this.meetingId);
      if (!current.transcript.length) {
        current.phase = 'ended';
        current.endedAt = new Date().toISOString();
        current.processedRevision = current.revision;
        this.store.save(current);
      } else if (current.phase !== 'ended') {
        await this.worker.run(this.meetingId);
      }
      const snapshot = this.snapshot();
      await this.publish({ type: 'result', meeting: snapshot, text: resultText(snapshot) });
    })();
    return this.closing;
  }

  private armTimers() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.flush().catch(() => undefined), this.debounceMs);
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => void this.flush().catch(() => undefined), this.maxWaitMs);
    }
  }

  private clearTimers() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.maxWaitTimer);
    this.debounceTimer = undefined;
    this.maxWaitTimer = undefined;
  }
}
