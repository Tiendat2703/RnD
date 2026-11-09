"use client";

// components/dashboard/InstallExtensionDialog.tsx — cổng giữa wizard và monitor.
//
// Web console không tự ghi âm được: thứ nghe cuộc họp là extension Chrome. Hộp
// thoại này đi hai pha:
//   1. "check" — hỏi extension qua cầu nối (lib/extensionBridge) xem nó có đó
//      không, đã có khóa chưa, có tab Meet nào đang họp không. Cả ba dấu tích
//      đều do extension trả lời, không phải do người dùng tự tích.
//   2. "waiting" — phiên đã gửi sang extension. Chrome chỉ cho extension ghi âm
//      một tab khi người dùng bấm vào biểu tượng của nó, nên bước cuối phải do
//      người dùng làm trong tab Meet. Khi extension báo "đang chạy" cho đúng phiên
//      này, monitor tự mở.
//
// Khóa API không đi qua đây và không có ô nhập nào cho nó.
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { MEETING_KIND_LABEL } from "../../lib/dashboardData";
import type { MeetingRecord } from "../../lib/dashboardData";
import type { ExtInfo } from "../../lib/bridgeProtocol";
import { onExtensionEvent, pingExtension, sendToExtension } from "../../lib/extensionBridge";
import { useDashboard } from "./DashboardContext";
import { ChromeDialog } from "./controls";
import { IconCheck, IconInfo, IconPlay, IconShield, IconUpload, IconX } from "./icons";

const POLL_MS = 2000;

interface Check {
  id: string;
  icon: typeof IconUpload;
  title: string;
  ok: boolean;
  note: string;
  code: string;
}

function checksFor(info: ExtInfo | null): Check[] {
  return [
    {
      id: "ext",
      icon: IconUpload,
      title: info ? `Đã phát hiện MeetMate ${info.version}` : "Cài tiện ích MeetMate vào Chrome",
      ok: info !== null,
      note: info
        ? "Web console đang nói chuyện được với extension."
        : "Mở chrome://extensions, bật Chế độ dành cho nhà phát triển, chọn “Tải tiện ích đã giải nén” và trỏ vào thư mục dist-extension. Cài xong thì tải lại trang này.",
      code: "agents/sidekick/dist-extension",
    },
    {
      id: "keys",
      icon: IconShield,
      title: info?.mock
        ? "Extension đang ở chế độ thử — không cần khóa"
        : info?.keysSet
          ? "Đã có khóa Blaze và Exa"
          : "Nhập khóa Blaze và Exa trong popup",
      ok: !!info?.keysSet,
      note: "Hai ô khóa nằm trong popup extension, không nằm ở đây. Khóa không đi qua web app.",
      code: "MeetMate → popup",
    },
    {
      id: "tab",
      icon: IconPlay,
      title:
        info && info.meetTabs > 0
          ? `Đã thấy ${info.meetTabs} tab Google Meet đang họp`
          : "Mở tab Google Meet và vào cuộc họp",
      ok: !!info && info.meetTabs > 0,
      note: "MeetMate nghe âm thanh của tab Meet và micro của bạn — hai kênh đó là toàn bộ những gì nó nghe được.",
      code: "meet.google.com",
    },
  ];
}

