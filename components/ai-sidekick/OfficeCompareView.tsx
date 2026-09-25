"use client";

// components/ai-sidekick/OfficeCompareView.tsx
// Dashboard so sánh thuê văn phòng: A (Q1) vs B (Q7).
// Data mock từ mocks/scenario2/findings.json (keyword "so sánh").
// KPI: giá/m2/tháng, diện tích, tổng chi phí/tháng cho headcount người.
import { motion } from "framer-motion";
import { Building2, MapPin, Maximize, DollarSign } from "lucide-react";
import type { OfficeOption } from "../../lib/types";
import { cn } from "../../lib/utils";

export type OfficeComparePayload = {
  options: OfficeOption[];
  headcount: number;
};

export default function OfficeCompareView({
  payload,
  discoveredKeyword = "so sánh",
}: {
  payload?: OfficeComparePayload;
  discoveredKeyword?: string;
}) {
  const options = payload?.options ?? [];
  const headcount = payload?.headcount ?? 0;
  const monthlyCost = (o: OfficeOption) => o.pricePerSqm * o.sizeSqm;
  const minCost = Math.min(...options.map(monthlyCost));

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a0f16] p-4 text-sm text-zinc-500">
        (chưa có dữ liệu so sánh)
      </div>
    );
  }

  const tiles = [
    { icon: DollarSign, label: "Giá / m² / tháng", unit: "USD" },
    { icon: Maximize, label: "Diện tích TB", unit: "m²" },
    { icon: Building2, label: "Chi phí / tháng", unit: "USD" },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a0f16] shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-4 py-2.5">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-cyan-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Dashboard · So sánh thuê văn phòng
        </span>
        <span className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
          #{discoveredKeyword}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Bảng so sánh 2 cột */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((o, i) => {
            const cost = monthlyCost(o);
            const isCheaper = options.length > 1 && cost === minCost;
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: i === 0 ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i, type: "spring", stiffness: 200 }}
                className={cn(
                  "rounded-xl border p-3",
                  isCheaper
                    ? "border-emerald-400/30 bg-emerald-500/[0.07]"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                  <span className="truncate text-sm font-semibold text-zinc-100">
                    {o.name}
                  </span>
                  {isCheaper && (
                    <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Rẻ nhất
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Row label="Giá thuê" value={`${o.pricePerSqm} USD/m²`} />
                  <Row label="Diện tích" value={`${o.sizeSqm} m²`} />
                  <Row
                    label="Chi phí/tháng"
                    value={`${cost.toLocaleString("en-US")} USD`}
                    strong
                  />
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                  {o.note}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* KPI tiles bên dưới */}
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t, idx) => {
            const Icon = t.icon;
            const values = options.map((o) => {
              if (idx === 0) return o.pricePerSqm;
              if (idx === 1) return o.sizeSqm;
              return monthlyCost(o);
            });
            const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            return (
              <div
                key={t.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Icon className="h-3.5 w-3.5 text-violet-300" />
                  {t.label}
                </div>
                <div className="mt-1 text-base font-bold text-zinc-100">
                  ~{avg}{" "}
                  <span className="text-xs font-normal text-zinc-500">
                    {t.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* note */}
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
          Dự kiến setup cho <b>{headcount} người</b>: chọn B (Q7) tiết kiệm{" "}
          <b>
            {(monthlyCost(options[0]) - monthlyCost(options[1])).toLocaleString(
              "en-US",
            )}{" "}
            USD/tháng
          </b>{" "}
          (~{headcount * 10} m²/người). — mock data
        </div>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-sm",
          strong ? "font-bold text-zinc-100" : "text-zinc-300",
        )}
      >
        {value}
      </span>
    </div>
  );
}
