// Blaze /v1/chat/completions (cổng tương thích OpenAI, xác thực Bearer).
// Mặc định giống nhánh main (extension/src/config.ts); đổi qua biến môi trường.
export const DEFAULT_LLM_URL = 'https://api.blaze.vn/v1/chat/completions';
export const DEFAULT_LLM_MODEL = 'openai/gpt-6-luna';

export type ChatMessage = { role: 'system' | 'user'; content: string };
export type Chat = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;

export interface BlazeOptions {
  apiKey: string;
  url?: string;
  model?: string;
  /** báo cáo đọc cả cuộc họp nên chờ lâu hơn một lượt trong lúc họp */
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export function blazeChat(opts: BlazeOptions): Chat {
  const { apiKey, url = DEFAULT_LLM_URL, model = DEFAULT_LLM_MODEL, timeoutMs = 120_000, fetcher = fetch } = opts;
  return async (messages, signal) => {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(`Blaze LLM lỗi HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Blaze LLM trả về dữ liệu không hợp lệ');
    return content;
  };
}
