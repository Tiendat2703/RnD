"use client";

// components/ai-sidekick/DashboardView.tsx
// Dashboard "Dòng tiền biến động" — показывается khi AI nghe thấy từ "dashboard".
// Dữ liệu mock tĩnh (không có backend thật).
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Wallet, ArrowDownRight } from "lucide-react";
import { cn } from "../../lib/utils";

type Datum = { label: string; thu: number; chi: number };
const WEEKS: Datum[] = [
  { label: "Tuần 1", thu: 120, chi: 80 },
  { label: "Tuần 2", thu: 95, chi: 130 },
  { label: "Tuần 3", thu: 160, chi: 70 },
  { label: "Tuần 4", thu: 140, chi: 110 },
  { label: "Tuần 5", thu: 175, chi: 145 },
  { label: "Tuần 6", thu: 130, chi: 120 },
];

const MAX = Math.max(...WEEKS.flatMap((w) => [w.thu, w.chi]));

export default function DashboardView({ discoveredKeyword = "dashboard" }: { discoveredKeyword?: string }) {
  const totalThu = WEEKS.reduce((s, w) => s + w.thu, 0);
  const totalChi = WEEKS.reduce((s, w) => s + w.chi, 0);
  const net = totalThu - totalChi;

  const tiles = [
    {
      icon: TrendingUp,
      label: "Tổng thu",
      value: `${totalThu} tr₫`,
      tone: "up" as const,
    },
    {
      icon: TrendingDown,
      label: "Tổng chi",
      value: `${totalChi} tr₫`,
      tone: "down" as const,
    },
    {
      icon: Wallet,
      label: "Dòng tiền ròng",
      value: `${net >= 0 ? "+" : ""}${net} tr₫`,
      tone: (net >= 0 ? "up" : "down") as const,
    },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a0f16] shadow-2xl"
    >
      {/* header */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-4 py-2.5">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-cyan-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Dashboard · Dòng tiền biến động
        </span>
        <span className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
          #{discoveredKeyword}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* tiles KPI */}
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      t.tone === "up" ? "text-emerald-400" : "text-rose-400",
                    )}
                  />
                  {t.label}
                </div>
                <div
                  className={cn(
                    "mt-1 text-base font-bold",
                    t.tone === "up" ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {t.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* chart thu/chi theo tuần */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">
              Thu vs Chi theo tuần (tr₫)
            </span>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Thu
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Chi
              </span>
            </div>
          </div>

          <div className="flex h-36 items-end justify-between gap-2">
            {WEEKS.map((w, i) => (
              <div
                key={w.label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <motion.div
                    className="w-2.5 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                    initial={{ height: 0 }}
                    animate={{ height: `${(w.thu / MAX) * 100}%` }}
                    transition={{ delay: 0.05 * i, type: "spring", stiffness: 120 }}
                  />
                  <motion.div
                    className="w-2.5 rounded-t bg-gradient-to-t from-rose-600 to-rose-400"
                    initial={{ height: 0 }}
                    animate={{ height: `${(w.chi / MAX) * 100}%` }}
                    transition={{ delay: 0.05 * i + 0.04, type: "spring", stiffness: 120 }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* note */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
          <ArrowDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b>Tuần 2</b> chi vượt thu (ngân sách nhà cung +18%).{" "}
            <b>Tuần 3</b> phục hồi mạnh nhờ khoản thu Acme. — mock data
          </span>
        </div>
      </div>
    </motion.div>
  );
}
