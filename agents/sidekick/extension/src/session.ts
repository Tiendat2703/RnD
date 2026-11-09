import { TOPIC_CHECK_EVERY, TOPIC_CHECK_MIN_GAP_MS } from './config';
import { formatChatMessages, type ResearchResult } from './research';
import type { Topic, TopicDecision } from './topic';
import { TranscriptWindow } from './transcript';

type Deps = {
  detect: (
    current: Topic | null,
    transcript: string,
    signal: AbortSignal,
  ) => Promise<TopicDecision | null>;
  research: (topic: Topic, signal: AbortSignal) => Promise<ResearchResult | null>;
  post: (text: string) => void;
  onError: (message: string) => void;
  now?: () => number;
};

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

export class MeetingSession {
  private window = new TranscriptWindow();
  private now: () => number;
  private current: Topic | null = null;
  private newSentences = 0;
  private lastCheckAt: number;
  private detecting = false;
  private stopped = false;
  private lifetime = new AbortController();
  private researchAbort: AbortController | null = null;

  constructor(private deps: Deps) {
    this.now = deps.now ?? Date.now;
    this.lastCheckAt = this.now();
  }

  onFinal(text: string): void {
    if (this.stopped) return;
    const at = this.now();
    if (!this.window.add(text, at)) return;
    this.newSentences += 1;
    if (
      this.newSentences >= TOPIC_CHECK_EVERY &&
      at - this.lastCheckAt >= TOPIC_CHECK_MIN_GAP_MS &&
      !this.detecting
    ) {
      void this.runDetect(at);
    }
  }

  stop(): void {
    this.stopped = true;
    this.researchAbort?.abort();
    this.lifetime.abort();
  }

  private async runDetect(at: number): Promise<void> {
    this.detecting = true;
    this.lastCheckAt = at;
    this.newSentences = 0;
    try {
      const decision = await this.deps.detect(
        this.current,
        this.window.text(at),
        this.lifetime.signal,
      );
      if (this.stopped || !decision || !decision.topic) return;
      if (this.current !== null && !decision.changed) return;
      this.researchAbort?.abort();
      const topic: Topic = {
        topic: decision.topic,
        keywords: decision.keywords,
        query: decision.query,
      };
      this.current = topic;
      void this.runResearch(topic);
    } catch (e) {
      if (!isAbort(e) && !this.stopped) this.deps.onError(this.message(e));
    } finally {
      this.detecting = false;
    }
  }

  private async runResearch(topic: Topic): Promise<void> {
    const controller = new AbortController();
    this.researchAbort = controller;
    try {
      const result = await this.deps.research(topic, controller.signal);
      if (controller.signal.aborted || this.stopped || !result) return;
      for (const text of formatChatMessages(result)) this.deps.post(text);
    } catch (e) {
      if (!isAbort(e) && !controller.signal.aborted && !this.stopped) {
        this.deps.onError(this.message(e));
      }
    }
  }

  private message(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }
}
