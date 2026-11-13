import type { Source } from '../../shared/types';
export class ExaProvider {
  constructor(
    private apiKey = process.env.EXA_API_KEY,
    // search() calls this as a method; browser fetch requires the global receiver.
    private fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    // MeetMate asks for fewer, shorter results to answer faster; Sidekick keeps the defaults.
    private opts: { numResults: number; maxCharacters: number } = { numResults: 4, maxCharacters: 4500 },
  ) {}
  async search(query: string, signal?: AbortSignal): Promise<Source[]> {
    if (!this.apiKey)
      throw new Error('Exa is not configured. Add EXA_API_KEY to .env.local.');
    const response = await this.fetcher('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({
        query,
        type: 'auto',
        numResults: this.opts.numResults,
        contents: { text: { maxCharacters: this.opts.maxCharacters } },
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        `Exa search failed (${response.status}). ${response.status === 401 ? 'Check the Exa API key.' : response.status === 429 ? 'Rate limited; please retry later.' : 'No research was marked complete.'}`,
      );
    const data = (await response.json()) as {
      results?: { title?: string; url: string; text?: string }[];
    };
    if (!Array.isArray(data.results))
      throw new Error('Exa returned an invalid response.');
    return data.results
      .filter((item) => /^https?:\/\//i.test(item.url))
      .map((item) => ({
        title: item.title || item.url,
        url: item.url,
        text: (
          item.text || 'No extract available; open the source to verify.'
        ).slice(0, this.opts.maxCharacters),
      }));
  }
}
