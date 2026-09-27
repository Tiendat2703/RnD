# Layer 2 backend integration

Layer 2 receives final speaker-attributed transcript events, persists them,
runs topic detection and agent work asynchronously, and publishes insights back
to the LiveKit room.

## 1. Expose the ingest endpoint

Create this public HTTPS endpoint:

```http
POST /v1/livekit/transcripts
Authorization: Bearer <SIDEKICK_BACKEND_TOKEN>
Idempotency-Key: <eventId>
Content-Type: application/json
```

Example body:

```json
{
  "schemaVersion": 1,
  "type": "transcript.final",
  "eventId": "9d7c...",
  "meetingId": "test1",
  "roomName": "test1",
  "sequence": 12,
  "participant": {
    "identity": "user1",
    "trackSid": "TR_abc123"
  },
  "source": "audio",
  "sourceId": "stt:TR_abc123:item_456",
  "text": "Chúng ta cần so sánh hai phương án triển khai.",
  "timing": {
    "startedAtMs": 12800,
    "endedAtMs": 15900
  },
  "createdAt": "2026-09-27T06:00:00.000Z"
}
```

`timing` and `trackSid` can be absent for typed contributions.

Validate at least these constraints:

- exact schema version `1` and type `transcript.final`;
- `eventId` is 64 lowercase hexadecimal characters;
- room, participant, source ID, and text are non-empty;
- text is at most 16,000 characters;
- sequence is a positive integer;
- the JSON body has a small hard size limit such as 32 KB.

## 2. Authenticate and accept durably

Use a long random service token stored only in both server environments. Compare
the bearer value without logging it. Do not accept this endpoint from browser
code.

In one short database transaction:

1. Insert the event using `eventId` as a unique key.
2. Associate `meetingId` with your internal meeting record.
3. Add an outbox/topic-processing job in the same transaction.
4. Return `202 Accepted`.

If `eventId` already exists, return `202` again without creating another job.
A `2xx` response means layer 2 owns the event. Run Luna and Exa after the HTTP
response.

Minimal Express shape:

```ts
app.post('/v1/livekit/transcripts', express.json({ limit: '32kb' }), async (req, res) => {
  requireInternalBearer(req, process.env.SIDEKICK_BACKEND_TOKEN);
  const event = FinalTranscriptEventSchema.parse(req.body);

  await db.transaction(async tx => {
    const inserted = await tx.transcripts.insertIfAbsent(event.eventId, event);
    if (inserted) await tx.outbox.enqueue('transcript.received', event.eventId);
  });

  res.status(202).json({ accepted: true, eventId: event.eventId });
});
```

Return statuses consistently:

- `202`: accepted or already accepted;
- `400`: invalid schema;
- `401`: missing/invalid service token;
- `413`: payload too large;
- `429`: temporary backpressure;
- `5xx`: temporary backend failure.

The LiveKit worker retries only statuses that represent temporary failure.

## 3. Build ordered meeting context

Use `meetingId` as the stream key. Store every transcript event independently.
Sort the display/context by `sequence`, then `createdAt`. Do not assume requests
arrive in sequence because the worker sends several requests concurrently.

Recommended processing rules:

- only final events enter topic detection;
- group 3-8 seconds of nearby speech before a model decision;
- keep participant identity on every turn;
- allow only one active reasoning job per meeting;
- coalesce new turns while a job is active;
- use a topic key and 30-60 second cooldown to avoid repeated Exa searches;
- keep document and meeting-record writes behind the realtime insight path.

## 4. Publish an insight into the room

Install the LiveKit server SDK in the layer 2 project:

```sh
npm install livekit-server-sdk
```

Layer 2 needs server credentials. Use the HTTPS project URL for the server SDK:

```dotenv
LIVEKIT_URL=https://demo-m6ejx9q0.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Publish a reliable data packet after Luna has produced a source-backed result:

```ts
import { DataPacket_Kind, RoomServiceClient } from 'livekit-server-sdk';

const livekit = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

const insight = {
  schemaVersion: 1,
  type: 'research.insight',
  insightId: crypto.randomUUID(),
  meetingId,
  topicKey,
  text: 'Tôi tìm được 3 tài liệu liên quan đến chủ đề này.',
  sources: results.map(({ title, url }) => ({ title, url })),
  basedOnSequence: latestSequence,
  createdAt: new Date().toISOString(),
};

await livekit.sendData(
  meetingId,
  Buffer.from(JSON.stringify(insight)),
  DataPacket_Kind.RELIABLE,
  { topic: 'sidekick.insight' },
);
```

Keep the API key and secret on layer 2. The frontend receives only a short-lived
room token.

## 5. Frontend subscription

Subscribe to reliable data packets and merge insights into the transcript
according to `createdAt` or `basedOnSequence`:

```ts
room.on(RoomEvent.DataReceived, (bytes, _participant, _kind, topic) => {
  if (topic !== 'sidekick.insight') return;
  const insight = JSON.parse(new TextDecoder().decode(bytes));
  transcriptStore.add({
    id: insight.insightId,
    role: 'assistant',
    identity: 'sidekick',
    text: insight.text,
    sources: insight.sources,
    createdAt: insight.createdAt,
  });
});
```

Continue rendering human speech from LiveKit transcription. Do not treat an
insight packet as human transcript evidence.

## 6. Connect Cloud layer 1 to layer 2

Create an ignored `.env.livekit` in the layer 1 project:

```dotenv
OPENAI_API_KEY=<existing OpenAI project key>
SIDEKICK_BACKEND_URL=https://api.example.com
SIDEKICK_BACKEND_TOKEN=<same random service token used by layer 2>
```

Apply it to the existing deployment:

```powershell
lk --project demo agent update-secrets --secrets-file .env.livekit --ignore-empty-secrets
lk --project demo agent deploy
lk --project demo agent status
npm run verify:livekit:work
npm run verify:livekit:audio
```

`verify:livekit:work` confirms that the Cloud worker sees the backend
configuration. For a full end-to-end check, join a test room, speak one labeled
sentence, and verify all three records share the same `eventId`/meeting:

1. Cloud agent logs show no `sidekick.transcript.delivery_failed` event.
2. Layer 2 stores one transcript row and one outbox job.
3. The frontend receives one `sidekick.insight` packet after processing.

## 7. Production controls

- Rotate the internal token without exposing it to participants.
- Put layer 2 near the LiveKit agent region to reduce the extra network hop.
- Add metrics for accepted, duplicate, rejected, queued, completed, and failed
  transcript events.
- Alert on queue age and the gap between the latest transcript sequence and the
  latest processed sequence.
- Use a durable outbox/queue for reasoning. The Cloud worker queue only covers
  short network failures and deployment shutdown.
- Give staging and production separate LiveKit projects, backend databases, and
  service tokens.
