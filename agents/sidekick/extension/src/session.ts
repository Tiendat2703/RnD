import { TOPIC_CHECK_EVERY, TOPIC_CHECK_MIN_GAP_MS } from './config';
import type { ResearchResult } from './research';
import type { Topic, TopicDecision } from './topic';

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

/**
 * Web research on the meeting's topic: checks the topic every few lines, and when it changes,
 * cancels research still running for the old topic so stale sources never reach the chat.
 */
export class ResearchSession {
  private current: Topic | null = null;
  private newLines = 0;
  private lastCheck = -Infinity;
  private detecting = false;
  private research: AbortController | null = null;
  private detection: AbortController | null = null;
  private stopped = false;
  private readonly now: () => number;

  constructor(private readonly deps: {
    detect: (current: Topic | null, transcript: string, signal: AbortSignal) => Promise<TopicDecision | null>;
    research: (topic: Topic, signal: AbortSignal) => Promise<ResearchResult | null>;
    deliver: (result: ResearchResult) => void;
    onError: (message: string) => void;
    transcript: () => string;
    now?: () => number;
  }) {
    this.now = deps.now ?? Date.now;
  }

  onLine(): void {
    if (this.stopped) return;
    this.newLines++;
    if (this.detecting || this.newLines < TOPIC_CHECK_EVERY || this.now() - this.lastCheck < TOPIC_CHECK_MIN_GAP_MS) return;
    void this.check();
  }

  stop(): void {
    this.stopped = true;
    this.research?.abort();
    this.detection?.abort();
  }

  private async check(): Promise<void> {
    this.detecting = true;
    this.newLines = 0;
    this.lastCheck = this.now();
    const controller = new AbortController();
    this.detection = controller;
    let decision: TopicDecision | null = null;
    try {
      decision = await this.deps.detect(this.current, this.deps.transcript(), controller.signal);
    } catch (error) {
      if (!isAbort(error) && !this.stopped) this.deps.onError(error instanceof Error ? error.message : String(error));
    } finally {
      this.detecting = false;
    }
    if (this.stopped || !decision?.topic || (this.current && !decision.changed)) return;
    this.research?.abort();
    this.current = { topic: decision.topic, keywords: decision.keywords, query: decision.query };
    void this.run(this.current);
  }

  private async run(topic: Topic): Promise<void> {
    const controller = new AbortController();
    this.research = controller;
    try {
      const result = await this.deps.research(topic, controller.signal);
      if (result && !controller.signal.aborted && !this.stopped) this.deps.deliver(result);
    } catch (error) {
      if (!isAbort(error) && !controller.signal.aborted && !this.stopped) this.deps.onError(error instanceof Error ? error.message : String(error));
    }
  }
}
