import { describe, expect, it } from 'vitest';
import { LiveStt, type SttHandlers, type SttLike } from './live-stt';
import { SttFatalError } from './stt';

type Fake = SttLike & { handlers: SttHandlers; sent: Int16Array[]; closed: boolean; resolve(): void; reject(e: Error): void };

function setup() {
  const made: Fake[] = [];
  const timers: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  const states: string[] = [];
  const finals: string[] = [];
  const partials: string[] = [];
  const fatals: string[] = [];
  const live = new LiveStt({
    create: handlers => {
      let resolve!: () => void;
      let reject!: (e: Error) => void;
      const connected = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
      const fake: Fake = {
        handlers, sent: [], closed: false, resolve, reject,
        connect: () => connected,
        sendFrame: f => { fake.sent.push(f); },
        close: () => { fake.closed = true; },
      };
      made.push(fake);
      return fake;
    },
    onFinal: t => finals.push(t),
    onPartial: t => partials.push(t),
    onState: (s, d) => states.push(d ? `${s}:${d}` : s),
    onFatal: m => fatals.push(m),
    baseDelayMs: 1_000,
    maxDelayMs: 4_000,
    schedule: (fn, ms) => {
      const t = { fn, ms, cancelled: false };
      timers.push(t);
      return () => { t.cancelled = true; };
    },
  });
  const fire = async () => {
    const t = timers.filter(x => !x.cancelled).at(-1)!;
    t.cancelled = true;
    t.fn();
    await Promise.resolve();
  };
  return { live, made, timers, states, finals, partials, fatals, fire };
}

const flush = () => new Promise(r => setTimeout(r, 0));

describe('LiveStt', () => {
  it('connects, forwards frames, finals and partials', async () => {
    const s = setup();
    const started = s.live.start();
    s.made[0].resolve();
    await started;
    s.live.sendFrame(new Int16Array([1]));
    s.made[0].handlers.onPartial('Xin');
    s.made[0].handlers.onFinal('Xin chào');
    expect(s.made[0].sent).toHaveLength(1);
    expect(s.partials).toEqual(['Xin']);
    expect(s.finals).toEqual(['Xin chào']);
    expect(s.states).toEqual(['connecting', 'live']);
  });

  it('rejects start when the first connection fails', async () => {
    const s = setup();
    const started = s.live.start();
    s.made[0].reject(new Error('Mất kết nối Blaze STT'));
    await expect(started).rejects.toThrow('Mất kết nối');
    expect(s.states.at(-1)).toBe('stopped');
  });

  it('reconnects with doubling, capped delays and drops frames meanwhile', async () => {
    const s = setup();
    const started = s.live.start();
    s.made[0].resolve();
    await started;
    s.made[0].handlers.onError('Mất kết nối Blaze STT', false);
    s.live.sendFrame(new Int16Array([1]));
    expect(s.made[0].sent).toHaveLength(0);
    expect(s.timers.map(t => t.ms)).toEqual([1_000]);
    await s.fire();
    s.made[1].reject(new Error('down'));
    await flush();
    await s.fire();
    s.made[2].reject(new Error('down'));
    await flush();
    await s.fire();
    s.made[3].reject(new Error('down'));
    await flush();
    expect(s.timers.map(t => t.ms)).toEqual([1_000, 2_000, 4_000, 4_000]);
    await s.fire();
    s.made[4].resolve();
    await flush();
    s.live.sendFrame(new Int16Array([2]));
    expect(s.made[4].sent).toHaveLength(1);
    expect(s.states.at(-1)).toBe('live');
    // A fresh drop starts the backoff again from the base delay.
    s.made[4].handlers.onError('Mất kết nối Blaze STT', false);
    expect(s.timers.at(-1)!.ms).toBe(1_000);
  });

  it('stops for good on a fatal error, during the session or a reconnect', async () => {
    const a = setup();
    const started = a.live.start();
    a.made[0].resolve();
    await started;
    a.made[0].handlers.onError('Blaze STT: insufficient-credits', true);
    expect(a.fatals).toEqual(['Blaze STT: insufficient-credits']);
    expect(a.timers).toHaveLength(0);

    const b = setup();
    const startedB = b.live.start();
    b.made[0].resolve();
    await startedB;
    b.made[0].handlers.onError('Mất kết nối Blaze STT', false);
    await b.fire();
    b.made[1].reject(new SttFatalError('Blaze STT: invalid token'));
    await flush();
    expect(b.fatals).toEqual(['Blaze STT: invalid token']);
    expect(b.states.at(-1)).toBe('stopped');
  });

  it('stop cancels a pending retry and closes a connection that lands afterwards', async () => {
    const s = setup();
    const started = s.live.start();
    s.made[0].resolve();
    await started;
    s.made[0].handlers.onError('Mất kết nối Blaze STT', false);
    await s.fire();
    s.live.stop();
    s.made[1].resolve();
    await flush();
    expect(s.made[1].closed).toBe(true);
    expect(s.states.at(-1)).toBe('stopped');
  });

  it('ignores errors from a connection that was already replaced', async () => {
    const s = setup();
    const started = s.live.start();
    s.made[0].resolve();
    await started;
    s.made[0].handlers.onError('Mất kết nối Blaze STT', false);
    s.made[0].handlers.onError('Mất kết nối Blaze STT', false);
    expect(s.timers).toHaveLength(1);
  });
});
