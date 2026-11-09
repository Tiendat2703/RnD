import { DOC_CONTEXT_LINES, MIN_MEANINGFUL_TERMS, REPORT_TTL_MS, WAKE_FOLLOWUP_MS } from './config';
import type { DocCheckInput, DocLibrary, Finding } from './doccheck';
import { fold, isStopword } from './docs/normalize';
import { detectWake } from './wake';

const QUESTION = /\?|(?:^| )(bao nhieu|bao gio|bao lau|khi nao|ngay nao|thang nao|o dau|ai|the nao|tai sao|vi sao|la gi|co phai|dung khong|phai khong|chua|khong)(?: |$)/;

export const isQuestion = (text: string) => text.includes('?') || QUESTION.test(fold(text));

/** Cheap local filter: skip "ok", "nghe rõ không" and the like; let the model judge the rest. */
export function worthChecking(text: string): boolean {
  const meaningful = fold(text).split(' ').filter(s => s && !isStopword(s));
  return /\d/.test(text) || meaningful.length >= MIN_MEANINGFUL_TERMS || (isQuestion(text) && meaningful.length >= 3);
}

function reportKey(f: Finding): string {
  return `${f.kind}:${fold(f.utterance)}`;
}

const words = (s: string) => new Set(fold(s).split(' ').filter(Boolean));

/**
 * Two contradictions are the same document fact when they cite the same chunk with largely the
 * same words: the model quotes a longer or shorter stretch of the passage each time.
 */
export function sameFact(a: Finding, b: Finding): boolean {
  if (a.kind !== 'contradiction' || b.kind !== 'contradiction' || a.chunk?.id !== b.chunk?.id) return false;
  const A = words(a.quote);
  const B = words(b.quote);
  const shared = [...A].filter(w => B.has(w)).length;
  return shared / Math.max(1, Math.min(A.size, B.size)) >= 0.6;
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

/**
 * Turns finished transcript lines into document checks without ever blocking the caller:
 * - "MeetMate ơi …" questions run at once on their own lane;
 * - other lines run one check at a time; lines arriving meanwhile are batched into the next
 *   check, so latency never piles up behind a slow model call.
 */
export class DocAssistant {
  private readonly history: string[] = [];
  private pending: string[] = [];
  private autoBusy = false;
  private readonly asks: { question: string; context: string[] }[] = [];
  private askBusy = false;
  private wakeAt: number | null = null;
  /** Report key → when it was first reported (answers and notes, by wording). */
  private readonly reported = new Map<string, number>();
  private readonly facts: { finding: Finding; at: number }[] = [];
  private readonly controllers = new Set<AbortController>();
  private stopped = false;
  private readonly now: () => number;

  constructor(private readonly deps: {
    library: () => DocLibrary | null;
    check: (input: DocCheckInput, signal: AbortSignal) => Promise<Finding[]>;
    emit: (finding: Finding) => void;
    onError: (message: string) => void;
    now?: () => number;
  }) {
    this.now = deps.now ?? Date.now;
  }

  onLine(text: string): void {
    if (this.stopped) return;
    const wake = detectWake(text);
    if (wake) {
      if (wake.question.split(' ').length >= 2) this.ask(wake.question, this.recent());
      else this.wakeAt = this.now();
      this.remember(text);
      return;
    }
    if (this.wakeAt !== null && this.now() - this.wakeAt <= WAKE_FOLLOWUP_MS) {
      this.wakeAt = null;
      // The bare "MeetMate ơi" line adds nothing to the question's context.
      this.ask(text, this.recent().slice(0, -1));
      this.remember(text);
      return;
    }
    this.wakeAt = null;
    this.remember(text);
    if (!worthChecking(text) || !this.deps.library()) return;
    this.pending.push(text);
    void this.pumpAuto();
  }

  stop(): void {
    this.stopped = true;
    for (const c of this.controllers) c.abort();
  }

  private remember(text: string): void {
    this.history.push(text);
    if (this.history.length > 40) this.history.shift();
  }

  private recent(): string[] {
    return this.history.slice(-DOC_CONTEXT_LINES);
  }

  /** The lines said just before `lines`, which are already in the history. */
  private contextBefore(lines: string[]): string[] {
    const end = Math.max(0, this.history.length - lines.length);
    return this.history.slice(Math.max(0, end - DOC_CONTEXT_LINES), end);
  }

  private ask(question: string, context: string[]): void {
    this.asks.push({ question, context });
    void this.pumpAsk();
  }

  private async pumpAsk(): Promise<void> {
    if (this.askBusy || this.stopped) return;
    const next = this.asks.shift();
    if (!next) return;
    const { question, context } = next;
    this.askBusy = true;
    const lib = this.deps.library();
    try {
      if (!lib) {
        this.deps.emit({ kind: 'not_in_doc', mode: 'ask', utterance: question, quote: '', chunk: null, text: 'Chưa có tài liệu nào được tải lên MeetMate.' });
      } else {
        const findings = await this.run({ mode: 'ask', context, lines: [question] });
        for (const f of findings) this.deliver(f, false);
      }
    } finally {
      this.askBusy = false;
      void this.pumpAsk();
    }
  }

  private async pumpAuto(): Promise<void> {
    if (this.autoBusy || this.stopped || !this.pending.length) return;
    const lines = this.pending;
    this.pending = [];
    this.autoBusy = true;
    try {
      const findings = await this.run({ mode: 'auto', context: this.contextBefore(lines), lines });
      for (const f of findings) this.deliver(f, true);
    } finally {
      this.autoBusy = false;
      void this.pumpAuto();
    }
  }

  private async run(input: DocCheckInput): Promise<Finding[]> {
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      return await this.deps.check(input, controller.signal);
    } catch (error) {
      if (!isAbort(error) && !this.stopped) this.deps.onError(error instanceof Error ? error.message : String(error));
      return [];
    } finally {
      this.controllers.delete(controller);
    }
  }

  private deliver(f: Finding, dedupe: boolean): void {
    if (this.stopped) return;
    const now = this.now();
    // Within the window a repeat still shows in the panel, marked, but is not posted again.
    if (f.kind === 'contradiction') {
      const seen = this.facts.find(r => now - r.at <= REPORT_TTL_MS && sameFact(r.finding, f));
      if (dedupe && seen) return this.deps.emit({ ...f, repeat: true });
      this.facts.push({ finding: f, at: now });
    } else {
      const key = reportKey(f);
      const first = this.reported.get(key);
      if (dedupe && first !== undefined && now - first <= REPORT_TTL_MS) return this.deps.emit({ ...f, repeat: true });
      this.reported.set(key, now);
    }
    this.deps.emit(f);
  }
}
