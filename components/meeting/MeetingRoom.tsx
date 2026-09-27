"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  LiveKitRoom, RoomAudioRenderer, StartAudio, TrackToggle,
  useAudioPlayback, useConnectionState, useIsSpeaking,
  useLocalParticipant, useParticipantAttributes, useParticipants,
  useRoomContext, useTracks, useTrackVolume, useTranscriptions, VideoTrack,
} from "@livekit/components-react";
import {
  ConnectionState, LocalAudioTrack, RemoteAudioTrack, RoomEvent, Track,
  type Participant, type TranscriptionSegment,
} from "livekit-client";

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
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

const AGENT_STATUS: Record<string, string> = {
  connecting: "Đang kết nối",
  initializing: "Đang khởi tạo",
  idle: "Đang chờ bạn",
  listening: "Đang nghe",
  thinking: "Đang suy nghĩ",
  speaking: "Đang trả lời",
  failed: "Agent gặp lỗi",
};

/** Sân khấu trung tâm: hóa thân AI + dòng chờ/phụ đề. Đây là tâm điểm của phòng. */
function CenterStage({ agent, caption }: { agent: Participant | undefined; caption: string | null }) {
  if (!agent) return <CenterStageView speaking={false} caption={caption} />;
  return <ActiveCenterStage agent={agent} caption={caption} />;
}

function ActiveCenterStage({ agent, caption }: { agent: Participant; caption: string | null }) {
  const speaking = useIsSpeaking(agent);
  const { attributes } = useParticipantAttributes({ participant: agent });
  return <CenterStageView agent={agent} speaking={speaking} state={attributes?.["lk.agent.state"]} caption={caption} />;
}

function CenterStageView({ agent, speaking, state, caption }: { agent?: Participant; speaking: boolean; state?: string; caption: string | null }) {
  const label = agent
    ? AGENT_STATUS[state ?? ""] ?? (speaking ? "Đang trả lời" : "Đang chờ bạn")
    : "Trợ lý đang vào phòng…";
  const idle = !agent || state === "idle" || (!speaking && !caption && (state === undefined || state === "connecting" || state === "initializing"));
  const orbClass = [
    "orb",
    speaking ? "orb--speaking" : "",
    state === "thinking" ? "orb--thinking" : "",
    state === "listening" ? "orb--listening" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className="stage" aria-live="polite">
      <div className={orbClass} aria-hidden="true">
        <span className="orb__halo" />
        <span className="orb__halo orb__halo--outer" />
        <span className="orb__core">
          <span className="orb__glyph">✦</span>
        </span>
      </div>

      <div className="stage__text">
        <strong className="stage__name">{agent ? displayName(agent) : "Trợ lý AI"}</strong>
        <span className={`stage__state${speaking ? " stage__state--on" : ""}`}>{label}</span>
      </div>

      {caption ? (
        <p key={caption} className="caption">{caption}</p>
      ) : idle ? (
        <p className="prompt">
          <span className="prompt__pulse" aria-hidden="true">·</span>
          Nói để bắt đầu cuộc trò chuyện
        </p>
      ) : (
        <p className="caption caption--muted">&nbsp;</p>
      )}

      <div className={`wave${speaking ? " wave--on" : ""}`} aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} style={{ animationDelay: `${(index % 9) * 0.06}s` }} />
        ))}
      </div>
    </section>
  );
}

/** Ghế ngồi: chip avatar người tham gia xếp quanh sân khấu. */
function Seat({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant);
  const { attributes } = useParticipantAttributes({ participant });
  const name = displayName(participant);
  const state = attributes?.["lk.agent.state"];
  const status = participant.isAgent
    ? AGENT_STATUS[state ?? ""] ?? (speaking ? "Đang trả lời" : "Đang chờ")
    : speaking ? "Đang nói" : participant.isMicrophoneEnabled ? "Đã bật mic" : "Đã tắt mic";
  const active = (participant.isAgent && (state === "listening" || state === "speaking")) || speaking;
  return (
    <li className={`seat${active ? " seat--on" : ""}${participant.isAgent ? " seat--ai" : ""}`}>
      <span className="seat__avatar" aria-hidden="true">{initials(name)}</span>
      <span className="seat__meta">
        <strong>{name}{participant.isLocal ? " · Bạn" : ""}</strong>
        <span>{status}</span>
      </span>
    </li>
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
    return () => { active = false; window.clearInterval(timer); };
  }, [isMicrophoneEnabled, localAudioTrack]);

  const level = isMicrophoneEnabled ? Math.min(100, Math.round(volume * 100)) : 0;
  return (
    <section className="diag" aria-label="Kiểm tra micro phía trình duyệt">
      <strong>Kiểm tra đường tiếng từ trình duyệt</strong>
      <p>{isMicrophoneEnabled ? "Hãy nói vài giây: cột mức âm cần nhảy và số gói gửi cần tăng." : "Micro đang tắt; hãy bật micro để kiểm tra."}</p>
      <div className="diag__row">
        <span>Mức âm micro</span>
        <div className="diag__meter" role="meter" aria-label="Mức âm micro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}>
          <span style={{ width: `${level}%` }} />
        </div>
      </div>
      <p>Gói audio đã gửi: {isMicrophoneEnabled && packetsSent !== null ? packetsSent.toLocaleString("vi-VN") : "chưa có dữ liệu"}</p>
      <small>Hai chỉ số này kiểm tra FE; chúng chưa xác nhận agent đã nghe hoặc trả lời.</small>
    </section>
  );
}

