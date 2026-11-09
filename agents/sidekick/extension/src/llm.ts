import { BLAZE_LLM_MODEL, BLAZE_LLM_URL } from './config';

export type ChatMessage = { role: 'system' | 'user'; content: string };
export type Chat = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;

/** Blaze /v1/chat/completions: OpenAI-compatible, xác thực Bearer. */
export function blazeChat(apiKey: string, fetcher: typeof fetch = fetch): Chat {
  return async (messages, signal) => {
    const response = await fetcher(BLAZE_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: BLAZE_LLM_MODEL,
        messages,
        stream: false,
        temperature: 0.2,
      }),
      signal,
    });
    if (!response.ok) throw new Error(`Blaze LLM ${response.status}`);
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('Blaze LLM trả về dữ liệu không hợp lệ');
    return text;
  };
}
