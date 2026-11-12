"use client";

// components/dashboard/ResearchPreferencesDialog.tsx — tùy chọn nghiên cứu.
//
// Thay cho "Answer Preferences" của đối thủ. Đối thủ chỉnh cách AI *trả lời thay
// bạn* (STAR, filler, tone) nên preview của họ là một câu trả lời. MeetMate không
// trả lời thay ai cả — nó tìm nguồn và gõ vào chat — nên thứ duy nhất chỉnh được
// là nghiên cứu chạy ra sao, và preview đúng phải là chính các tin sẽ vào chat.
//
// Preview đổi theo từng control, không đứng im: chọn 6 nguồn mà pipeline chỉ gửi
// 4 thì người dùng nhìn thấy 4 thẻ và một dòng nói vì sao bị cắt.
import { useState } from "react";
import { cn } from "../../lib/utils";
import {
  SOURCE_OPTIONS,
  QUERY_LANG_OPTIONS,
  defaultPrefs,
  sampleTopics,
} from "../../lib/dashboardData";
import { LIMITS } from "../../lib/types";
import { useDashboard } from "./DashboardContext";
import { ChromeDialog, RadioCard, Segmented, Switch } from "./controls";
import { MmPostList } from "./MmPost";
import { IconGauge, IconInfo, IconList, IconSend } from "./icons";

type Section = "sources" | "query" | "size";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "sources", label: "Số nguồn", icon: <IconList /> },
  { id: "query", label: "Ngôn ngữ truy vấn", icon: <IconGauge /> },
  { id: "size", label: "Cỡ chữ", icon: <IconSend /> },
];

const SIZE_OPTIONS = [
  { id: "S", label: "Nhỏ" },
  { id: "M", label: "Vừa" },
  { id: "L", label: "Lớn" },
];

