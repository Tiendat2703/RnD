"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LiveKitRoom, RoomAudioRenderer, StartAudio, TrackToggle, useConnectionState, useIsSpeaking, useLocalParticipant, useParticipantAttributes, useParticipants, useRoomContext, useTracks, useTrackVolume, VideoTrack } from "@livekit/components-react";
import { ConnectionState, LocalAudioTrack, Track, type Participant } from "livekit-client";

type Session = { serverUrl: string; token: string; roomName: string; manual: boolean };

function tokenPayload(token: string) {
  try {
    const encoded = token.split(".")[1];
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as {
      video?: { room?: unknown; roomJoin?: unknown };
      roomConfig?: { agents?: Array<{ agentName?: unknown }> };
    };
  } catch {
    // LiveKit sẽ xác minh chữ ký token khi kết nối.
    return null;
  }
}

function roomFromToken(token: string) {
  const payload = tokenPayload(token);
  if (payload?.video?.roomJoin === true && typeof payload.video.room === "string" && payload.video.room) {
    return payload.video.room;
  }
  throw new Error("Token không chứa quyền vào phòng LiveKit hợp lệ.");
}

function dispatchedAgentsFromToken(token: string) {
  return tokenPayload(token)?.roomConfig?.agents?.map((agent) => agent.agentName).filter((name): name is string => typeof name === "string" && name.length > 0) ?? [];
}

