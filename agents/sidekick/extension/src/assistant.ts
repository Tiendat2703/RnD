import { checkable } from './claims';
import { AUTO_BATCH_LINES, DOC_CONTEXT_LINES, REPORT_TTL_MS, WAKE_FOLLOWUP_MS } from './config';
import { fold } from './docs/normalize';
import type { DocCheckInput, DocLibrary, Finding } from './doccheck';
import { detectWake } from './wake';

/** What a keyword request is waiting on, shown so the room knows MeetMate heard and is working. */
export type AskStep = 'route' | 'docs' | 'web' | 'writing';

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

const words = (s: string) => new Set(fold(s).split(' ').filter(Boolean));

/**
 * Two verdicts are the same document fact when they cite the same chunk with largely the same
 * words: the model quotes a longer or shorter stretch of the passage each time.
 */
export function sameFact(a: Finding, b: Finding): boolean {
  if (a.kind !== b.kind || a.chunk?.id !== b.chunk?.id) return false;
  const A = words(a.quote);
  const B = words(b.quote);
  const shared = [...A].filter(w => B.has(w)).length;
  return shared / Math.max(1, Math.min(A.size, B.size)) >= 0.6;
}

/**
 * Two lanes over the transcript:
 * - "trợ lý" authorizes one routed question (docs or web), answered for the whole room;
 * - lines the local filter finds checkable (claims.ts) are checked against the documents on
 *   their own, one batch at a time, and only the user sees the verdicts. Clicking a line in the
 *   transcript checks that line whatever the filter says.
 */
export class DocAssistant {
  private readonly history: string[] = [];
  private readonly asks: { question: string; context: string[] }[] = [];
  private busy = false;
  private pending: { lines: string[]; context: string[]; mode: 'auto' | 'verify' }[] = [];
  private autoBusy = false;
  private readonly facts: { finding: Finding; at: number }[] = [];
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
    /** automatic checking of claims is on (a setting); clicking a line works either way */
    autoCheck?: () => boolean;
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
      this.remember(text);
      return;
    }
    this.wakeAt = null;
    const lib = this.deps.library();
    if (lib && this.deps.autoCheck?.() && checkable(text, lib).pass) this.queueAuto(text, this.recent(), 'auto');
    this.remember(text);
  }

  /** The user clicked a transcript line: check it now, whatever the filter says. */
  verify(text: string): void {
    if (this.stopped || !text.trim()) return;
    const at = this.history.lastIndexOf(text);
    const context = at >= 0 ? this.history.slice(Math.max(0, at - DOC_CONTEXT_LINES), at) : this.recent();
    this.queueAuto(text, context, 'verify');
  }

  private queueAuto(text: string, context: string[], mode: 'auto' | 'verify'): void {
    const last = this.pending.at(-1);
    // lines that arrive while a check runs go out together in the next one
    if (mode === 'auto' && last?.mode === 'auto' && last.lines.length < AUTO_BATCH_LINES) last.lines.push(text);
    else this.pending.push({ lines: [text], context, mode });
    void this.pumpAuto();
  }

  /** Already reported this meeting (within REPORT_TTL_MS): a clicked line is answered anyway. */
  private seen(f: Finding): boolean {
    const now = this.now();
    while (this.facts.length && now - this.facts[0].at > REPORT_TTL_MS) this.facts.shift();
    if (this.facts.some(x => sameFact(x.finding, f))) return true;
    this.facts.push({ finding: f, at: now });
    return false;
  }

  private async pumpAuto(): Promise<void> {
    if (this.autoBusy || this.stopped) return;
    const next = this.pending.shift();
    if (!next) return;
    const lib = this.deps.library();
    if (!lib) {
      if (next.mode === 'verify') this.deps.emit({ kind: 'not_in_doc', mode: 'verify', utterance: next.lines[0], quote: '', chunk: null, text: 'Chưa có tài liệu nào trong phiên này để đối chiếu.' });
      void this.pumpAuto();
      return;
    }
    this.autoBusy = true;
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      const findings = await this.deps.check({ mode: next.mode, context: next.context, lines: next.lines }, controller.signal);
      if (this.stopped || controller.signal.aborted) return;
      for (const f of findings) {
        if (this.seen(f) && next.mode === 'auto') continue;
        this.deps.emit(f);
      }
    } catch (error) {
      if (!isAbort(error) && !this.stopped) this.deps.onError(error instanceof Error ? error.message : String(error));
    } finally {
      this.controllers.delete(controller);
      this.autoBusy = false;
      void this.pumpAuto();
    }
  }

  stop(): void {
    this.stopped = true;
    this.wakeAt = null;
    this.asks.length = 0;
    this.pending.length = 0;
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