export function InstallExtensionDialog() {
  const { installFor, cancelInstall, addMeeting, startLive, openWizard, pushToast, prefs } =
    useDashboard();
  const [info, setInfo] = useState<ExtInfo | null>(null);
  const [phase, setPhase] = useState<"check" | "waiting">("check");
  const [waitStatus, setWaitStatus] = useState("");
  // tự tick để bỏ qua một điều kiện khi test luồng; dấu tích tự động vẫn thắng
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const draftRef = useRef<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  // một bản nháp mới = quay về pha kiểm tra
  useEffect(() => {
    if (installFor && installFor.title !== draftRef.current) {
      draftRef.current = installFor.title;
      sessionRef.current = null;
      setPhase("check");
      setWaitStatus("");
      setInfo(null);
      setManual({});
    }
    if (!installFor) draftRef.current = null;
  }, [installFor]);

  // pha kiểm tra: hỏi extension định kỳ, vì tab Meet và khóa có thể thay đổi bất cứ lúc nào
  useEffect(() => {
    if (!installFor || phase !== "check") return;
    let alive = true;
    const tick = async () => {
      const next = await pingExtension();
      if (alive) setInfo(next);
    };
    void tick();
    const t = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [installFor, phase]);

  // pha chờ: extension báo đang chạy cho đúng phiên này thì mở monitor
  const beginExtensionSession = (id: string) => {
    if (!installFor) return;
    const record: MeetingRecord = {
      id,
      title: installFor.title,
      kind: installFor.kind,
      startedAt: new Date().toISOString().slice(0, 19),
      durationSec: 0,
      topicCount: 0,
      sourceCount: 0,
      status: "live",
    };
    addMeeting(record);
    startLive(installFor, record.id, "extension");
    pushToast("MeetMate đang nghe — theo dõi ngay trong tab Meet.");
  };

  useEffect(() => {
    if (!installFor || phase !== "waiting") return;
    return onExtensionEvent((ev) => {
      if (ev.type === "status") {
        setWaitStatus(ev.status);
        if (ev.running && ev.sessionId && ev.sessionId === sessionRef.current) {
          beginExtensionSession(ev.sessionId);
        }
      } else if (ev.type === "error") {
        setWaitStatus(ev.message);
      }
    });
  }, [installFor, phase, addMeeting, startLive, pushToast]);

  if (!installFor) return null;

  const draft = installFor;
  const checks = checksFor(info).map((c) => ({ ...c, auto: c.ok, ok: c.ok || !!manual[c.id] }));
  const allDone = checks.every((c) => c.ok);
  const remaining = checks.filter((c) => !c.ok).length;

  const sendSession = () => {
    const id = `m-${Date.now()}`;
    sessionRef.current = id;
    sendToExtension({
      type: "session.prepare",
      session: {
        id,
        title: draft.title,
        kind: draft.kind,
        sources: prefs.sources,
        autoPost: prefs.autoPost,
      },
    });
    setWaitStatus("");
    setPhase("waiting");
  };

  // dữ liệu mẫu: giữ lại để xem giao diện khi không có extension; nói thẳng là mẫu
  const startDemo = () => {
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
    startLive(draft, record.id, "demo");
    pushToast("Đang phát lại cuộc họp mẫu — không có extension nào đang nghe.");
  };

  const cancel = () => {
    if (phase === "waiting") sendToExtension({ type: "session.stop" });
    cancelInstall();
  };

  return (
    <ChromeDialog open onClose={cancel} ariaLabel="Bắt đầu MeetMate" className="conn">
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
        <button className="icon-btn icon-btn--dark" aria-label="Đóng" onClick={cancel}>
          <IconX />
        </button>
      </div>

      {phase === "check" ? (
        <>
          <p className="conn__label">Ba điều MeetMate cần để nghe được cuộc họp</p>

          <ol className="insteps">
            {checks.map((c, i) => {
              const Icon = c.icon;
              return (
                <li key={c.id} className={cn("instep", c.ok && "instep--on")}>
                  <button
                    type="button"
                    className="instep__check"
                    role="checkbox"
                    aria-checked={c.ok}
                    aria-label={`${c.ok ? "Đã sẵn sàng" : "Tự tick để bỏ qua"}: ${c.title}`}
                    title={c.auto ? "Extension đã xác nhận" : "Bấm để tự tick (bỏ qua khi test)"}
                    disabled={c.auto}
                    onClick={() => setManual((m) => ({ ...m, [c.id]: !m[c.id] }))}
                  >
                    {c.ok ? <IconCheck /> : <span className="instep__n">{i + 1}</span>}
                  </button>
                  <span className="instep__text">
                    <span className="instep__title">
                      <Icon />
                      {c.title}
                    </span>
                    <span className="instep__note">{c.note}</span>
                    <code className="instep__code">{c.code}</code>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mm-band mm-band--warn conn__band">
            <IconInfo className="mm-band__glyph" />
            <span>
              Dấu tích tự bật khi extension xác nhận (cập nhật mỗi {POLL_MS / 1000} giây). Đang
              test luồng? Bấm vào vòng tròn từng điều kiện để tự tick bỏ qua.
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
            <button className="btn btn--dark-ghost" onClick={startDemo}>
              Chạy thử với dữ liệu mẫu
            </button>
            <button className="btn btn--light" onClick={sendSession} disabled={!allDone}>
              {allDone ? "Gửi phiên cho MeetMate" : `Còn ${remaining} điều`}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="conn__label">Phiên đã gửi — còn một bước ở tab Meet</p>

          <ol className="insteps">
            <li className="instep instep--on">
              <span className="instep__check" role="img" aria-label="Xong">
                <IconCheck />
              </span>
              <span className="instep__text">
                <span className="instep__title">Đã gửi “{draft.title}” cho extension</span>
              </span>
            </li>
            <li className="instep">
              <span className="instep__check" role="img" aria-label="Đang chờ">
                <span className="instep__n">2</span>
              </span>
              <span className="instep__text">
                <span className="instep__title">
                  Trong tab Meet, bấm biểu tượng MeetMate rồi bấm “Bắt đầu”
                </span>
                <span className="instep__note">
                  Chrome chỉ cho phép ghi âm một tab sau khi bạn bấm vào biểu tượng extension, nên
                  bước này không thể làm thay từ trang web. Khi bắt đầu, panel MeetMate hiện ngay
                  trong trang Meet; hộp thoại này tự đóng.
                </span>
              </span>
            </li>
          </ol>

          <div className="mm-band mm-band--warn conn__band" role="status" aria-live="polite">
            <IconInfo className="mm-band__glyph" />
            <span>{waitStatus || "Đang chờ extension báo đã bắt đầu nghe…"}</span>
          </div>

          <div className="conn__foot">
            <button className="btn btn--dark-ghost" onClick={cancel}>
              Hủy phiên
            </button>
            <button
              className="btn btn--dark-ghost"
              onClick={() => sessionRef.current && beginExtensionSession(sessionRef.current)}
              title="Chỉ để thử luồng: coi như extension đã bắt đầu nghe"
            >
              Bỏ qua, coi như đã bắt đầu
            </button>
          </div>
        </>
      )}
    </ChromeDialog>
  );
}
