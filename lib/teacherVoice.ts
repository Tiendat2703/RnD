import { detectWake } from '../agents/sidekick/extension/src/wake';
import { fold } from '../agents/sidekick/extension/src/docs/normalize';
import type { TeacherAction } from './teacher';

export interface TeacherSpokenQuestion { text: string; action: TeacherAction; context: string[] }

export function spokenTeacherAction(text: string): TeacherAction {
  const words = fold(text);
  if (/\b(tim|tra cuu|search)\b.*\b(tai lieu|nguon|web|mang|giao trinh)\b/.test(words)) return 'research';
  if (/\b(giai bai|chua bai|giai ho|giai giup|huong dan giai)\b/.test(words)) return 'solve';
  if (/\b(ra|tao|cho|giao)\b.*\b(bai tap|cau hoi|de luyen|bai luyen)\b/.test(words)) return 'exercises';
  if (/\b(giang|day|huong dan hoc)\b/.test(words)) return 'teach';
  return 'ask';
}

/** Same one-request wake contract as Assistant; ordinary group conversation never calls AI. */
export class TeacherVoiceQuestions {
  private context: string[] = [];
  private wakeAt: number | null = null;
  constructor(private readonly ask: (question: TeacherSpokenQuestion) => void, private readonly now = Date.now) {}
  onFinal(text: string): void {
    const wake = detectWake(text);
    let question = '';
    if (wake) {
      this.wakeAt = null;
      if (wake.question) question = wake.question;
      else this.wakeAt = this.now();
    } else if (this.wakeAt !== null) {
      if (this.now() - this.wakeAt <= 10_000) question = text;
      this.wakeAt = null;
    }
    if (question.trim()) this.ask({ text: question.trim(), action: spokenTeacherAction(question), context: this.context.slice(-4) });
    if (!wake || wake.question) this.context.push(text.slice(0, 1000));
    if (this.context.length > 4) this.context.shift();
  }
}
