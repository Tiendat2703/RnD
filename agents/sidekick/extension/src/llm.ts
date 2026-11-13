import { BLAZE_LLM_MODEL, BLAZE_LLM_URL } from './config';

export type ChatMessage = { role: 'system' | 'user'; content: string };
export type Chat = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;

export function blazeChat(apiKey: string, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Chat {
  return async (messages, signal) => {
    const response = await fetcher(BLAZE_LLM_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: BLAZE_LLM_MODEL, messages, temperature: 0.2 }),
      signal,
    });
    if (!response.ok) throw new Error(`Blaze LLM lỗi HTTP ${response.status}`);
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Blaze LLM trả về dữ liệu không hợp lệ');
    return content;
  };
}

// Pulls the first {...} block out of a reply that may be wrapped in prose or a ```json fence.
export function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
