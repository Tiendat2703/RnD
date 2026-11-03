# Sidekick on LiveKit Cloud

The Cloud worker reuses MeetingWorker, AgentsProvider, ExaProvider and
AmbiguousProvider. It accepts microphone audio or text in a LiveKit room, runs
the existing meeting analysis/research/publication workflow, and returns public
meeting state and verified artifact links. Explicit dispatch name: `sidekick`.

The deployed audio path is STT-only:

1. LiveKit delivers a participant microphone track to Sidekick.
2. The worker resamples it to mono PCM16 at 24 kHz and uses local VAD to split
   speech turns.
3. OpenAI `gpt-live-transcribe` returns partial and final transcripts.
4. Final transcripts enter the normal Sidekick `MeetingWorker` flow (GPT-6
   Astra by default).
5. Sidekick publishes the transcript through LiveKit transcription and returns
   its result as text on `lk.chat` and structured state on `sidekick.state`.

The worker does not synthesize a spoken reply. It does not serve the React app,
and the existing local Express routes still run their local worker.

## Deploy

Node.js 24 and the LiveKit CLI are required.

```powershell
npm ci
npm run check
npm test
npm run agent:build
lk cloud auth
lk --project demo agent create --region ap-south --secrets-file .env.local --ignore-empty-secrets
```

Target project URL: `wss://demo-m6ejx9q0.livekit.cloud`.
Set OPENAI_API_KEY, EXA_API_KEY and AMBIGUOUS_API_KEY in the ignored
`.env.local`. The existing OpenAI project must support the API/model already
used by Sidekick as well as `gpt-live-transcribe`. Cloud automatically injects
LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET. No self-hosted LiveKit
core, Redis, public agent port or local Docker daemon is needed for Cloud
builds.

The Docker build includes only package files, server/shared source and the
agent build script. Environment files and local meeting data are excluded.
After creation, keep the generated `livekit.toml` for subsequent deployments:

```powershell
lk --project demo agent deploy
lk --project demo agent status
lk --project demo agent logs
lk --project demo agent update-secrets --secrets-file .env.local --ignore-empty-secrets
```

## Dispatch and verify

```powershell
lk --project demo dispatch create --agent-name sidekick --room my-meeting
npm run verify:livekit
```

The verification script creates a uniquely named room, dispatches the deployed
agent, verifies a state command round-trip, disconnects, and deletes only that
test room. It makes no model, search or workspace calls. It reads auth through
the CLI and never prints tokens. On Windows it automatically finds WinGet
installations even when the terminal PATH is stale. LIVEKIT_CLI can override
the executable path.

After the smoke check passes, exercise one synthetic model turn and verify the
meeting-record workspace save:

```powershell
npm run verify:livekit:work
```

This second check uses the configured OpenAI and Ambiguous AI providers and can
incur provider usage. It prints only pass/fail metadata and a sanitized provider
failure message, never credentials, tokens, transcript content, or document
content. Its uniquely named room is deleted when the check finishes.

To verify the complete voice path, including a real LiveKit microphone track,
OpenAI STT, Sidekick processing, and the meeting-record save, run:

```powershell
npm run verify:livekit:audio
```

This command uses OpenAI TTS to generate a clearly labeled Vietnamese test
utterance, publishes the resulting 24 kHz PCM as a LiveKit microphone track,
and asserts that the STT transcript preserves the expected two-week statement.
It incurs OpenAI and Ambiguous AI usage and deletes its unique test room.

## Room protocol

Use one dispatched Sidekick worker per meeting room. Anyone admitted to the
room as a non-agent participant can contribute and close the meeting. Issue
room tokens only to participants allowed to see and change that meeting.

| Topic | Direction | Payload |
| --- | --- | --- |
| Microphone audio track | Client to agent | LiveKit audio; resampled to mono PCM16/24 kHz and transcribed after local VAD detects the end of speech |
| lk.chat | Client to agent | Plain text contribution, at most 16,000 characters |
| sidekick.transcript | Client to agent | Final human transcript text; send each contribution on one input topic only |
| sidekick.command | Client to agent | JSON: `{"type":"state"}` or `{"type":"close"}` |
| LiveKit transcription | Agent to room | Partial/final user transcript from `gpt-live-transcribe` |
| sidekick.state | Agent to room | JSON: `{type, meeting, text?}`; internal provider IDs/snapshots omitted |
| lk.chat | Agent to room | Result summary with confirmed workspace links |
| sidekick.error | Agent to sender | Input/transport error message |

Text streams are deduplicated by sender identity and stream ID. Agents are
ignored on input to avoid feedback loops. The worker subscribes only to audio
tracks, not video. Each completed STT item is deduplicated by participant,
track, and OpenAI item ID. A client forwarding its own transcript must send it
as a human participant and should not also publish the same spoken contribution
as text.

Send close and wait for a result with `meeting.phase === "ended"` before leaving
when the final record is needed. Shutdown also attempts finalization, with a
five-minute process shutdown allowance. An unused room closes without provider
calls. Failed saves remain visible in meeting state.

## Storage boundary

Each job has an isolated temporary MeetingStore. Meeting state is not durable
across worker restarts, replacements or a second dispatch. LiveKit room data is
not a persistent database. Successfully published documents remain in Ambiguous,
but session continuity, deduplication and private merge state do not survive
replacement. Do not blindly replay old contributions after a replacement:
that can create duplicate artifacts. Durable resume requires an external store
before relying on this deployment for long-lived or restart-safe meetings.

## References

- https://docs.livekit.io/agents/server/
- https://docs.livekit.io/deploy/agents/quickstart/
- https://docs.livekit.io/deploy/agents/secrets/

## Deployment verification — 2026-09-26

- Project: demo / demo-m6ejx9q0.
- Agent ID: CA_3g2QkG7EcvX4.
- Dispatch name verified in worker registration logs and a real job: sidekick.
- Region: ap-south. Version: WYg2dTWhid5z. Cloud status: Running.
- TypeScript check and agent build passed; 199 tests passed across 16 files.
- Real Cloud verification passed: dispatch, room join, state command round-trip.
- The verification room was disconnected and deletion requested by the script.
- OPENAI_API_KEY, EXA_API_KEY, AMBIGUOUS_API_KEY and LIVEKIT_AGENT_NAME are
  present in Cloud secrets. Direct Exa search and Ambiguous AI identity checks
  succeeded.
- A synthetic Cloud model turn produced a summary and saved its meeting record
  successfully in Ambiguous AI. Dispatch, state round-trip, model work, and the
  native workspace write now pass end to end.
- The full Cloud audio test passed: a real LiveKit microphone track was received,
  OpenAI returned a Vietnamese transcript preserving the statement
  `kế hoạch thí điểm kéo dài hai tuần`, Sidekick processed it, returned room
  text, and saved the meeting record.

Dashboard: https://cloud.livekit.io/projects/d_demo-m6ejx9q0/agents/CA_3g2QkG7EcvX4
