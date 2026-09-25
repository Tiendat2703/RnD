"use client";

import { useEffect, useState } from "react";
import participantData from "../../mocks/participants.json";
import { useTranscriptStream } from "../../hooks/useTranscriptStream";
import type { Participant } from "../../lib/types";
import MeetingControls from "./MeetingControls";
import ParticipantGrid from "./ParticipantGrid";
import TranscriptPanel from "./TranscriptPanel";

const participants = participantData as Participant[];

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function PeopleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 18a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M16.5 14a4.5 4.5 0 0 1 4 4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.5 2.7 8.1 7 10 4.3-1.9 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function MeetingRoom() {
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [hasLeft, setHasLeft] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(24 * 60 + 18);
  const {
    entries,
    isStreaming,
    isPaused,
    isComplete,
    activeTopic,
    topicIndex,
    topicCount,
    togglePause,
    restart,
  } = useTranscriptStream();

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSpeakerId = isStreaming ? entries.at(-1)?.speakerId : undefined;

  if (hasLeft) {
    return (
      <main className="meeting-ended">
        <div className="meeting-ended__mark">S</div>
        <p className="meeting-ended__eyebrow">Sidekick Meeting</p>
        <h1>Bạn đã rời cuộc họp</h1>
        <p>Product weekly vẫn đang diễn ra.</p>
        <button type="button" onClick={() => setHasLeft(false)}>Tham gia lại</button>
      </main>
    );
  }

  return (
    <main className={`meeting-shell${transcriptOpen ? "" : " meeting-shell--focused"}`}>
      <header className="meeting-header">
        <div className="meeting-brand">
          <span className="meeting-brand__mark">S</span>
          <span className="meeting-brand__word">sidekick</span>
          <span className="meeting-brand__divider" />
          <div className="meeting-title"><strong>Product weekly</strong><span>Phòng thiết kế · Hôm nay</span></div>
        </div>
        <div className="meeting-meta">
          <span className="meeting-meta__secure"><ShieldIcon /> Bảo mật</span>
          <span className="meeting-meta__people"><PeopleIcon /> {participants.length}</span>
          <time>{formatDuration(elapsedSeconds)}</time>
        </div>
      </header>

      <div className="meeting-content">
        <section className="meeting-stage">
          <div className="meeting-stage__topline">
            <div className="recording-status"><span /> Đang ghi bản họp</div>
            <div className="meeting-topic"><span>{String(topicIndex).padStart(2, "0")}/{String(topicCount).padStart(2, "0")}</span>{activeTopic}</div>
            <div className="meeting-quality"><i /><i /><i /> Kết nối tốt</div>
          </div>

          <ParticipantGrid participants={participants} activeSpeakerId={activeSpeakerId} cameraOn={cameraOn} />

          {activeSpeakerId && (
            <div className="live-caption" aria-live="polite">
              <span>{participants.find((person) => person.id === activeSpeakerId)?.name}</span>
              <p>{entries.at(-1)?.text}</p>
            </div>
          )}

          <MeetingControls
            microphoneOn={microphoneOn}
            cameraOn={cameraOn}
            transcriptOpen={transcriptOpen}
            onToggleMicrophone={() => setMicrophoneOn((current) => !current)}
            onToggleCamera={() => setCameraOn((current) => !current)}
            onToggleTranscript={() => setTranscriptOpen((current) => !current)}
            onLeave={() => setHasLeft(true)}
          />
        </section>

        {transcriptOpen && (
          <TranscriptPanel
            entries={entries}
            participants={participants}
            isStreaming={isStreaming}
            isPaused={isPaused}
            isComplete={isComplete}
            onTogglePause={togglePause}
            onRestart={restart}
            onClose={() => setTranscriptOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
