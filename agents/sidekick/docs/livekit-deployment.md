# Sidekick LiveKit ingest worker (layer 1)

This deployment is the realtime media boundary. It joins each dispatched room,
subscribes to every non-agent microphone track, produces speaker-attributed
transcripts with OpenAI `gpt-live-transcribe`, publishes transcripts to the
room, and forwards each final segment to the application backend.

It does not run the meeting reasoning pipeline. Luna, Exa, workspace writes,
and meeting-record persistence belong to layer 2.

## Data flow

1. LiveKit dispatches `sidekick` to a room.
2. The worker subscribes to each participant audio track independently.
3. Local VAD splits speech turns and rejects obvious noise.
4. `gpt-live-transcribe` produces partial and final text.
5. Partial/final text is published through LiveKit transcription.
6. A structured final event is published on `sidekick.transcript.final`.
7. When configured, the same final event is posted to the backend at
   `POST /v1/livekit/transcripts`.

The worker never mixes participant tracks before transcription. Participant
identity and track SID therefore come from LiveKit rather than model-side
speaker diarization.

## Configuration

Only `OPENAI_API_KEY` is required for transcript-only operation. Configure the
backend handoff when layer 2 is available:

```dotenv
OPENAI_API_KEY=
SIDEKICK_BACKEND_URL=https://api.example.com
# Optional for this MVP. When set, the worker sends Authorization: Bearer.
SIDEKICK_BACKEND_TOKEN=

# Optional defaults
# SIDEKICK_BACKEND_TIMEOUT_MS=5000
# SIDEKICK_BACKEND_MAX_ATTEMPTS=4
# SIDEKICK_BACKEND_CONCURRENCY=4
# SIDEKICK_BACKEND_MAX_QUEUE=512
```

`SIDEKICK_BACKEND_URL` must use HTTPS. Plain HTTP is accepted only for
`localhost` development. A URL with no path uses `/v1/livekit/transcripts`; a complete URL with a path, such as an n8n webhook, is used exactly as configured. The MVP can call the backend without a token. When a token is set, the worker includes it as a Bearer credential.
Cloud automatically injects LiveKit connection credentials.

## Build and deploy

```powershell
npm ci
npm run check
npm test
npm run agent:build
lk cloud auth
lk --project demo agent deploy
lk --project demo agent status
```

For the first agent creation instead of an update:

```powershell
lk --project demo agent create --region ap-south --secrets-file .env.livekit --ignore-empty-secrets
```

Update the handoff configuration without putting secrets in Git:

```powershell
lk --project demo agent update-secrets --secrets-file .env.livekit --ignore-empty-secrets
```

Target project: `wss://demo-m6ejx9q0.livekit.cloud`.

## Verification

```powershell
npm run verify:livekit
npm run verify:livekit:audio
npm run verify:livekit:work
```

- `verify:livekit` checks dispatch, room join, and ingest state.
- `verify:livekit:audio` publishes labeled synthetic audio and requires a final
  speaker-attributed transcript.
- `verify:livekit:work` now checks that backend handoff secrets are configured;
  it no longer invokes reasoning or workspace providers.

## Room protocol

| Topic | Direction | Payload |
| --- | --- | --- |
| Microphone track | participant to worker | LiveKit audio, handled per participant/track |
| `lk.chat` | participant to worker | Final typed contribution, maximum 16,000 characters |
| `sidekick.transcript` | participant to worker | Final transcript supplied by another approved source |
| LiveKit transcription | worker to room | Partial and final STT text |
| `sidekick.transcript.final` | worker to room | The versioned final event also sent to layer 2 |
| `sidekick.state` | worker to room | `ingest.state` readiness and backend queue status |
| `sidekick.command` | participant to worker | `{"type":"state"}` or `{"type":"close"}` |
| `sidekick.error` | worker to participant | Sanitized STT or delivery failure |
| `sidekick.insight` | layer 2 to room | Research/analysis result for the frontend timeline |

The `close` command drains queued backend requests and returns current ingest
state. Room shutdown also waits up to 10 seconds for queued deliveries.

## Delivery behavior

Final events use a deterministic SHA-256 `eventId`. The same value is sent in
the `Idempotency-Key` header. Layer 2 must enforce a unique constraint on this
ID because network retries can deliver an event more than once.

The worker sends up to four requests concurrently, retries timeouts, HTTP 408,
425, 429, and 5xx responses, and does not retry other 4xx responses. The queue
is bounded. It is memory-only, so layer 2 must respond quickly with `202` after
durable acceptance instead of running model work inside the request.

See [layer 2 integration](backend-integration.md) for the complete request
schema, endpoint behavior, insight publication, and rollout checklist.
