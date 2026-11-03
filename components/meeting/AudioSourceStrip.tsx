"use client";

// components/meeting/AudioSourceStrip.tsx — hai lane âm thanh, thay cho lưới người tham gia.
//
// Trang cũ vẽ bốn ô "người tham gia" với tên và avatar, chiếm trọn giữa sân khấu.
// MeetMate không có dữ liệu đó: extension chỉ tai hai kênh — âm thanh phát ra từ
// tab Meet và micro của chính người dùng. Vẽ một roster ở đây là vẽ thứ mà hệ
// thống không thu thập.
//
// Kế hoạch nói rõ dải nguồn âm THAY cho lưới đó, nên nó chiếm luôn chỗ giữa sân
// khấu chứ không co lại thành một thẻ nhỏ trôi lên đầu trang: mỗi lane giữ những
// dòng gần nhất của kênh mình, và dòng mới nhất của kênh vừa nói là caption.
// Không còn caption riêng ở dưới — hai lane đã là caption, và nó ghi kênh chứ
// không ghi ai, đúng như dòng note cuối dải nói.
import type { AudioSource, MeetingLine } from "../../lib/types";
import { audioSourceLabel, stampFromMs } from "../../lib/formatChat";
import { IconMic, IconMonitor } from "../dashboard/icons";

const CHANNELS: AudioSource[] = ["tab", "mic"];
/** Đuôi mỗi lane: đủ dài để lane không còn là một khoảng trống, và phần tràn
    trên bị mask làm mờ vì nó đã chạy qua rồi. */
const LANE_TAIL = 6;

export default function AudioSourceStrip({
  counts,
  active,
  paused,
  lines,
}: {
  counts: Record<AudioSource, number>;
  /** kênh vừa sinh ra dòng gần nhất */
  active: AudioSource | null;
  paused: boolean;
  lines: MeetingLine[];
}) {
  return (
    <div className="mmk-sources">
      {CHANNELS.map((ch) => {
        const lane = lines.filter((l) => l.source === ch).slice(-LANE_TAIL);
        const isOn = active === ch && !paused;
        return (
          <div key={ch} className="mmk-src" data-on={isOn ? "yes" : "no"}>
            <div className="mmk-src__head">
              <span className="mmk-src__icon">
                {ch === "tab" ? (
                  <IconMonitor width={15} height={15} />
                ) : (
                  <IconMic width={15} height={15} />
                )}
              </span>
              <span className="mmk-src__label">{audioSourceLabel(ch)}</span>
              <span className="mmk-src__bars" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="mmk-src__count">{counts[ch]} dòng</span>
            </div>

            {lane.length === 0 ? (
              <p className="mmk-src__quiet">
                {paused ? "Kênh này đang tạm dừng." : "Chưa có dòng nào trên kênh này."}
              </p>
            ) : (
              <div className="mmk-src__lines" aria-live="polite">
                {lane.map((l, i) => (
                  <p
                    key={l.id}
                    className={`mmk-src__line${i === lane.length - 1 ? " is-newest" : ""}`}
                  >
                    <span className="mmk-src__stamp">{stampFromMs(l.atMs)}</span>
                    <span className="mmk-src__text">{l.text}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="mmk-sources__note">
        MeetMate không biết ai đang nói — hai kênh trên là toàn bộ những gì nó nghe
        được, và caption nào cũng chỉ ghi kênh.
      </p>
    </div>
  );
}
