"use client";

// components/meeting/MeetingRoom.tsx — trang `/`: MeetMate đang nghe một cuộc họp.
//
// Trang cũ là một phòng họp giả lập: lưới avatar, nút mic/camera/chia sẻ, màn
// hình "bạn đã rời cuộc họp". MeetMate không phải phòng họp — nó là một tiện ích
// ngồi trong tab Meet và làm ba việc: nghe, tách chủ đề cần kiểm chứng, tìm nguồn
// rồi gõ kết quả vào chat Meet. Trang này vì vậy vẽ đúng ba việc đó, và chỉ những
// gì nó thực sự có:
//
//   - hai kênh âm (tab Meet, micro) thay cho roster — `ParticipantGrid`/
//     `ParticipantTile` đã xóa cùng các mock khai sinh ra nó;
//   - một đồng hồ đang chạy, duy nhất;
//   - dòng thời gian chủ đề → nguồn → tin đã vào chat, do các card trong
//     `components/ai-sidekick/` vẽ trên dữ liệu `toChatPosts()`.
//
// Ba card đó là hiện thân của `AIResultCard`/`AISidekickPanel`/`AIAnalyzingPopup`
// mà bản replatform gọi tên; bản trong web console (`MmPost`, `PipelineBar`) giữ
// nguyên vì stylesheet của dashboard khai token trên `.dash`, nên không dùng
// được cho route ngoài dashboard.
import Link from "next/link";
import { useState } from "react";
import { MEETING_KIND_LABEL, initialMeetings } from "../../lib/dashboardData";
import { SIM_SPEED, useMeetMateSession } from "../../hooks/useMeetMateSession";
import AIAnalyzingPopup from "../../components/ai-sidekick/AIAnalyzingPopup";
import StatusBar, { useMicAvailability } from "../../components/ai-sidekick/StatusBar";
import AudioSourceStrip from "./AudioSourceStrip";
import MeetingControls from "./MeetingControls";
import TranscriptPanel from "./TranscriptPanel";
import { IconLogo, IconRobot } from "../dashboard/icons";

/** phiên đang chạy trong web console — `/` và dashboard phải cùng một cuộc họp. */
const liveMeeting = initialMeetings.find((m) => m.status === "live") ?? initialMeetings[0];

export default function MeetingRoom() {
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const session = useMeetMateSession();
  const degraded = useMicAvailability();

  const last = session.lines.at(-1);
  const activeSource = last?.source ?? null;

  return (
    <main className={`meeting-shell${transcriptOpen ? "" : " meeting-shell--focused"}`}>
      <header className="meeting-header">
        <div className="meeting-brand">
          <span className="meeting-brand__mark">
            <IconLogo width={18} height={18} />
          </span>
          <span className="meeting-brand__word">meetmate</span>
          <span className="meeting-brand__divider" />
          <div className="meeting-title">
            <strong>{liveMeeting.title}</strong>
            <span>{MEETING_KIND_LABEL[liveMeeting.kind]} · tab Meet</span>
          </div>
        </div>

        <div className="meeting-meta">
          {/* một đồng hồ duy nhất: mọi mốc khác trên trang là vị trí dòng, không phải đồng hồ thứ hai */}
          <span
            className="meeting-clock"
            title={`Vị trí trong bản ghi. Bản phát lại chạy ở tốc độ ×${SIM_SPEED}, không phải tốc độ phiên âm.`}
          >
            {session.clock}
          </span>
          <Link className="meeting-meta__console" href="/dashboard/callSessions">
            <IconRobot width={14} height={14} />
            Web console
          </Link>
        </div>
      </header>

      <div className="meeting-content">
        <section className="meeting-stage">
          <div className="meeting-stage__topline">
            <div className="recording-status" data-on={session.paused ? "no" : "yes"}>
              <span aria-hidden />
              {session.paused ? "Đang tạm dừng" : "Đang lắng nghe"}
            </div>
            <div className="meeting-topic">
              <span>{String(session.cards.length).padStart(2, "0")}</span>
              chủ đề đã phát hiện
            </div>
          </div>

          <StatusBar degraded={degraded} />

          <AudioSourceStrip
            counts={session.counts}
            active={activeSource}
            paused={session.paused}
            lines={session.lines}
          />

          <AIAnalyzingPopup stage={session.stage} card={session.running} />

          <MeetingControls
            paused={session.paused}
            complete={session.complete}
            transcriptOpen={transcriptOpen}
            onTogglePause={session.togglePause}
            onRestart={session.restart}
            onToggleTranscript={() => setTranscriptOpen((v) => !v)}
          />
        </section>

        {transcriptOpen ? (
          <TranscriptPanel
            lines={session.lines}
            cards={session.cards}
            sourceCount={session.sourceCount}
            postCount={session.postCount}
            paused={session.paused}
            complete={session.complete}
            meetingTitle={liveMeeting.title}
            onTogglePause={session.togglePause}
            onRestart={session.restart}
            onClose={() => setTranscriptOpen(false)}
          />
        ) : null}
      </div>
    </main>
  );
}
