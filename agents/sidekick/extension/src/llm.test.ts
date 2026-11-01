import { describe, expect, it } from 'vitest';
import { BLAZE_LLM_MODEL, BLAZE_LLM_URL } from './config';
import { blazeChat } from './llm';

describe('blazeChat', () => {
  it('posts messages with bearer auth and returns the reply text', async () => {
    let request: { url: string; init: RequestInit } | undefined;
    const fetcher = (async (url: string, init: RequestInit) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Xin chào' } }] }));
    }) as unknown as typeof fetch;
    const chat = blazeChat('key', fetcher);
    const reply = await chat([{ role: 'user', content: 'Chào' }], new AbortController().signal);
    expect(reply).toBe('Xin chào');
    expect(request?.url).toBe(BLAZE_LLM_URL);
    expect((request?.init.headers as Record<string, string>).Authorization).toBe('Bearer key');
    const body = JSON.parse(String(request?.init.body));
    expect(body.model).toBe(BLAZE_LLM_MODEL);
    expect(body.messages).toEqual([{ role: 'user', content: 'Chào' }]);
  });

  it('throws with the HTTP status on failure', async () => {
    const fetcher = (async () => new Response('{}', { status: 402 })) as unknown as typeof fetch;
    await expect(blazeChat('key', fetcher)([], new AbortController().signal)).rejects.toThrow('402');
  });
});
