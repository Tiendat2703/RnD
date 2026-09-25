import type { Participant } from "../../lib/types";
import ParticipantTile from "./ParticipantTile";

type ParticipantGridProps = {
  participants: Participant[];
  activeSpeakerId?: string;
  cameraOn?: boolean;
};

export default function ParticipantGrid({ participants, activeSpeakerId, cameraOn = true }: ParticipantGridProps) {
  return (
    <section className="participant-grid" aria-label="Người tham gia cuộc họp">
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          isSpeaking={participant.id === activeSpeakerId}
          isSelf={participant.id === "p-04"}
          cameraOn={participant.id === "p-04" && cameraOn}
        />
      ))}
    </section>
  );
}
