import { DOC_CONTEXT_LINES, WAKE_FOLLOWUP_MS } from './config';
import type { DocCheckInput, DocLibrary, Finding } from './doccheck';
import { detectWake } from './wake';

/** What a keyword request is waiting on, shown so the room knows MeetMate heard and is working. */
export type AskStep = 'route' | 'docs' | 'web' | 'writing';

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

/** Records context locally; only "trợ lý" authorizes one routed question. */
export class DocAssistant {
  private readonly history: string[] = [];
  private readonly asks: { question: string; context: string[] }[] = [];
  private busy = false;
  private wakeAt: number | null = null;
  private readonly controllers = new Set<AbortController>();
  private stopped = false;
  private readonly now: () => number;

  constructor(private readonly deps: {
    library: () => DocLibrary | null;
    check: (input: DocCheckInput, signal: AbortSignal) => Promise<Finding[]>;
    /** Return true when a question was handled outside the document lane. */
    routeQuestion?: (input: DocCheckInput, signal: AbortSignal) => Promise<boolean>;
    emit: (finding: Finding) => void;
    onError: (message: string) => void;
    /** step of the request being handled; null when it is done */
    progress?: (step: AskStep | null, question: string) => void;
    now?: () => number;
  }) {
    this.now = deps.now ?? Date.now;
  }

  onLine(text: string): void {
    if (this.stopped || !text.trim()) return;
    const wake = detectWake(text);
    if (wake) {
      this.wakeAt = null;
      if (wake.question) this.ask(wake.question, this.recent());
      else this.wakeAt = this.now();
      this.remember(text);
      return;
    }
    if (this.wakeAt !== null && this.now() - this.wakeAt <= WAKE_FOLLOWUP_MS) {
      // A standalone keyword authorizes only the next line, not the rest of the meeting.
      this.wakeAt = null;
      this.ask(text, this.recent().slice(0, -1));
    } else {
      this.wakeAt = null;
    }
    this.remember(text);
  }

  stop(): void {
    this.stopped = true;
    this.wakeAt = null;
    this.asks.length = 0;
    for (const controller of this.controllers) controller.abort();
  }

  private remember(text: string): void {
    this.history.push(text);
    if (this.history.length > 40) this.history.shift();
  }

  private recent(): string[] {
    return this.history.slice(-DOC_CONTEXT_LINES);
  }

  private ask(question: string, context: string[]): void {
    this.asks.push({ question, context });
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.busy || this.stopped) return;
    const next = this.asks.shift();
    if (!next) return;
    this.busy = true;
    const controller = new AbortController();
    // The speculative document check has its own signal: routing elsewhere cancels only it.
    const docs = new AbortController();
    controller.signal.addEventListener('abort', () => docs.abort());
    this.controllers.add(controller);
    const progress = (step: AskStep | null) => this.deps.progress?.(step, next.question);
    try {
      const input: DocCheckInput = { mode: 'ask', context: next.context, lines: [next.question] };
      progress('route');
      // Check the documents while the question is being routed: most questions are about the
      // documents, and their answer is then ready when routing ends instead of one LLM round
      // trip later. Routed to the web or to a clarification, the check is cancelled and dropped.
      const lib = this.deps.library();
      const early = lib && this.deps.routeQuestion ? this.deps.check(input, docs.signal) : null;
      early?.catch(() => undefined); // awaited below, or abandoned on purpose
      if (this.deps.routeQuestion && await this.deps.routeQuestion(input, controller.signal)) return;
      if (this.stopped || controller.signal.aborted) return;
      const current = this.deps.library();
      if (!current) {
        this.deps.emit({ kind: 'not_in_doc', mode: 'ask', utterance: next.question, quote: '', chunk: null, text: 'Chưa có tài liệu nào được tải lên MeetMate.' });
      } else {
        progress('docs');
        // documents added while routing: the early check read the old library, ask again
        const findings = await (early && current === lib ? early : this.deps.check(input, controller.signal));
        if (!this.stopped && !controller.signal.aborted) {
          for (const finding of findings) this.deps.emit(finding);
        }
      }
    } catch (error) {
      if (!isAbort(error) && !this.stopped) this.deps.onError(error instanceof Error ? error.message : String(error));
    } finally {
      docs.abort();
      this.controllers.delete(controller);
      this.busy = false;
      if (!this.stopped) progress(null);
      void this.pump();
    }
  }
}
