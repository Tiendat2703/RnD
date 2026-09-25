// hooks/useTranscriptStream.ts — transcript giả lập + AI lắng nghe thụ động
// Mỗi entry transcript tới → AI quét keyword trong mocks/findings.json,
// trùng → "phát hiện" ra 1 Finding (document/dashboard) và đẩy lên UI.
// (Đổi concept: AI tự show tài liệu trong lúc nghe, KHÔNG user gõ câu hỏi.)
import { useCallback, useEffect, useRef, useState } from "react";
import type { Finding, SignalSeed, TranscriptEntry } from "../lib/types";
import { getSignals, subscribeToTranscript } from "../lib/mockApi";

export function useTranscriptStream() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const signaled = useRef<Set<string>>(new Set()); // tránh trùng 1 signal nhiều lần
  const signalsRef = useRef<SignalSeed[]>([]);
  const [running, setRunning] = useState(false);

  // Tải signals 1 lần khi mount
  useEffect(() => {
    let alive = true;
    getSignals().then((s) => {
      if (alive) signalsRef.current = s;
    });
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);

    const matchSignals = (entry: TranscriptEntry) => {
      const text = entry.text.toLowerCase();
      for (const sig of signalsRef.current) {
        if (
          text.includes(sig.keyword.toLowerCase()) &&
          !signaled.current.has(sig.keyword)
        ) {
          signaled.current.add(sig.keyword);
          const finding: Finding = {
            id: crypto.randomUUID(),
            keyword: sig.keyword,
            type: sig.type,
            title: sig.title,
            snippet: sig.snippet,
            url: sig.url,
            detectedFromText: entry.text,
            detectedAt: Date.now(),
          };
          setFindings((prev) => [finding, ...prev]);
        }
      }
    };

    const unsubscribe = subscribeToTranscript((entry) => {
      setEntries((prev) => [...prev, entry]);
      matchSignals(entry);
    });

    // Lưu unsubscribe để dọn dẹp
    stopRef.current = unsubscribe;
  }, [running]);

  const stopRef = useRef<() => void>(() => {});
  const stop = useCallback(() => {
    stopRef.current?.();
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stopRef.current?.();
    signaled.current.clear();
    setEntries([]);
    setFindings([]);
    setRunning(false);
  }, []);

  return { entries, findings, running, start, stop, reset };
}
