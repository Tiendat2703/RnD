import { describe, expect, it, vi } from 'vitest';
import {
  TRANSCRIPT_PATH,
  TranscriptForwarder,
  transcriptEventId,
  transcriptForwarderConfigFromEnv,
  type FinalTranscriptEvent,
} from './backend-transcript';

function event(sequence = 1): FinalTranscriptEvent {
  return {
    schemaVersion: 1,
    type: 'transcript.final',
    eventId: `event-${sequence}`,
    meetingId: 'meeting-1',
    roomName: 'meeting-1',
    sequence,
    participant: { identity: 'alice', trackSid: 'TR_audio' },
    source: 'audio',
    sourceId: `item-${sequence}`,
    text: 'Xin chÃ o.',
    timing: { startedAtMs: 100, endedAtMs: 900 },
    createdAt: '2026-09-27T00:00:00.000Z',
  };
}

describe('LiveKit backend transcript forwarding', () => {
  it('creates stable opaque IDs for backend idempotency', () => {
    const input = { roomName: 'room-a', participantIdentity: 'alice', sourceId: 'track:item' };
    expect(transcriptEventId(input)).toBe(transcriptEventId(input));
    expect(transcriptEventId(input)).toMatch(/^[a-f0-9]{64}$/);
    expect(transcriptEventId({ ...input, participantIdentity: 'bob' })).not.toBe(transcriptEventId(input));
  });

  it('posts the versioned event with bearer authentication and idempotency', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    const forwarder = new TranscriptForwarder({
      backendUrl: 'https://backend.example.com/base',
      token: 'internal-token',
      fetch,
    });

    expect(forwarder.enqueue(event())).toBe(true);
    expect(await forwarder.drain()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url).toEqual(new URL('https://backend.example.com/base'));
    expect(init.headers).toMatchObject({
      authorization: 'Bearer internal-token',
      'idempotency-key': 'event-1',
    });
    expect(JSON.parse(String(init.body))).toEqual(event());
  });

  it('retries transient failures but does not retry invalid requests', async () => {
    const transientFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const transient = new TranscriptForwarder({
      backendUrl: 'https://backend.example.com', token: 'token', fetch: transientFetch,
      sleep: async () => undefined,
    });
    transient.enqueue(event());
    await transient.drain();
    expect(transientFetch).toHaveBeenCalledTimes(2);

    const onPermanentFailure = vi.fn();
    const invalidFetch = vi.fn(async () => new Response(null, { status: 400 }));
    const invalid = new TranscriptForwarder({
      backendUrl: 'https://backend.example.com', token: 'token', fetch: invalidFetch,
      sleep: async () => undefined, onPermanentFailure,
    });
    invalid.enqueue(event(2));
    await invalid.drain();
    expect(invalidFetch).toHaveBeenCalledTimes(1);
    expect(onPermanentFailure).toHaveBeenCalledWith(event(2), expect.objectContaining({
      message: 'Backend transcript endpoint returned HTTP 400.',
    }));
  });

  it('runs a bounded queue, supports transcript-only mode, and validates transport security', async () => {
    const disabled = new TranscriptForwarder();
    expect(disabled.configured).toBe(false);
    expect(disabled.enqueue(event())).toBe(false);

    const unauthenticatedFetch = vi.fn(async () => new Response(null, { status: 202 }));
    const unauthenticated = new TranscriptForwarder({
      backendUrl: 'https://backend.example.com', fetch: unauthenticatedFetch,
    });
    expect(unauthenticated.configured).toBe(true);
    unauthenticated.enqueue(event(3));
    await unauthenticated.drain();
    const [unauthenticatedUrl, unauthenticatedInit] = unauthenticatedFetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(unauthenticatedInit.headers).not.toHaveProperty('authorization');
    expect(unauthenticatedUrl).toEqual(
      new URL(`https://backend.example.com${TRANSCRIPT_PATH}`),
    );
    expect(() => new TranscriptForwarder({
      backendUrl: 'http://backend.example.com', token: 'token',
    })).toThrow(/HTTPS/);
    expect(() => new TranscriptForwarder({
      backendUrl: 'http://localhost:4000', token: 'token',
    })).not.toThrow();

    expect(transcriptForwarderConfigFromEnv({
      SIDEKICK_BACKEND_URL: 'https://backend.example.com',
      SIDEKICK_BACKEND_TOKEN: 'token',
      SIDEKICK_BACKEND_TIMEOUT_MS: '1200',
    })).toMatchObject({ timeoutMs: 1200, maxAttempts: 4, concurrency: 4, maxQueue: 512 });
  });
});