function AgentAudioDiagnostics() {
  const { canPlayAudio } = useAudioPlayback();
  const agentTracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown])
    .filter((track) => track.participant.isAgent && track.publication.kind === Track.Kind.Audio);
  const subscribedTrack = agentTracks.find((track) => track.publication.isSubscribed)?.publication.audioTrack;
  const audioTrack = subscribedTrack instanceof RemoteAudioTrack ? subscribedTrack : undefined;
  const volume = useTrackVolume(audioTrack);
  const [packetsReceived, setPacketsReceived] = useState<number | null>(null);

  useEffect(() => {
    setPacketsReceived(null);
    if (!audioTrack) return;
    let active = true;
    const readStats = async () => {
      try {
        const stats = await audioTrack.getReceiverStats();
        if (active) setPacketsReceived(stats?.packetsReceived ?? null);
      } catch {
        if (active) setPacketsReceived(null);
      }
    };
    void readStats();
    const timer = window.setInterval(() => void readStats(), 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [audioTrack]);

  const level = Math.min(100, Math.round(volume * 100));
  return (
    <section className="diag" aria-label="Kiểm tra âm thanh của agent">
      <strong>Kiểm tra tiếng trả lời của agent</strong>
      <p>Track audio: {agentTracks.length === 0 ? "agent chưa phát track" : audioTrack ? "đã đăng ký nhận" : "có track nhưng chưa đăng ký nhận"}</p>
      <p>Trình duyệt phát tiếng: {canPlayAudio ? "đã cho phép" : "đang bị chặn — bấm nút Bật âm thanh bên dưới"}</p>
      <div className="diag__row">
        <span>Mức âm agent</span>
        <div className="diag__meter" role="meter" aria-label="Mức âm agent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}>
          <span style={{ width: `${level}%` }} />
        </div>
      </div>
      <p>Gói audio đã nhận: {audioTrack && packetsReceived !== null ? packetsReceived.toLocaleString("vi-VN") : "chưa có dữ liệu"}</p>
      <small>Nếu console có câu trả lời nhưng không có track hoặc gói audio, cần kiểm tra phần tạo và publish tiếng nói trong agent.</small>
    </section>
  );
}

/** Gom transcript mới nhất để hiển thị làm phụ đề + lịch sử đầy đủ cho ngăn kéo. */
function useTranscripts(participants: Participant[]) {
  const room = useRoomContext();
  const transcriptions = useTranscriptions();
  const [legacy, setLegacy] = useState<Array<{ id: string; text: string; identity: string; timestamp: number }>>([]);

  useEffect(() => {
    const onTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      setLegacy((previous) => {
        const updated = new Map(previous.map((item) => [`${item.identity}:${item.id}`, item]));
        for (const segment of segments) {
          const identity = participant?.identity ?? "unknown";
          updated.set(`${identity}:${segment.id}`, { id: segment.id, text: segment.text, identity, timestamp: segment.firstReceivedTime });
        }
        return Array.from(updated.values()).slice(-120);
      });
    };
    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => { room.off(RoomEvent.TranscriptionReceived, onTranscription); };
  }, [room]);

  const merged = new Map(legacy.map((item) => [`${item.identity}:${item.id}`, item]));
  for (const item of transcriptions) {
    const identity = item.participantInfo.identity;
    const id = item.streamInfo.attributes?.["lk.segment_id"] ?? item.streamInfo.id;
    merged.set(`${identity}:${id}`, { id, text: item.text, identity, timestamp: item.streamInfo.timestamp });
  }
  const all = Array.from(merged.values()).filter((item) => item.text.trim()).sort((a, b) => a.timestamp - b.timestamp);

  const speakerOf = (item: { identity: string }) => {
    const participant = participants.find((person) => person.identity === item.identity);
    return participant?.isLocal ? "Bạn" : participant?.isAgent ? participant.name || participant.identity : participant ? displayName(participant) : item.identity;
  };
  const isAgent = (item: { identity: string }) => participants.find((p) => p.identity === item.identity)?.isAgent ?? false;

  return { all, speakerOf, isAgent, count: all.length };
}

