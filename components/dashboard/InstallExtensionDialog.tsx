"use client";

// components/dashboard/InstallExtensionDialog.tsx — cổng giữa wizard và monitor.
//
// Web console không tự ghi âm được: thứ nghe cuộc họp là extension Chrome, chạy
// trong trình duyệt của người dùng. Nên bước giữa "tạo phiên" và "theo dõi phiên"
// không phải "chọn nền tảng gọi" như đối thủ, mà là "cài và bật MeetMate".
//
// Ba bước dưới đây là thật theo plan extension (2026-11-01-meetmate-extension.md),
// và cũng là thứ chưa tồn tại: thư mục `extension/` chưa có trong repo. Dialog vì
// thế tự khai nó đang mô phỏng — web app không có kênh nào để dò xem extension đã
// được cài hay chưa, nên giả vờ "đã phát hiện MeetMate" sẽ là một lời nói dối.
//
// Khóa API không nằm ở đây, và không có ô nhập nào cho nó. blazeApiKey/exaApiKey
// chỉ sống trong chrome.storage.local của popup; web app không cầm, không gửi,
// không hiển thị trường nhập khóa (mục an toàn của bản mô tả).
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { MEETING_KIND_LABEL } from "../../lib/dashboardData";
import type { MeetingRecord } from "../../lib/dashboardData";
import { useDashboard } from "./DashboardContext";
import { ChromeDialog } from "./controls";
import {
  IconCheck,
  IconInfo,
  IconPlay,
  IconShield,
  IconUpload,
  IconX,
} from "./icons";

const STEPS = [
  {
    id: "unpack",
    icon: IconUpload,
    title: "Tải tiện ích chưa đóng gói vào Chrome",
    note: "Mở chrome://extensions, bật Chế độ dành cho nhà phát triển, chọn “Tải tiện ích đã giải nén” và trỏ vào thư mục extension/ của dự án.",
    code: "chrome://extensions",
  },
  {
    id: "tab",
    icon: IconPlay,
    title: "Mở tab Google Meet và bật mic",
    note: "MeetMate đọc âm thanh của tab Meet và micro của bạn — hai kênh đó là toàn bộ những gì nó nghe được.",
    code: "meet.google.com",
  },
  {
    id: "keys",
    icon: IconShield,
    title: "Nhập khóa Blaze và Exa trong popup",
    note: "Hai ô khóa nằm trong popup extension, không nằm ở đây. Khóa không đi qua web app và không nằm trong mã nguồn.",
    code: "MeetMate → Cài đặt",
  },
];

export function InstallExtensionDialog() {
  const { installFor, cancelInstall, addMeeting, startLive, openWizard, pushToast } = useDashboard();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<string | null>(null);

  // một bản nháp mới = danh sách check mới
  useEffect(() => {
    if (installFor && installFor.title !== draftRef.current) {
      draftRef.current = installFor.title;
      setDone({});
      setBusy(false);
    }
  }, [installFor]);

  if (!installFor) return null;

  const draft = installFor;
  const allDone = STEPS.every((s) => done[s.id]);
  const remaining = STEPS.length - STEPS.filter((s) => done[s.id]).length;

  const start = () => {
    if (busy) return;
    setBusy(true);
    // short beat before the monitor, the way the real handoff feels
    window.setTimeout(() => {
      const record: MeetingRecord = {
        id: `m-${Date.now()}`,
        title: draft.title,
        kind: draft.kind,
        startedAt: new Date().toISOString().slice(0, 19),
        durationSec: 0,
        topicCount: 0,
        sourceCount: 0,
        status: "live",
      };
      addMeeting(record);
      startLive(draft, record.id);
      pushToast("MeetMate đang nghe tab Meet.");
    }, 550);
  };

  return (
    <ChromeDialog open onClose={cancelInstall} ariaLabel="Cài MeetMate để bắt đầu ghi" className="conn">
      <div className="conn__head">
        <div>
          <h2 className="dc-title">
            <IconPlay />
            Bắt đầu MeetMate
          </h2>
          <p className="dc-muted">
            {draft.title} · {MEETING_KIND_LABEL[draft.kind]}
          </p>
        </div>
        <button className="icon-btn icon-btn--dark" aria-label="Đóng" onClick={cancelInstall}>
          <IconX />
        </button>
      </div>

      <p className="conn__label">Ba bước để MeetMate nghe được cuộc họp</p>

      <ol className="insteps">
        {STEPS.map((s, i) => {
          const on = !!done[s.id];
          const Icon = s.icon;
          return (
            <li key={s.id} className={cn("instep", on && "instep--on")}>
              <button
                type="button"
                className="instep__check"
                role="checkbox"
                aria-checked={on}
                aria-label={`Đã xong: ${s.title}`}
                onClick={() => setDone((d) => ({ ...d, [s.id]: !d[s.id] }))}
              >
                {on ? <IconCheck /> : <span className="instep__n">{i + 1}</span>}
              </button>
              <span className="instep__text">
                <span className="instep__title">
                  <Icon />
                  {s.title}
                </span>
                <span className="instep__note">{s.note}</span>
                <code className="instep__code">{s.code}</code>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mm-band mm-band--warn conn__band">
        <IconInfo className="mm-band__glyph" />
        <span>
          Bản dựng extension chưa có trong repo, nên web console không kiểm tra được
          ba bước trên — bạn tự tích. Đây là bản mô phỏng luồng, không phải trình cài đặt.
        </span>
      </div>

      <div className="conn__foot">
        <button
          className="btn btn--dark-ghost"
          onClick={() => {
            cancelInstall();
            openWizard();
          }}
        >
          Quay lại
        </button>
        <button className="btn btn--light" onClick={start} disabled={busy || !allDone}>
          {busy ? "Đang bật MeetMate…" : allDone ? "Bắt đầu phiên" : `Còn ${remaining} bước`}
        </button>
      </div>

      <div className="sr-only" aria-live="polite">
        {busy ? "Đang bật MeetMate" : ""}
      </div>
    </ChromeDialog>
  );
}
