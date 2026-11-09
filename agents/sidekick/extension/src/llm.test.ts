import { describe, expect, it, vi } from 'vitest';
import { BLAZE_LLM_MODEL } from './config';
import { blazeChat } from './llm';

const signal = new AbortController().signal;
const msgs = [{ role: 'user' as const, content: 'Xin chào' }];

describe('blazeChat', () => {
  it('returns the reply text and sends bearer auth + model', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'Chào bạn' } }] }), {
        status: 200,
      }),
    );
    const text = await blazeChat('KEY', fetcher as unknown as typeof fetch)(msgs, signal);
    expect(text).toBe('Chào bạn');
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer KEY');
    expect(JSON.parse(init.body as string).model).toBe(BLAZE_LLM_MODEL);
  });

  it('throws with the status on HTTP errors', async () => {
    const fetcher = vi.fn(async () => new Response('no', { status: 402 }));
    await expect(
      blazeChat('KEY', fetcher as unknown as typeof fetch)(msgs, signal),
    ).rejects.toThrow('402');
  });

  it('throws on a malformed body', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));
    await expect(
      blazeChat('KEY', fetcher as unknown as typeof fetch)(msgs, signal),
    ).rejects.toThrow();
  });
});
