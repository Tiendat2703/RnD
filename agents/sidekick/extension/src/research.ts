import type { Source } from '../../shared/types';
import { CHAT_PREFIX, MEET_CHAT_MAX_CHARS } from './config';
import { extractJson, type Chat } from './llm';
import type { Topic } from './topic';

export type SourceReason = { title: string; url: string; reason: string };
export type ResearchResult = { topic: string; summary: string; sources: SourceReason[] };
export type Search = (query: string, signal: AbortSignal) => Promise<Source[]>;

const SYSTEM = 'Bạn là trợ lý nghiên cứu cho một cuộc họp. Chỉ dùng các nguồn được cung cấp, không thêm nguồn khác. '
  + 'Ưu tiên theo độ tin cậy: tài liệu chính thức > nghiên cứu hoặc benchmark độc lập > văn bản pháp luật > báo uy tín > blog. '
  + 'Không kết luận thay nhóm. Chỉ trả về JSON: {"summary": string, "sources": [{"url": string, "reason": string}]}. '
  + 'summary tối đa 300 ký tự tiếng Việt, tóm tắt thông tin các nguồn đưa ra. '
  + 'reason tối đa 200 ký tự tiếng Việt, giải thích vì sao nguồn này đáng tin và liên quan.';

/** Trust boundary: only URLs Exa actually returned reach the chat; titles also come from Exa, not the LLM. */
export function parseResearch(raw: string, allowed: Source[], topic: string): ResearchResult | null {
  const value = extractJson(raw) as { summary?: unknown; sources?: unknown } | null;
  if (!value || typeof value !== 'object' || !Array.isArray(value.sources)) return null;
  const byUrl = new Map(allowed.map(source => [source.url, source]));
  const sources: SourceReason[] = [];
  for (const item of value.sources as { url?: unknown; reason?: unknown }[]) {
    const source = typeof item?.url === 'string' ? byUrl.get(item.url) : undefined;
    if (!source || sources.some(s => s.url === source.url)) continue;
    sources.push({ title: source.title, url: source.url, reason: typeof item.reason === 'string' ? item.reason.trim() : '' });
  }
  if (!sources.length) return null;
  return { topic, summary: typeof value.summary === 'string' ? value.summary.trim() : '', sources };
}

export async function research(
  topic: Topic,
  deps: { search: Search; chat: Chat },
  signal: AbortSignal,
): Promise<ResearchResult | null> {
  const found = await deps.search(topic.query, signal);
  if (!found.length) return null;
  const listing = found
    .map((source, i) => `[${i + 1}] ${source.title}\n${source.url}\n${source.text.slice(0, 1_500)}`)
    .join('\n\n');
  const reply = await deps.chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Chủ đề: ${topic.topic}\n\nNguồn:\n${listing}` },
  ], signal);
  return parseResearch(reply, found, topic.topic);
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return max <= 0 ? '' : `${text.slice(0, max - 1)}…`;
}

/** Splits text fields across the budget; URLs are never cut so links stay clickable. */
function fit(head: string, first: string, middle: string, second: string, max: number): string | null {
  const full = head + first + middle + second;
  if (full.length <= max) return full;
  const budget = max - head.length - middle.length;
  if (budget < 0) return null;
  const a = clip(first, Math.max(Math.floor(budget / 2), budget - second.length));
  return head + a + middle + clip(second, budget - a.length);
}

export function formatChatMessages(r: ResearchResult, maxChars = MEET_CHAT_MAX_CHARS): string[] {
  const n = r.sources.length;
  const messages = [
    fit(`${CHAT_PREFIX}Chủ đề: `, r.topic, '\n', r.summary, maxChars),
    ...r.sources.map((s, i) => {
      const full = fit(`${CHAT_PREFIX}[${i + 1}/${n}] `, s.title, `\n${s.url}\nVì sao chọn: `, s.reason, maxChars);
      const bare = `${CHAT_PREFIX}${s.url}`;
      // A URL that cannot fit even alone is dropped rather than cut into a broken link.
      return full ?? (bare.length <= maxChars ? bare : null);
    }),
  ];
  return messages.filter((m): m is string => m !== null);
}
