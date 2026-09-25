"use client";

// components/ai-sidekick/FindingCard.tsx
// Một món AI vừa "nghe thấy & tìm ra" trong lúc lắng nghe cuộc họp.
// type: document (tài liệu) — nút mở mock.
import { motion } from "framer-motion";
import { FileText, Quote, ExternalLink } from "lucide-react";
import type { Finding } from "../../lib/types";
import { cn } from "../../lib/utils";

export type FindingCardProps = {
  finding: Finding;
  onOpen?: (url: string) => void;
  className?: string;
};

export default function FindingCard({
  finding,
  onOpen,
  className,
}: FindingCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-xl",
        className,
      )}
    >
      {/* thanh accent trên */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-gradient-to-r from-violet-500/10 to-cyan-400/10 px-4 py-2.5">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-violet-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Sidekick vừa tìm thấy
        </span>
        <span className="ml-auto rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
          #{finding.keyword}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
            <FileText className="h-5 w-5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-zinc-100">
              {finding.title}
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
              {finding.snippet}
            </p>
          </div>
        </div>

        {/* Câu mà AI nghe được */}
        <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
          <p className="line-clamp-2 text-xs italic text-zinc-500">
            {finding.detectedFromText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpen?.(finding.url)}
          className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-zinc-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"
        >
          Mở tài liệu
          <ExternalLink className="h-3.5 w-3.5 transition group-hover:text-violet-300" />
        </button>
      </div>
    </motion.div>
  );
}