export function ResearchPreferencesDialog() {
  const { prefsOpen, prefsFrom, setPrefsOpen, prefs, setPrefs, pushToast } = useDashboard();
  const [section, setSection] = useState<Section>("sources");

  const previewTopic = sampleTopics[0];
  // cái đang bật để preview, và cái trần thật sẽ cắt nó
  const capped = Math.min(prefs.sources, LIMITS.maxSources);
  const overCap = prefs.sources > LIMITS.maxSources;

  // một kiểu rộng cho hai danh sách: gộp thành union-of-arrays thì TS từ chối
  // `.map`, nên mở rộng `id` ra trước khi render
  const opts: { id: string | number; label: string; note: string }[] =
    section === "sources" ? SOURCE_OPTIONS : QUERY_LANG_OPTIONS;

  const labelFor = (id: Section) =>
    id === "sources"
      ? `${prefs.sources} nguồn`
      : id === "query"
        ? QUERY_LANG_OPTIONS.find((o) => o.id === prefs.queryLanguage)?.label ?? "—"
        : SIZE_OPTIONS.find((o) => o.id === prefs.textSize)?.label ?? "—";

  const dark = prefsFrom === "live";

  const save = () => {
    setPrefsOpen(false);
    pushToast("Đã lưu tùy chọn nghiên cứu.");
  };

  return (
    <ChromeDialog
      open={prefsOpen}
      onClose={() => setPrefsOpen(false)}
      ariaLabel="Tùy chọn nghiên cứu"
      chrome={dark ? "dark" : "theme"}
      className="pref"
    >
      <div className="pref__head">
        <div>
          <h2 className="dc-title">Tùy chọn nghiên cứu</h2>
          <p className="dc-muted">
            MeetMate tìm và gửi nguồn như thế nào — không phải nó viết thay bạn điều gì.
          </p>
        </div>
        <span className="dchip">Áp dụng cho mọi phiên</span>
      </div>

      <div className="pref__body">
        <nav className="pref__nav" aria-label="Nhóm tùy chọn">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={cn("pref__row", section === s.id && "pref__row--on")}
              aria-current={section === s.id ? "true" : undefined}
              onClick={() => setSection(s.id)}
            >
              {s.icon}
              <span className="pref__rowtext">
                <span className="pref__rowlabel">{s.label}</span>
                <span className="pref__rowvalue">{labelFor(s.id)}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="pref__detail">
          <h3 className="dc-title-sm">{SECTIONS.find((s) => s.id === section)?.label}</h3>

          {section === "size" ? (
            <Segmented
              ariaLabel="Cỡ chữ trong monitor"
              options={SIZE_OPTIONS}
              value={prefs.textSize}
              onChange={(id) => setPrefs({ textSize: id as "S" | "M" | "L" })}
            />
          ) : (
            <div role="radiogroup" aria-label={`${section} options`}>
              {opts.map((o) => (
                <RadioCard
                  key={String(o.id)}
                  selected={
                    (section === "sources" ? prefs.sources : prefs.queryLanguage) === o.id
                  }
                  onSelect={() =>
                    section === "sources"
                      ? setPrefs({ sources: o.id as number })
                      : setPrefs({ queryLanguage: o.id as "vi" | "en" | "auto" })
                  }
                  title={o.label}
                  note={o.note}
                />
              ))}
            </div>
          )}
        </div>

        {/* ba công tắc toàn cục: không thuộc nhóm nào, luôn thấy */}
        <div className="pref__more">
          <div className="pref__toggle wrow">
            <span className="wrow__text">
              <span className="wrow__label">Tự động gửi vào chat</span>
              <span className="wrow__note">
                {prefs.autoPost
                  ? "MeetMate gõ luôn khi chủ đề xong — bạn không phải bấm."
                  : "Kết quả chỉ hiện trong khung bên MeetMate, không vào chat Meet."}
              </span>
            </span>
            <Switch
              checked={prefs.autoPost}
              onChange={(v) => setPrefs({ autoPost: v })}
              label="Tự động gửi vào chat"
            />
          </div>

          <div className="pref__toggle wrow">
            <span className="wrow__text">
              <span className="wrow__label">
                Bỏ qua chuyện phiếm
                <IconInfo />
              </span>
              <span className="wrow__note">
                Chủ đề rỗng — chào hỏi, trêu nhau — không kích hoạt tìm nguồn.
                Đây là lý do pipeline có thể không gửi gì trong một đoạn họp.
              </span>
            </span>
            <Switch
              checked={prefs.skipSmallTalk}
              onChange={(v) => setPrefs({ skipSmallTalk: v })}
              label="Bỏ qua chuyện phiếm"
            />
          </div>

          <div className="pref__toggle wrow">
            <span className="wrow__text">
              <span className="wrow__label">Lưu bản ghi vào vùng làm việc</span>
              <span className="wrow__note">
                Tắt thì phiên chỉ sống trong khung bên MeetMate, tab này không còn gì để xem lại.
              </span>
            </span>
            <Switch
              checked={prefs.saveTranscript}
              onChange={(v) => setPrefs({ saveTranscript: v })}
              label="Lưu bản ghi vào vùng làm việc"
            />
          </div>
        </div>

        {/* preview rail — chính là tin sẽ vào chat, đổi theo control */}
        <div className="pref__preview">
          <p className="pref__previewlabel">Xem trước tin gửi vào chat Meet</p>
          <div className="mpreview" data-size={prefs.textSize}>
            {previewTopic ? (
              <MmPostList
                result={previewTopic.result}
                sources={prefs.sources}
                posted={prefs.autoPost ? undefined : 0}
              />
            ) : null}
            {overCap ? (
              <div className="mm-band mm-band--warn">
                <IconInfo className="mm-band__glyph" />
                <span>
                  Bạn chọn {prefs.sources} nguồn, pipeline chỉ gửi {LIMITS.maxSources}. Preview
                  đang hiện {capped} thẻ — nới trần là sửa LIMITS trong lib/types.ts, không phải
                  ở đây.
                </span>
              </div>
            ) : null}
            {!prefs.autoPost ? (
              <div className="mm-band mm-band--warn">
                <IconInfo className="mm-band__glyph" />
                <span>
                  Tự động gửi đang tắt: {capped} tin này chỉ hiện trong khung bên MeetMate.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pref__foot">
        <button
          className="btn btn--dark-ghost"
          onClick={() => {
            setPrefs(defaultPrefs);
            pushToast("Đã đặt lại về mặc định.");
          }}
        >
          Mặc định
        </button>
        <button className={cn("btn", dark ? "btn--light" : "btn--primary")} onClick={save}>
          Lưu
        </button>
      </div>
    </ChromeDialog>
  );
}
