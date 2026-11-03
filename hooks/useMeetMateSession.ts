"use client";

// hooks/useMeetMateSession.ts — bộ máy của một phiên đang xem.
//
// Trang `/` và overlay trong web console cùng nhìn vào một machine ở đây: đồng
// hồ chạy, dòng nào đã xuất hiện, chủ đề nào đã được phát hiện, kết quả đang ở
// bước nào của pipeline. MeetingMonitor trong dashboard có machine riêng vì nó
// còn gắn với quota/leave/end của DashboardContext; hai chỗ dùng chung toàn bộ
// dữ liệu và hằng số dưới đây, nên không thể lệch nhau về "dòng nào sinh chủ đề
// nào".
//
// Hai bất biến trung thực:
//   - replay chạy nhanh ×8, và đó là tốc độ PHÁT, không phải tốc độ phiên âm.
//     Người xem phải thấy điều đó trong nhãn đồng hồ.
//   - độ trễ mô hình thì KHÔNG nén: getResearchResult vẫn 2–4 giây thật, vì đó
//     là chi phí người dùng sẽ chờ trong sản phẩm thật.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatClock, sampleLines, sampleTopics } from "../lib/dashboardData";
import { getResearchResult } from "../lib/mockApi";
import {
  LIMITS,
  type AudioSource,
  type MeetingLine,
  type PipelineStage,
  type ResearchResult,
  type Topic,
} from "../lib/types";

/** 12 dòng của mocks/meeting-transcript.json chạy hết trong ~30 giây. */
export const SIM_SPEED = 8;

const WAIT_STAGE_MS = 900;
const WAIT_POST_MS = 850;

/** Dòng nào kết thúc một chủ đề thì chủ đề đó được kích hoạt. */
const TRIGGERS = [
  { atLine: 3, topicIdx: 0 },
  { atLine: 8, topicIdx: 1 },
  { atLine: 11, topicIdx: 2 },
];

export interface SessionCard {
  key: number;
  topic: Topic;
  result: ResearchResult | null;
  stage: PipelineStage | null;
  /** số tin đã thực sự hiện ra trong chat Meet */
  revealed: number;
  /** số tin chủ đề này gửi được trước khi bị ngắt hoặc xong hẳn */
  posted: number;
  /** chủ đề mới đã đến trước khi gửi xong → phần còn lại không gửi nữa */
  killed: boolean;
  /** chỉ số dòng bản ghi mà chủ đề này nối vào, để vẽ vạch phân cách */
  atLine: number;
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

// Mở đầu không được để trống: trang mà hiện "chưa có dòng nào" trong hai giây
// đầu thì người xem không phân biệt được MeetMate đang chậm hay đang chết.
// Đồng hồ do đó khởi động ở đúng vị trí dòng đầu tiên.
const INITIAL_CLOCK_MS = sampleLines[0] ? sampleLines[0].atMs / SIM_SPEED : 0;

export function useMeetMateSession() {
  const [clockMs, setClockMs] = useState(INITIAL_CLOCK_MS);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [cards, setCards] = useState<SessionCard[]>([]);

  const cardSeq = useRef(0);
  const dead = useRef<Set<number>>(new Set());
  const started = useRef<Set<number>>(new Set());

  // đồng hồ
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setClockMs((ms) => ms + 100), 100);
    return () => window.clearInterval(t);
  }, [paused, runId]);

  // một lần phát lại mới = xóa máy chủ đề
  useEffect(() => {
    cardSeq.current = 0;
    dead.current = new Set();
    started.current = new Set();
    setCards([]);
  }, [runId]);

  const clockSec = (clockMs / 1000) * SIM_SPEED;
  const lines: MeetingLine[] = sampleLines.filter((l) => l.atMs / 1000 <= clockSec);
  const complete = lines.length === sampleLines.length;

  const patch = useCallback((key: number, p: Partial<SessionCard>) => {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...p } : c)));
  }, []);

  const runTopic = useCallback(
    async (topicIdx: number, atLine: number) => {
      const entry = sampleTopics[topicIdx];
      if (!entry) return;

      // Chủ đề mới đến trước khi chủ đề cũ gửi xong → phần còn lại của chủ đề cũ
      // không gửi nữa. Hành vi này lấy từ mocks/meetmate-output.json, không phải
      // một hiệu ứng trình diễn.
      setCards((prev) =>
        prev.map((c) => {
          if (!c.stage) return c;
          dead.current.add(c.key);
          return { ...c, stage: null, killed: true };
        })
      );

      const key = ++cardSeq.current;
      setCards((prev) => [
        ...prev,
        {
          key,
          topic: entry.topic,
          result: null,
          stage: "topic",
          revealed: 0,
          posted: entry.posted,
          killed: false,
          atLine,
        },
      ]);

      const stop = () => dead.current.has(key);
      const kill = () => patch(key, { stage: null, killed: true });

      await wait(WAIT_STAGE_MS);
      if (stop()) return kill();
      patch(key, { stage: "searching" });

      const result = await getResearchResult(entry.topic);
      if (stop()) return kill();
      patch(key, { stage: "writing", result });

      await wait(WAIT_STAGE_MS);
      if (stop()) return kill();
      patch(key, { stage: "posting" });

      const total = 1 + Math.min(result.sources.length, LIMITS.maxSources);
      const landable = Math.min(entry.posted, total);
      for (let i = 1; i <= landable; i++) {
        await wait(WAIT_POST_MS);
        if (stop()) break;
        patch(key, { revealed: i });
      }
      if (stop()) return kill();
      patch(key, { stage: null });
    },
    [patch]
  );

  useEffect(() => {
    if (paused) return;
    for (const t of TRIGGERS) {
      if (lines.length > t.atLine && !started.current.has(t.topicIdx)) {
        started.current.add(t.topicIdx);
        void runTopic(t.topicIdx, t.atLine);
      }
    }
  }, [lines.length, paused, runTopic]);

  const running = cards.find((c) => c.stage);
  const stage: PipelineStage | null = running
    ? running.stage
    : paused
      ? null
      : complete
        ? "listening"
        : "transcribing";

  const counts: Record<AudioSource, number> = {
    tab: lines.filter((l) => l.source === "tab").length,
    mic: lines.filter((l) => l.source === "mic").length,
  };

  const sourceCount = cards.reduce((n, c) => n + (c.result?.sources.length ?? 0), 0);
  const postCount = cards.reduce((n, c) => n + c.revealed, 0);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const restart = useCallback(() => {
    setClockMs(INITIAL_CLOCK_MS);
    setPaused(false);
    setRunId((r) => r + 1);
  }, []);

  return {
    lines,
    cards,
    stage,
    running,
    paused,
    complete,
    counts,
    sourceCount,
    postCount,
    clock: formatClock(clockSec),
    /** giây phiên đã chạy, dùng cho nhãn trần thời gian của gói Free */
    sessionSec: clockSec,
    togglePause,
    restart,
  };
}

export { TRIGGERS as TOPIC_TRIGGERS };
