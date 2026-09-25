"use client";

import type { ReactNode } from "react";

type MeetingControlsProps = {
  microphoneOn: boolean;
  cameraOn: boolean;
  transcriptOpen: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onToggleTranscript: () => void;
  onLeave: () => void;
};

function Icon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24">{children}</svg>;
}

type ControlButtonProps = {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

function ControlButton({ label, active = true, danger = false, onClick, children }: ControlButtonProps) {
  return (
    <button type="button" className={`meeting-control${!active ? " is-off" : ""}${danger ? " meeting-control--danger" : ""}`} aria-label={label} title={label} onClick={onClick}>
      <span className="meeting-control__icon">{children}</span>
      <span className="meeting-control__label">{label}</span>
    </button>
  );
}

export default function MeetingControls({ microphoneOn, cameraOn, transcriptOpen, onToggleMicrophone, onToggleCamera, onToggleTranscript, onLeave }: MeetingControlsProps) {
  return (
    <nav className="meeting-controls" aria-label="Điều khiển cuộc họp">
      <ControlButton label={microphoneOn ? "Tắt mic" : "Bật mic"} active={microphoneOn} onClick={onToggleMicrophone}>
        {microphoneOn ? <Icon><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" /></Icon> : <Icon><path d="m4 4 16 16M9 9v3a3 3 0 0 0 4.4 2.65M15 10V7a3 3 0 0 0-5.1-2.1M17 11v1a5 5 0 0 1-.6 2.4M7 11v1a5 5 0 0 0 7.9 4.1M12 17v4M8 21h8" /></Icon>}
      </ControlButton>
      <ControlButton label={cameraOn ? "Tắt camera" : "Bật camera"} active={cameraOn} onClick={onToggleCamera}>
        {cameraOn ? <Icon><rect x="3" y="6" width="13" height="12" rx="3" /><path d="m16 10 5-3v10l-5-3" /></Icon> : <Icon><path d="m3 3 18 18M14.5 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h9a3 3 0 0 0 2.1-.9M16 9.5 21 7v10l-5-2.5V11" /></Icon>}
      </ControlButton>
      <ControlButton label="Chia sẻ"><Icon><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M9 10l3-3 3 3M12 7v7" /></Icon></ControlButton>
      <ControlButton label={transcriptOpen ? "Ẩn bản ghi" : "Mở bản ghi"} active={transcriptOpen} onClick={onToggleTranscript}><Icon><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></Icon></ControlButton>
      <ControlButton label="Thêm"><Icon><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon></ControlButton>
      <span className="meeting-controls__divider" />
      <ControlButton label="Rời cuộc họp" danger onClick={onLeave}><Icon><path d="M7 12.5a16 16 0 0 1 10 0M6.2 12.8l-2.7 2.7a2 2 0 0 0 0 2.8l1.2 1.2a2 2 0 0 0 2.8 0l2-2M17.8 12.8l2.7 2.7a2 2 0 0 1 0 2.8l-1.2 1.2a2 2 0 0 1-2.8 0l-2-2" /></Icon></ControlButton>
    </nav>
  );
}
