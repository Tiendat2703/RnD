import { afterEach, expect, it, vi } from 'vitest';
import { ExaProvider } from './exa';

afterEach(() => vi.unstubAllGlobals());

it('calls the default fetch with the global receiver required by browsers', async () => {
  const signal = new AbortController().signal;
  const fetcher = vi.fn(function (this: unknown, _input: RequestInfo | URL, _init?: RequestInit) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return Promise.resolve(Response.json({
      results: [{ title: 'Source', url: 'https://example.com', text: 'Research result' }],
    }));
  });
  vi.stubGlobal('fetch', fetcher);

  await expect(new ExaProvider('test-key').search('test query', signal)).resolves.toEqual([
    { title: 'Source', url: 'https://example.com', text: 'Research result' },
  ]);
  expect(fetcher).toHaveBeenCalledWith('https://api.exa.ai/search', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-key' },
    body: expect.stringContaining('test query'),
    signal: expect.any(AbortSignal),
  }));
});
