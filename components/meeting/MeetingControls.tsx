"use client";

// components/meeting/MeetingControls.tsx — chỉ những nút thật sự chạy.
//
// Bản cũ có tám nút: mic, camera, chia sẻ, "Thêm", rời cuộc họp, tham gia lại.
// Không cái nào trong số đó là việc của MeetMate — extension không tắt mic của
// bạn, không bật camera, không rời họp thay bạn, và bản demo web thì không có
// quyền gì với tab Meet. Một nút chết còn hại hơn một nút thiếu: người dùng bấm
// rồi tin là mic đã tắt.
//
// Hai nút còn lại chạy thật ở client: chúng điều khiển bản phát lại trong trang
// này, và nhãn nói đúng điều đó.
import { IconPanel, IconPlay } from "../dashboard/icons";

type Props = {
  paused: boolean;
  complete: boolean;
  transcriptOpen: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleTranscript: () => void;
};

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={16} height={16}>
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

export default function MeetingControls({
  paused,
  complete,
  transcriptOpen,
  onTogglePause,
  onRestart,
  onToggleTranscript,
}: Props) {
  const pauseLabel = complete ? "Phát lại từ đầu" : paused ? "Tiếp tục bản ghi" : "Tạm dừng bản ghi";

  return (
    <div className="meeting-controls__wrap">
      <nav className="meeting-controls" aria-label="Điều khiển bản phát lại">
        <button
          type="button"
          className={`meeting-control${paused ? " is-off" : ""}`}
          aria-label={pauseLabel}
          title="Chỉ điều khiển bản phát lại trong trang này — không tắt mic hay camera của bạn"
          onClick={complete ? onRestart : onTogglePause}
        >
          <span className="meeting-control__icon">{paused || complete ? <IconPlay /> : <PauseIcon />}</span>
          <span className="meeting-control__label">
            {complete ? "Phát lại" : paused ? "Tiếp tục" : "Tạm dừng"}
          </span>
        </button>

        <button
          type="button"
          className="meeting-control"
          aria-label={transcriptOpen ? "Ẩn bảng bản ghi" : "Mở bảng bản ghi"}
          onClick={onToggleTranscript}
        >
          <span className="meeting-control__icon">
            <IconPanel />
          </span>
          <span className="meeting-control__label">{transcriptOpen ? "Ẩn bản ghi" : "Mở bản ghi"}</span>
        </button>
      </nav>
      <p className="meeting-controls__hint">
        Hai nút này điều khiển bản phát lại trong trang, không điều khiển mic, camera
        hay tab Meet — những việc đó thuộc về tiện ích Chrome.
      </p>
    </div>
  );
}