function CenterCaption({ participants }: { participants: Participant[] }) {
  const { all, speakerOf, isAgent } = useTranscripts(participants);
  const latest = all[all.length - 1] ?? null;
  if (!latest) return null;
  const who = speakerOf(latest);
  const text = latest.text;
  return (
    <p key={`${latest.identity}:${latest.id}`} className={`caption caption--stage${isAgent(latest) ? " caption--ai" : ""}`}>
      <span className="caption__who">{who}</span>
      <span className="caption__text">{text}</span>
    </p>
  );
}

function TranscriptDrawer({ participants }: { participants: Participant[] }) {
  const [open, setOpen] = useState(false);
  const { all, speakerOf, isAgent, count } = useTranscripts(participants);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [all.length, open]);

  return (
    <>
      <button type="button" className={`dial-btn${open ? " dial-btn--on" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span aria-hidden="true">↩</span> Lịch sử {count > 0 && <em>{count}</em>}
      </button>
      <div className={`drawer${open ? " drawer--open" : ""}`} aria-hidden={!open}>
        <div className="drawer__head">
          <strong>Cuộc trò chuyện</strong>
          <button type="button" className="drawer__close" aria-label="Đóng" onClick={() => setOpen(false)}>✕</button>
        </div>
        {all.length === 0 ? (
          <p className="drawer__empty">Chưa có lời nào được ghi nhận. Hãy nói để bắt đầu.</p>
        ) : (
          <ol className="drawer__list">
            {all.map((item) => (
              <li key={`${item.identity}:${item.id}`} data-ai={isAgent(item)}>
                <span className="drawer__who">{speakerOf(item)}</span>
                <p className="drawer__text">{item.text}</p>
              </li>
            ))}
            <div ref={endRef} />
          </ol>
        )}
      </div>
    </>
  );
}

function ConnectedRoom({ roomName, error, manual, token }: { roomName: string; error: string; manual: boolean; token: string }) {
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]).filter((track) => !track.publication.isMuted);
  const connection = useConnectionState();
  const room = useRoomContext();
  const { isCameraEnabled, isMicrophoneEnabled, lastCameraError, lastMicrophoneError } = useLocalParticipant();
  const agent = participants.find((participant) => participant.isAgent);
  const tokenAgents = manual ? dispatchedAgentsFromToken(token) : [];
  const connected = connection === ConnectionState.Connected;
  const [copyMessage, setCopyMessage] = useState("");
  const [microphoneError, setMicrophoneError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSeats, setShowSeats] = useState(true);

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
    <main className="room">
      <RoomAudioRenderer />

      <header className="room-bar">
        <div className="brand"><span className="brand__mark">S</span><span>sidekick</span></div>
        <div className="room-bar__title">
          <span className="room-bar__eyebrow">CUỘC GỌI</span>
          <h1>{roomName}</h1>
        </div>
        <div className="room-bar__meta">
          <span className={`pill${connected ? " pill--ok" : ""}`}><i className="pill__dot" />{connected ? "Đã kết nối" : "Đang kết nối"}</span>
          <button type="button" className="ghost-btn" onClick={copyInvite}>Sao chép mời</button>
        </div>
      </header>
      {copyMessage && <p className="toast" role="status">{copyMessage}</p>}

      <section className="room__well">
        <div className="room__spot" aria-hidden="true" />
        <CenterStage agent={agent} caption={null} />

        {cameraTracks.length > 0 && (
          <div className="vid-strip" aria-label="Video trong phòng">
            {cameraTracks.map((track) => (
              <figure className="vid-pip" key={`${track.participant.identity}-${track.publication.trackSid}`}>
                <VideoTrack trackRef={track} playsInline className={`vid-pip__track${track.participant.isLocal ? " vid-pip__track--local" : ""}`} aria-label={`Video của ${displayName(track.participant)}`} />
                <figcaption>{displayName(track.participant)}{track.participant.isLocal ? " (Bạn)" : ""}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <CenterCaption participants={participants} />

        {connected && !agent && (
          <p className="alert alert--warn" role="status">
            {manual
              ? tokenAgents.length > 0
                ? `Token có yêu cầu dispatch ${tokenAgents.join(", ")}, nhưng agent chưa vào phòng. Kiểm tra dispatch và log agent trong LiveKit.`
                : "Token này không có yêu cầu dispatch agent. Hãy dùng lệnh lk dispatch create cho phòng hiện tại, hoặc tạo token --agent sidekick cho phòng mới."
              : "Agent chưa vào phòng. Kiểm tra LIVEKIT_AGENT_NAME trên server và thử một tên phòng mới."}
          </p>
        )}

        {!isMicrophoneEnabled && <p className="alert alert--info" role="status">Micro của bạn đang tắt. Bấm “Bật micro” để agent nghe được bạn.</p>}
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        {microphoneError && <p className="alert alert--error" role="alert">Không bật được micro: {microphoneError}</p>}
        {lastMicrophoneError && <p className="alert alert--error" role="alert">Không truy cập được micro: {lastMicrophoneError.message}</p>}
        {cameraError && <p className="alert alert--error" role="alert">Không bật được camera: {cameraError}</p>}
        {lastCameraError && <p className="alert alert--error" role="alert">Không truy cập được camera: {lastCameraError.message}</p>}

        <StartAudio label="Bật âm thanh để nghe người khác" className="start-audio" />
      </section>

      {showSeats && (
        <section className="seats" aria-label="Người tham gia">
          <div className="seats__inner">
            {participants.map((participant) => <Seat key={participant.identity} participant={participant} />)}
          </div>
        </section>
      )}

      <nav className="dock" aria-label="Điều khiển cuộc gọi">
        <TrackToggle source={Track.Source.Microphone} showIcon={false} onDeviceError={(cause) => setMicrophoneError(cause.message)} onChange={(enabled) => { if (enabled) setMicrophoneError(""); }} className={`dock-btn${isMicrophoneEnabled ? " dock-btn--on" : ""}`}>
          {isMicrophoneEnabled ? "Tắt micro" : "Bật micro"}
        </TrackToggle>
        <TrackToggle source={Track.Source.Camera} showIcon={false} onDeviceError={(cause) => setCameraError(cause.message)} onChange={(enabled) => { if (enabled) setCameraError(""); }} className={`dock-btn${isCameraEnabled ? " dock-btn--on" : ""}`}>
          {isCameraEnabled ? "Tắt camera" : "Bật camera"}
        </TrackToggle>
        <button type="button" className={`dial-btn${showSeats ? " dial-btn--on" : ""}`} onClick={() => setShowSeats((value) => !value)} aria-expanded={showSeats}>
          <span aria-hidden="true">⚇</span> Người tham gia <em>{participants.length}</em>
        </button>
        <TranscriptDrawer participants={participants} />
        <button type="button" className={`dial-btn${showDiagnostics ? " dial-btn--on" : ""}`} onClick={() => setShowDiagnostics((value) => !value)} aria-expanded={showDiagnostics}>
          <span aria-hidden="true">⚙</span> Chẩn đoán
        </button>
        <button type="button" className="dock-btn dock-btn--leave" onClick={() => void room.disconnect()}>Rời cuộc gọi</button>
      </nav>

      {showDiagnostics && (
        <section className="diag-panel" aria-label="Chẩn đoán kỹ thuật">
          <MicrophoneDiagnostics />
          {agent && <AgentAudioDiagnostics />}
        </section>
      )}
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
    <main className="join">
      <div className="join__glow" aria-hidden="true">
        <span className="join__orb" />
      </div>
      <div className="join-card">
        <span className="brand__mark brand__mark--lg">S</span>
        <p className="eyebrow">SIDEKICK · LIVEKIT</p>
        <h1>Vào phòng</h1>
        <p className="join-card__lede">Bước vào một không gian thoại với trợ lý AI. Trợ lý đã ở đó, đợi bạn mở lời.</p>
        <div className="join-mode" role="group" aria-label="Cách vào phòng">
          <button type="button" className={!manualMode ? "is-active" : ""} onClick={() => { setManualMode(false); setError(""); }}>Server của ứng dụng</button>
          <button type="button" className={manualMode ? "is-active" : ""} onClick={() => { setManualMode(true); setError(""); }}>Token có sẵn</button>
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
          {error && <p className="alert alert--error" role="alert">{error}</p>}
          <button type="submit" className="join-submit" disabled={joining}>{joining ? "Đang kết nối…" : "Vào phòng"}</button>
        </form>
        <p className="join-note">{manualMode ? "Token chỉ được giữ trong bộ nhớ của tab này. Mỗi người cần token riêng." : "Trình duyệt sẽ xin quyền dùng micro khi bạn vào phòng."}</p>
      </div>
    </main>
  );
}