function displayName(participant: Participant) {
  return participant.name || participant.identity;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function VoiceTile({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant);
  const { attributes } = useParticipantAttributes({ participant });
  const name = displayName(participant);
  const agentState = attributes?.["lk.agent.state"];
  const agentStatus: Record<string, string> = {
    connecting: "Đang kết nối",
    initializing: "Đang khởi tạo",
    idle: "Đang chờ",
    listening: "Đang nghe bạn",
    thinking: "Đang xử lý",
    speaking: "Đang trả lời",
    failed: "Agent gặp lỗi",
  };
  const status = participant.isAgent
    ? agentStatus[agentState ?? ""] ?? (speaking ? "Đang trả lời" : "Agent trong phòng")
    : speaking ? "Đang nói" : participant.isMicrophoneEnabled ? "Đã bật mic" : "Đã tắt mic";

  return (
    <article className={`voice-tile${speaking ? " voice-tile--speaking" : ""}`}>
      <div className="voice-avatar" aria-hidden="true">{initials(name)}</div>
      <div className="voice-tile__details">
        <strong>{name}{participant.isLocal ? " (Bạn)" : participant.isAgent ? " (Agent)" : ""}</strong>
        <span>{status}</span>
      </div>
      <span className={`voice-indicator${participant.isAgent ? agentState === "listening" || agentState === "speaking" ? " voice-indicator--on" : "" : participant.isMicrophoneEnabled ? " voice-indicator--on" : ""}`} aria-label={participant.isAgent ? status : participant.isMicrophoneEnabled ? "Mic đang bật" : "Mic đã tắt"} />
    </article>
  );
}

function MicrophoneDiagnostics() {
  const { isMicrophoneEnabled, microphoneTrack } = useLocalParticipant();
  const audioTrack = microphoneTrack?.audioTrack;
  const localAudioTrack = audioTrack instanceof LocalAudioTrack ? audioTrack : undefined;
  const volume = useTrackVolume(isMicrophoneEnabled ? localAudioTrack : undefined);
  const [packetsSent, setPacketsSent] = useState<number | null>(null);

  useEffect(() => {
    if (!isMicrophoneEnabled || !localAudioTrack) return;
    let active = true;
    const readStats = async () => {
      try {
        const stats = await localAudioTrack.getSenderStats();
        if (active) setPacketsSent(stats?.packetsSent ?? null);
      } catch {
        if (active) setPacketsSent(null);
      }
    };
    void readStats();
    const timer = window.setInterval(() => void readStats(), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isMicrophoneEnabled, localAudioTrack]);

  const level = isMicrophoneEnabled ? Math.min(100, Math.round(volume * 100)) : 0;
  return (
    <section className="micro-diagnostics" aria-label="Kiểm tra micro phía trình duyệt">
      <strong>Kiểm tra đường tiếng từ trình duyệt</strong>
      <p>{isMicrophoneEnabled ? "Hãy nói vài giây: cột mức âm cần nhảy và số gói gửi cần tăng." : "Micro đang tắt; hãy bật micro để kiểm tra."}</p>
      <div className="micro-diagnostics__row">
        <span>Mức âm micro</span>
        <div className="micro-diagnostics__meter" role="meter" aria-label="Mức âm micro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}>
          <span style={{ width: `${level}%` }} />
        </div>
      </div>
      <p>Gói audio đã gửi: {isMicrophoneEnabled && packetsSent !== null ? packetsSent.toLocaleString("vi-VN") : "chưa có dữ liệu"}</p>
      <small>Hai chỉ số này kiểm tra FE; chúng chưa xác nhận agent đã nghe hoặc trả lời.</small>
    </section>
  );
}

function ConnectedRoom({ roomName, error, manual, token }: { roomName: string; error: string; manual: boolean; token: string }) {
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]).filter((track) => !track.publication.isMuted);
  const connection = useConnectionState();
  const room = useRoomContext();
  const { isCameraEnabled, isMicrophoneEnabled, lastCameraError, lastMicrophoneError } = useLocalParticipant();
  const agentInRoom = participants.some((participant) => participant.isAgent);
  const tokenAgents = manual ? dispatchedAgentsFromToken(token) : [];
  const [copyMessage, setCopyMessage] = useState("");
  const [microphoneError, setMicrophoneError] = useState("");
  const [cameraError, setCameraError] = useState("");

  async function copyInvite() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomName);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("Đã sao chép liên kết phòng");
    } catch {
      setCopyMessage("Không sao chép được. Hãy gửi tên phòng cho người tham gia.");
    }
  }

  return (
    <main className="voice-shell">
      <RoomAudioRenderer />
      <header className="voice-header">
        <div className="voice-brand"><span className="voice-brand__mark">S</span><span>sidekick</span></div>
        <span className={`voice-status${connection === ConnectionState.Connected ? " voice-status--connected" : ""}`}>
          {connection === ConnectionState.Connected ? "Đã kết nối phòng LiveKit" : "Đang kết nối…"}
        </span>
      </header>

      <section className="voice-main" aria-label="Cuộc gọi LiveKit">
        <div className="voice-heading">
          <p className="voice-eyebrow">CUỘC GỌI · LIVEKIT</p>
          <h1>{roomName}</h1>
          <p>Âm thanh và video được truyền trực tiếp giữa những người tham gia phòng này.</p>
          {manual && <p>Mỗi người tham gia cần một token riêng có quyền vào phòng này.</p>}
          <div className="voice-heading__actions">
            <span>{participants.length} người tham gia</span>
            <button type="button" onClick={copyInvite}>Sao chép liên kết mời</button>
          </div>
          {copyMessage && <p className="voice-feedback" role="status">{copyMessage}</p>}
        </div>

        {cameraTracks.length > 0 && (
          <div className="voice-videos" aria-label="Video trong phòng">
            {cameraTracks.map((track) => (
              <figure className="voice-video" key={`${track.participant.identity}-${track.publication.trackSid}`}>
                <VideoTrack trackRef={track} playsInline className={`voice-video__track${track.participant.isLocal ? " voice-video__track--local" : ""}`} aria-label={`Video của ${displayName(track.participant)}`} />
                <figcaption>{displayName(track.participant)}{track.participant.isLocal ? " (Bạn)" : ""}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="voice-grid">
          {participants.map((participant) => <VoiceTile key={participant.identity} participant={participant} />)}
        </div>
        {connection === ConnectionState.Connected && !agentInRoom && (
          <p className="voice-hint" role="status">
            {manual
              ? tokenAgents.length > 0
                ? `Token có yêu cầu dispatch ${tokenAgents.join(", ")}, nhưng agent chưa vào phòng. Kiểm tra dispatch và log agent trong LiveKit.`
                : "Token này không có yêu cầu dispatch agent. Hãy dùng lệnh lk dispatch create cho phòng hiện tại, hoặc tạo token --agent sidekick cho phòng mới."
              : "Agent chưa vào phòng. Kiểm tra LIVEKIT_AGENT_NAME trên server và thử một tên phòng mới."}
          </p>
        )}
        <MicrophoneDiagnostics />
        {!isMicrophoneEnabled && <p className="voice-hint" role="status">Micro của bạn đang tắt. Bấm “Bật micro” và cho phép trình duyệt dùng micro để agent nghe được bạn.</p>}
        <StartAudio label="Bật âm thanh để nghe người khác" className="voice-start-audio" />
        {error && <p className="voice-error" role="alert">{error}</p>}
        {microphoneError && <p className="voice-error" role="alert">Không bật được micro: {microphoneError}</p>}
        {lastMicrophoneError && <p className="voice-error" role="alert">Không truy cập được micro: {lastMicrophoneError.message}</p>}
        {cameraError && <p className="voice-error" role="alert">Không bật được camera: {cameraError}</p>}
        {lastCameraError && <p className="voice-error" role="alert">Không truy cập được camera: {lastCameraError.message}</p>}
      </section>

      <nav className="voice-controls" aria-label="Điều khiển cuộc gọi">
        <TrackToggle source={Track.Source.Microphone} showIcon={false} onDeviceError={(cause) => setMicrophoneError(cause.message)} onChange={(enabled) => { if (enabled) setMicrophoneError(""); }} className={`voice-button${isMicrophoneEnabled ? " voice-button--active" : ""}`}>
          {isMicrophoneEnabled ? "Tắt micro" : "Bật micro"}
        </TrackToggle>
        <TrackToggle source={Track.Source.Camera} showIcon={false} onDeviceError={(cause) => setCameraError(cause.message)} onChange={(enabled) => { if (enabled) setCameraError(""); }} className={`voice-button${isCameraEnabled ? " voice-button--active" : ""}`}>
          {isCameraEnabled ? "Tắt camera" : "Bật camera"}
        </TrackToggle>
        <button type="button" className="voice-button voice-button--leave" onClick={() => void room.disconnect()}>
          Rời cuộc gọi
        </button>
      </nav>
    </main>
  );
}

export default function MeetingRoom() {
  const [roomName, setRoomName] = useState("phong-hop");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedRoom = new URLSearchParams(window.location.search).get("room");
    if (requestedRoom) setRoomName(requestedRoom);
  }, []);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setJoining(true);
    try {
      if (manualMode) {
        const serverUrl = manualUrl.trim();
        const protocol = new URL(serverUrl).protocol;
        if (protocol !== "wss:" && protocol !== "ws:") {
          throw new Error("LiveKit URL phải bắt đầu bằng wss:// hoặc ws://.");
        }
        const token = manualToken.trim();
        setSession({ serverUrl, token, roomName: roomFromToken(token), manual: true });
        return;
      }

      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: roomName.trim(), name: name.trim(), joinCode }),
      });
      const data: { serverUrl?: string; token?: string; error?: string } = await response.json();
      if (!response.ok || !data.serverUrl || !data.token) {
        throw new Error(data.error || "Không thể vào phòng. Vui lòng thử lại.");
      }
      setSession({ serverUrl: data.serverUrl, token: data.token, roomName: roomName.trim(), manual: false });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể vào phòng. Vui lòng thử lại.");
    } finally {
      setJoining(false);
    }
  }

  if (session) {
    return (
      <LiveKitRoom
        token={session.token}
        serverUrl={session.serverUrl}
        connect
        audio
        video={false}
        onDisconnected={() => setSession(null)}
        onError={(cause) => setError(cause.message)}
        onMediaDeviceFailure={(failure, kind) => setError(`Không truy cập được ${kind === "videoinput" ? "camera" : "micro"} (${failure ?? "không rõ lỗi"}). Kiểm tra quyền thiết bị trong trình duyệt.`)}
      >
        <ConnectedRoom roomName={session.roomName} error={error} manual={session.manual} token={session.token} />
      </LiveKitRoom>
    );
  }

  return (
    <main className="join-shell">
      <div className="join-card">
        <span className="voice-brand__mark">S</span>
        <p className="voice-eyebrow">SIDEKICK · LIVEKIT</p>
        <h1>Tham gia cuộc gọi</h1>
        <p>Nói chuyện bằng micro và chia sẻ camera trực tiếp qua LiveKit.</p>
        <div className="join-mode" role="group" aria-label="Cách vào phòng">
          <button type="button" className={!manualMode ? "is-active" : ""} onClick={() => { setManualMode(false); setError(""); }}>Dùng server của ứng dụng</button>
          <button type="button" className={manualMode ? "is-active" : ""} onClick={() => { setManualMode(true); setError(""); }}>Dùng token có sẵn</button>
        </div>
        <form onSubmit={join}>
          {manualMode ? (
            <>
              <label htmlFor="livekit-url">LiveKit server URL</label>
              <input id="livekit-url" name="livekit-url" type="url" required value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} autoComplete="off" placeholder="wss://your-project.livekit.cloud" />
              <label htmlFor="livekit-token">Token người tham gia</label>
              <textarea id="livekit-token" name="livekit-token" required value={manualToken} onChange={(event) => setManualToken(event.target.value)} spellCheck={false} autoComplete="off" placeholder="Dán JWT của LiveKit" />
            </>
          ) : (
            <>
              <label htmlFor="room-name">Tên phòng</label>
              <input id="room-name" name="room" required maxLength={64} pattern="[A-Za-z0-9_-]+" value={roomName} onChange={(event) => setRoomName(event.target.value)} autoComplete="off" />
              <label htmlFor="participant-name">Tên của bạn</label>
              <input id="participant-name" name="name" required maxLength={48} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Nhập tên của bạn" />
              <label htmlFor="join-code">Mã vào phòng (nếu được cấp)</label>
              <input id="join-code" name="join-code" type="password" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} autoComplete="off" />
            </>
          )}
          {error && <p className="voice-error" role="alert">{error}</p>}
          <button type="submit" disabled={joining}>{joining ? "Đang kết nối…" : "Vào phòng"}</button>
        </form>
        <p className="join-note">{manualMode ? "Token chỉ được giữ trong bộ nhớ của tab này. Mỗi người cần token riêng." : "Trình duyệt sẽ xin quyền dùng micro khi bạn vào phòng."}</p>
      </div>
    </main>
  );
}
