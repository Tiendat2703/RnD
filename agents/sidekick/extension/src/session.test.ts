import { describe, expect, it, vi } from 'vitest';
import type { ResearchResult } from './research';
import { MeetingSession } from './session';
import type { TopicDecision } from './topic';

const decision = (topic: string, changed = true): TopicDecision => ({
  topic,
  keywords: [],
  query: `q ${topic}`,
  changed,
});
const result = (topic: string): ResearchResult => ({
  topic,
  summary: 's',
  sources: [{ title: 'T', url: `https://x/${topic}`, reason: 'r' }],
});

/** Promise có thể resolve/reject bằng tay. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(opts: {
  detect?: (...a: never[]) => Promise<TopicDecision | null>;
  research?: (topic: { topic: string }, signal: AbortSignal) => Promise<ResearchResult | null>;
} = {}) {
  let t = 0;
  const detect = vi.fn(opts.detect ?? (async () => null));
  const research = vi.fn(opts.research ?? (async () => null));
  const post = vi.fn();
  const onError = vi.fn();
  const session = new MeetingSession({
    detect: detect as never,
    research: research as never,
    post,
    onError,
    now: () => t,
  });
  return {
    session, detect, research, post, onError,
    at: (ms: number) => void (t = ms),
  };
}

describe('MeetingSession', () => {
  it('calls detect only after 3 new sentences and the minimum gap', () => {
    const s = setup();
    s.at(1000); s.session.onFinal('một');
    s.at(2000); s.session.onFinal('hai');
    expect(s.detect).not.toHaveBeenCalled();
    s.at(15_000); s.session.onFinal('ba');
    expect(s.detect).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicates when counting new sentences', () => {
    const s = setup();
    s.at(1000); s.session.onFinal('một');
    s.at(2000); s.session.onFinal('Một');
    s.at(15_000); s.session.onFinal('hai');
    expect(s.detect).not.toHaveBeenCalled();
  });

  it('aborts old research on a topic change and drops its late result', async () => {
    const a = deferred<ResearchResult | null>();
    const b = deferred<ResearchResult | null>();
    const signals: AbortSignal[] = [];
    const s = setup({
      detect: vi.fn()
        .mockResolvedValueOnce(decision('A'))
        .mockResolvedValueOnce(decision('B')) as never,
      research: (topic, signal) => {
        signals.push(signal);
        return topic.topic === 'A' ? a.promise : b.promise;
      },
    });
    for (const [ms, w] of [[1, 'a'], [2, 'b'], [15_000, 'c']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    for (const [ms, w] of [[16_000, 'd'], [17_000, 'e'], [31_000, 'f']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    expect(signals[0].aborted).toBe(true);
    a.resolve(result('A'));
    b.resolve(result('B'));
    await tick();
    const texts = s.post.mock.calls.map((c) => String(c[0]));
    expect(texts.some((t) => t.includes('https://x/A'))).toBe(false);
    expect(texts.some((t) => t.includes('https://x/B'))).toBe(true);
  });

  it('does not research again when the topic did not change', async () => {
    const s = setup({
      detect: vi.fn()
        .mockResolvedValueOnce(decision('A'))
        .mockResolvedValueOnce(decision('A', false)) as never,
      research: async () => result('A'),
    });
    for (const [ms, w] of [[1, 'a'], [2, 'b'], [15_000, 'c']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    for (const [ms, w] of [[16_000, 'd'], [17_000, 'e'], [31_000, 'f']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    expect(s.detect).toHaveBeenCalledTimes(2);
    expect(s.research).toHaveBeenCalledTimes(1);
  });

  it('posts nothing for an empty topic', async () => {
    const s = setup({ detect: async () => decision('') as never });
    for (const [ms, w] of [[1, 'a'], [2, 'b'], [15_000, 'c']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    expect(s.research).not.toHaveBeenCalled();
    expect(s.post).not.toHaveBeenCalled();
  });

  it('routes research errors to onError and never posts', async () => {
    const s = setup({
      detect: async () => decision('A') as never,
      research: async () => {
        throw new Error('Exa 429');
      },
    });
    for (const [ms, w] of [[1, 'a'], [2, 'b'], [15_000, 'c']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    expect(s.onError).toHaveBeenCalledWith('Exa 429');
    expect(s.post).not.toHaveBeenCalled();
  });

  it('aborts research and stops detecting after stop()', async () => {
    const gate = deferred<ResearchResult | null>();
    let signal!: AbortSignal;
    const s = setup({
      detect: async () => decision('A') as never,
      research: (_t, sig) => ((signal = sig), gate.promise),
    });
    for (const [ms, w] of [[1, 'a'], [2, 'b'], [15_000, 'c']] as const) {
      s.at(ms); s.session.onFinal(w);
    }
    await tick();
    s.session.stop();
    expect(signal.aborted).toBe(true);
    gate.resolve(result('A'));
    await tick();
    expect(s.post).not.toHaveBeenCalled();
    s.at(60_000);
    for (const w of ['x', 'y', 'z']) s.session.onFinal(w);
    expect(s.detect).toHaveBeenCalledTimes(1);
  });
});
