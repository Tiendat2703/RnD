"use client";

// app/page.tsx — luồng AI lắng nghe thụ động, có 2 scenarios để chọn.
// Bấm 1 scenario → transcript tự chạy → AI tự SHOW tài liệu / dashboard khi nghe keyword.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio,
  Play,
  Square,
  RotateCcw,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { getScenarios } from "../lib/mockApi";
import { useTranscriptStream } from "../hooks/useTranscriptStream";
import FindingCard from "../components/ai-sidekick/FindingCard";
import DashboardView from "../components/ai-sidekick/DashboardView";
import OfficeCompareView from "../components/ai-sidekick/OfficeCompareView";
import type { CashflowPayload } from "../components/ai-sidekick/DashboardView";
import type { OfficeComparePayload } from "../components/ai-sidekick/OfficeCompareView";
import { cn } from "../lib/utils";

const SCENARIOS = getScenarios();

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const current = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const { participants, entries, findings, running, start, stop, reset } =
    useTranscriptStream(scenarioId);

  const speakerName = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  const dashboards = useMemo(
    () => findings.filter((f) => f.type === "dashboard"),
    [findings],
  );
  const docs = useMemo(
    () => findings.filter((f) => f.type === "document"),
    [findings],
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            AI Meeting Sidekick
            <span className="text-sm font-normal text-zinc-500">
              · Đang nghe cuộc họp
            </span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            AI tự "research" & dựng tài liệu/dashboard trong lúc nghe. Chọn 1 kịch bản dưới đây.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              running ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-500",
            )}
          >
            <Radio className={cn("h-3.5 w-3.5", running && "animate-pulse")} />
            {running ? "Đang lắng nghe" : "Đã dừng"}
          </span>
          {!running ? (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/5"
            >
              <Play className="h-3.5 w-3.5" /> Tiếp tục
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/5"
            >
              <Square className="h-3.5 w-3.5" /> Tạm dừng
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </header>

      {/* Bộ chọn scenario */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => {
          const active = s.id === scenarioId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenarioId(s.id)}
              className={cn(
                "group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-violet-400/40 bg-violet-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5",
              )}
            >
              <span className="text-lg leading-none">{s.accentEmoji}</span>
              <span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-zinc-100" : "text-zinc-300",
                  )}
                >
                  {s.title}
                </span>
                <span className="block text-[11px] text-zinc-500">
                  {s.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* TRANSCRIPT */}
        <aside className="flex h-[480px] flex-col rounded-2xl border border-white/10 bg-[#0c0c12]">
          <div className="border-b border-white/5 px-4 py-2.5">
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Transcript cuộc họp
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-600">
              {current.accentEmoji} {current.title}
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-violet-300">
                      {speakerName(e.speakerId)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {fmtTime(e.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-300">{e.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {entries.length === 0 && (
              <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                Đang kết nối…
              </div>
            )}
          </div>
        </aside>

        {/* Khu vực AI "lắng nghe & show" */}
        <section className="space-y-4">
          {findings.length === 0 && (
            <div className="flex h-[480px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-zinc-600">
              <div>
                <div className="mb-2 text-3xl">👂</div>
                AI đang lắng nghe…
                <br />
                Khi nghe thấy từ khoá, tài liệu sẽ tự xuất hiện tại đây.
              </div>
            </div>
          )}

          {/* Dashboard ưu tiên hiện trên cùng */}
          {dashboards.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-cyan-300">
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard được kích hoạt
              </div>
              <div className="space-y-3">
                {dashboards.map((d) =>
                  d.dashboardKind === "office-compare" ? (
                    <OfficeCompareView
                      key={d.id}
                      discoveredKeyword={d.keyword}
                      payload={d.payload as OfficeComparePayload | undefined}
                    />
                  ) : (
                    <DashboardView
                      key={d.id}
                      discoveredKeyword={d.keyword}
                      payload={d.payload as CashflowPayload | undefined}
                    />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Tài liệu */}
          {docs.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                <FileText className="h-5 w-5" /> Đã tìm thấy {docs.length} tài liệu
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {docs.map((f) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    onOpen={(url) => window.alert(`[MOCK] Mở tài liệu\n${url}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
