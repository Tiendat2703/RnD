import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration, TrackSource } from "@livekit/protocol";

export const runtime = "nodejs";

const roomPattern = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: Request) {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return Response.json({ error: "LiveKit chưa được cấu hình trên server." }, { status: 503 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  if (!input || typeof input !== "object") {
    return Response.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const { roomName, name, joinCode } = input as Record<string, unknown>;
  if (typeof roomName !== "string" || !roomPattern.test(roomName) ||
      typeof name !== "string" || !name.trim() || name.length > 48) {
    return Response.json({ error: "Tên phòng hoặc tên người tham gia không hợp lệ." }, { status: 400 });
  }

  if (process.env.LIVEKIT_JOIN_CODE && joinCode !== process.env.LIVEKIT_JOIN_CODE) {
    return Response.json({ error: "Mã vào phòng không đúng." }, { status: 403 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: crypto.randomUUID(),
    name: name.trim(),
    ttl: "1h",
  });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA], canSubscribe: true });
  const agentName = process.env.LIVEKIT_AGENT_NAME?.trim();
  if (agentName) {
    token.roomConfig = new RoomConfiguration({ agents: [new RoomAgentDispatch({ agentName })] });
  }

  return Response.json(
    { serverUrl: url, token: await token.toJwt() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
