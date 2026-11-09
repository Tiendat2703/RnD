import type { Source } from '../../shared/types';
import { CHAT_PREFIX, MEET_CHAT_MAX_CHARS } from './config';
import type { Chat } from './llm';
import { extractJson, type Topic } from './topic';

export type SourceReason = { title: string; url: string; reason: string };
export type ResearchResult = { topic: string; summary: string; sources: SourceReason[] };
export type Search = (query: string, signal: AbortSignal) => Promise<Source[]>;

const SYSTEM =
  'Bạn là trợ lý nghiên cứu cho một cuộc họp. Chỉ dùng các nguồn được cung cấp, không thêm nguồn khác. ' +
  'Ưu tiên theo độ tin cậy: tài liệu chính thức > nghiên cứu hoặc benchmark độc lập > văn bản pháp luật > báo uy tín > blog. ' +
  'Không kết luận thay nhóm. ' +
  'Chỉ trả về JSON: {"summary": string, "sources": [{"url": string, "reason": string}]}. ' +
  'summary tối đa 300 ký tự tiếng Việt, tóm tắt thông tin các nguồn đưa ra. ' +
  'reason tối đa 200 ký tự tiếng Việt, giải thích vì sao nguồn này đáng tin và liên quan.';

const cut = (s: string, n: number) =>
  s.length <= n ? s : n <= 0 ? '' : `${s.slice(0, n - 1)}…`;

export function parseResearch(
  raw: string,
  allowed: Source[],
  topic: string,
): ResearchResult | null {
  const obj = extractJson(raw) as {
    summary?: unknown;
    sources?: { url?: unknown; reason?: unknown }[];
  } | null;
  if (!obj || typeof obj.summary !== 'string' || !Array.isArray(obj.sources)) return null;
  const byUrl = new Map(allowed.map((s) => [s.url, s]));
  const seen = new Set<string>();
  const sources: SourceReason[] = [];
  for (const item of obj.sources) {
    if (typeof item?.url !== 'string' || typeof item.reason !== 'string') continue;
    const known = byUrl.get(item.url);
    if (!known || seen.has(item.url)) continue; // URL do LLM tự bịa thì bị loại
    seen.add(item.url);
    sources.push({
      title: known.title,
      url: known.url,
      reason: cut(item.reason.trim(), 200),
    });
  }
  if (sources.length === 0) return null;
  return { topic, summary: cut(obj.summary.trim(), 300), sources };
}

export async function research(
  topic: Topic,
  deps: { search: Search; chat: Chat },
  signal: AbortSignal,
): Promise<ResearchResult | null> {
  const found = await deps.search(topic.query, signal);
  if (found.length === 0) return null;
  const body = found
    .map((s) => `Tiêu đề: ${s.title}\nURL: ${s.url}\nNội dung: ${s.text.slice(0, 1500)}`)
    .join('\n\n---\n\n');
  const raw = await deps.chat(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Chủ đề: ${topic.topic}\n\n${body}` },
    ],
    signal,
  );
  return parseResearch(raw, found, topic.topic);
}

export function formatChatMessages(
  r: ResearchResult,
  maxChars = MEET_CHAT_MAX_CHARS,
): string[] {
  const head = `${CHAT_PREFIX}Chủ đề: `;
  const topic = cut(r.topic, 80);
  const summaryBudget = maxChars - head.length - topic.length - 1;
  const messages = [`${head}${topic}\n${cut(r.summary, summaryBudget)}`];
  const n = r.sources.length;
  r.sources.forEach((s, i) => {
    const lead = `${CHAT_PREFIX}[${i + 1}/${n}] `;
    const mid = `\n${s.url}\nVì sao chọn: `;
    const budget = maxChars - lead.length - mid.length; // URL không bao giờ bị cắt
    const title = cut(s.title, Math.max(10, Math.floor(budget / 3)));
    messages.push(`${lead}${title}${mid}${cut(s.reason, budget - title.length)}`);
  });
  return messages;
}
