// hooks/useTranscriptStream.ts — transcript giả lập + AI lắng nghe thụ động.
// Mỗi entry transcript tới → AI quét keyword của scenario đang chọn,
// trùng → "phát hiện" ra 1 Finding (document/dashboard) và đẩy lên UI.
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Finding,
  Participant,
  SignalSeed,
  TranscriptEntry,
} from "../lib/types";
import {
  getParticipants,
  getSignals,
  subscribeToTranscript,
} from "../lib/mockApi";

export function useTranscriptStream(scenarioId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const signaled = useRef<Set<string>>(new Set()); // tránh trùng 1 signal nhiều lần
  const signalsRef = useRef<SignalSeed[]>([]);
  const [running, setRunning] = useState(false);

  // Tải participants + signals mỗi khi đổi scenario
  useEffect(() => {
    let alive = true;
    setRunning(false);
    setEntries([]);
    setFindings([]);
    signaled.current.clear();
    stopRef.current?.();

    Promise.all([getParticipants(scenarioId), getSignals(scenarioId)]).then(
      ([p, s]) => {
        if (!alive) return;
        setParticipants(p);
        signalsRef.current = s;
        // tự bắt đầu nghe scenario mới
        startRef.current();
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

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
            dashboardKind: sig.dashboardKind,
            payload: sig.payload,
            detectedFromText: entry.text,
            detectedAt: Date.now(),
          };
          setFindings((prev) => [finding, ...prev]);
        }
      }
    };

    const unsubscribe = subscribeToTranscript(scenarioId, (entry) => {
      setEntries((prev) => [...prev, entry]);
      matchSignals(entry);
    });
    stopRef.current = unsubscribe;
  }, [running, scenarioId]);

  // ref để dùng bên trong effect đổi scenario (tránh phụ thuộc cycle)
  const startRef = useRef(start);
  startRef.current = start;

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

  return { participants, entries, findings, running, start, stop, reset };
}
