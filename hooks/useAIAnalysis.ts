// hooks/useAIAnalysis.ts — quản lý state idle → analyzing → done/error (CLAUDE.md Mục 7)
import { useState } from "react";
import type { AIAnalysisStatus, AIResult } from "../lib/types";

export function useAIAnalysis() {
  const [status, setStatus] = useState<AIAnalysisStatus>("idle");
  const [result, setResult] = useState<AIResult | null>(null);

  // TODO: analyze(question) gọi analyzeQuestion() + cập nhật status/result
  // TODO: reset() đưa về "idle"
  return { status, result };
}
