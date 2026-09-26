# Sidekick on LiveKit Cloud

The Cloud worker reuses MeetingWorker, AgentsProvider, ExaProvider and
AmbiguousProvider. It accepts text in a LiveKit room, runs the existing meeting
analysis/research/publication workflow, and returns public meeting state and
verified artifact links. Explicit dispatch name: `sidekick`.

This deployment is the background agent layer. It does not serve the React app
or replace the browser's GPT-Live WebRTC voice connection. To use this worker
from the existing UI, a room client must forward text/transcripts and consume
the state streams described below. The existing local Express routes still run
their local worker.

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
used by Sidekick. Cloud automatically injects LIVEKIT_URL, LIVEKIT_API_KEY and
LIVEKIT_API_SECRET. No self-hosted LiveKit core, Redis, public agent port or
local Docker daemon is needed for Cloud builds.

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
the CLI and never prints tokens. On Windows it automatically finds WinGet installations even when the terminal PATH is stale. LIVEKIT_CLI can override the executable path.

## Room protocol

Use one dispatched Sidekick worker per meeting room. Anyone admitted to the
room as a non-agent participant can contribute and close the meeting. Issue
room tokens only to participants allowed to see and change that meeting.

| Topic | Direction | Payload |
| --- | --- | --- |
| lk.chat | Client to agent | Plain text contribution, at most 16,000 characters |
| sidekick.transcript | Client to agent | Final human transcript text; send each contribution on one input topic only |
| sidekick.command | Client to agent | JSON: `{"type":"state"}` or `{"type":"close"}` |
| sidekick.state | Agent to room | JSON: `{type, meeting, text?}`; internal provider IDs/snapshots omitted |
| lk.chat | Agent to room | Result summary with confirmed workspace links |
| sidekick.error | Agent to sender | Input/transport error message |

Text streams are deduplicated by sender identity and stream ID. Agents are
ignored on input to avoid feedback loops. Audio tracks are not subscribed.
A client forwarding GPT-Live human transcription must send it as a human
participant; agent-to-agent transcript forwarding is not enabled.

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
- Region: ap-south. Version: TCGRKYHpoYZu. Cloud status: Running.
- TypeScript check and agent build passed; 195 tests passed across 15 files.
- Real Cloud verification passed: dispatch, room join, state command round-trip.
- The verification room was disconnected and deletion requested by the script.
- Only LIVEKIT_AGENT_NAME was supplied by this deployment. The provider keys
  OPENAI_API_KEY, EXA_API_KEY and AMBIGUOUS_API_KEY remain unconfigured.
- Real model, research and native workspace writes were not tested.

Dashboard: https://cloud.livekit.io/projects/d_demo-m6ejx9q0/agents/CA_3g2QkG7EcvX4
