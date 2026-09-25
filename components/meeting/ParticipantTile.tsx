import type { CSSProperties } from "react";
import type { Participant } from "../../lib/types";

type ParticipantTileProps = {
  participant: Participant;
  isSpeaking?: boolean;
  isSelf?: boolean;
  cameraOn?: boolean;
};

const palettes = [
  ["#e8b8a4", "#814f63", "#2b273d"],
  ["#a7c9c7", "#426a70", "#1e3039"],
  ["#d7c4f2", "#6d5a99", "#27263a"],
  ["#f0cfa4", "#9b6d4f", "#382c2b"],
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MicOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 4 16 16M9 9v3a3 3 0 0 0 4.4 2.65M15 10V7a3 3 0 0 0-5.12-2.12M17 11v1a5 5 0 0 1-.62 2.4M7 11v1a5 5 0 0 0 7.86 4.1M12 17v4M8 21h8" />
    </svg>
  );
}

export default function ParticipantTile({
  participant,
  isSpeaking = participant.isSpeaking,
  isSelf = false,
  cameraOn = false,
}: ParticipantTileProps) {
  const paletteIndex = Number(participant.id.replace(/\D/g, "")) % palettes.length;
  const [avatar, accent, background] = palettes[paletteIndex];
  const tileStyle = {
    "--avatar-color": avatar,
    "--tile-accent": accent,
    "--tile-background": background,
  } as CSSProperties;

  return (
    <article
      className={`participant-tile${isSpeaking ? " participant-tile--speaking" : ""}`}
      style={tileStyle}
      aria-label={`${participant.name}${isSpeaking ? ", đang nói" : ""}`}
    >
      <div className="participant-tile__ambient" />
      <div className={`participant-avatar${cameraOn ? " participant-avatar--camera" : ""}`}>
        <span>{initials(participant.name)}</span>
      </div>

      {isSpeaking && (
        <div className="speaking-indicator" aria-label="Đang nói">
          <i /><i /><i />
        </div>
      )}

      <div className="participant-tile__footer">
        <div className="participant-name">
          <span>{participant.name}</span>
          {isSelf && <span className="participant-name__you">Bạn</span>}
        </div>
        {participant.isMuted && (
          <span className="muted-badge" aria-label="Đã tắt mic"><MicOffIcon /></span>
        )}
      </div>
    </article>
  );
}
