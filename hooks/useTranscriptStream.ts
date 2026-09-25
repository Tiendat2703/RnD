"use client";

// Stream cục bộ phục vụ demo giao diện, không thực hiện network request.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TranscriptEntry } from "../lib/types";
import transcriptData from "../mocks/transcript.json";

const transcript = transcriptData as TranscriptEntry[];
const INITIAL_ENTRIES = 1;

export function useTranscriptStream() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ENTRIES);
  const [isPaused, setIsPaused] = useState(false);
  const entries = useMemo(() => transcript.slice(0, visibleCount), [visibleCount]);
  const isComplete = visibleCount >= transcript.length;

  useEffect(() => {
    if (isPaused || isComplete) return;

    const nextEntry = transcript[visibleCount];
    const speakingTime = Math.min(5600, Math.max(3400, nextEntry.text.length * 34));
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), speakingTime);

    return () => window.clearTimeout(timer);
  }, [isComplete, isPaused, visibleCount]);

  const togglePause = useCallback(() => setIsPaused((paused) => !paused), []);
  const restart = useCallback(() => {
    setVisibleCount(INITIAL_ENTRIES);
    setIsPaused(false);
  }, []);

  const activeTopic = [...entries].reverse().find((entry) => entry.topic)?.topic ?? "Mở đầu & mục tiêu";
  const topics = transcript.flatMap((entry) => (entry.topic ? [entry.topic] : []));

  return {
    entries,
    isStreaming: !isPaused && !isComplete,
    isPaused,
    isComplete,
    activeTopic,
    topicIndex: topics.indexOf(activeTopic) + 1,
    topicCount: topics.length,
    togglePause,
    restart,
  };
}
