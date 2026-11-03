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

/** One session owns one meeting and one serial work queue inside a LiveKit job. */
export class SidekickSession {
  readonly meetingId: string;
  private pending = Promise.resolve();
  private queued = 0;
  private closing?: Promise<void>;
  private accepting = true;

  constructor(
    private store: MeetingStore,
    private worker: Worker,
    private publish: (output: SessionOutput) => Promise<void>,
  ) {
    const meeting = newMeeting('live');
    this.meetingId = meeting.id;
    store.save(meeting);
  }

  snapshot(): Meeting {
    return structuredClone(publicMeeting(this.store.get(this.meetingId)));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.queued++;
    const task = this.pending.then(operation).finally(() => { this.queued--; });
    // A failed send must not prevent a later message or shutdown from running.
    this.pending = task.catch(() => undefined);
    return task;
  }

  submit(identity: string, eventId: string, rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text || text.length > 16000) throw new Error('Text must contain 1 to 16000 characters.');
    const meeting = this.store.get(this.meetingId);
    const key = JSON.stringify([identity, eventId]);
    if (meeting.receivedEventIds?.includes(key)) return this.pending;
    if (!this.accepting || meeting.phase !== 'active') throw new Error('This meeting is closing or ended.');
    if (meeting.transcript.length >= 3000 || this.queued >= 64) throw new Error('Meeting input limit reached.');
    meeting.receivedEventIds ??= [];
    meeting.receivedEventIds.push(key);
    meeting.transcript.push({ id: randomUUID(), role: 'user', text, at: new Date().toISOString() });
    meeting.revision++;
    this.store.save(meeting);
    // Append immediately so the existing worker sees revisions arriving during research.
    return this.enqueue(async () => {
      const current = this.store.get(this.meetingId);
      if (current.processedRevision < current.revision && current.phase === 'active') {
        await this.worker.run(this.meetingId);
        const snapshot = this.snapshot();
        await this.publish({ type: 'result', meeting: snapshot, text: resultText(snapshot) });
      }
    });
  }

  async sendState(): Promise<void> {
    await this.publish({ type: 'state', meeting: this.snapshot() });
  }

  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.accepting = false;
    const meeting = this.store.get(this.meetingId);
    if (meeting.phase === 'active') {
      meeting.phase = 'closing';
      meeting.revision++;
      this.store.save(meeting);
    }
    this.closing = this.enqueue(async () => {
      const current = this.store.get(this.meetingId);
      if (!current.transcript.length) {
        current.phase = 'ended';
        current.endedAt = new Date().toISOString();
        this.store.save(current);
      } else if (current.phase !== 'ended') {
        await this.worker.run(this.meetingId);
      }
      const snapshot = this.snapshot();
      await this.publish({ type: 'result', meeting: snapshot, text: resultText(snapshot) });
    });
    return this.closing;
  }
}
