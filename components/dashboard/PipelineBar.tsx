"use client";

// components/dashboard/PipelineBar.tsx — sáu bước của luồng MeetMate.
//
// Thứ tự là thứ có thật (plan extension Task 5–6, và lib/types.ts khai
// PIPELINE_LABEL đúng một lần), nên thanh này lấy array đó làm dữ liệu chứ không
// tự viết lại nhãn. Lý do phải hiển thị: khi MeetMate im lặng, người dùng cần
// biết nó đang ở bước nào — "đang tìm nguồn" và "không tìm thấy gì" trông giống
// nhau y hệt nếu chỉ có một spinner.
import { cn } from "../../lib/utils";
import { PIPELINE_LABEL, type PipelineStage } from "../../lib/types";

const ORDER: PipelineStage[] = [
  "listening",
  "transcribing",
  "topic",
  "searching",
  "writing",
  "posting",
];

export function PipelineBar({
  stage,
  className,
}: {
  /** bước đang chạy; null = không chủ đề nào đang xử lý */
  stage: PipelineStage | null;
  className?: string;
}) {
  const activeIdx = stage ? ORDER.indexOf(stage) : -1;

  return (
    <ol className={cn("mm-stages", className)} aria-label="Trạng thái luồng MeetMate">
      {ORDER.map((s, i) => {
        const state =
          stage === null ? "pending" : i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
        return (
          <li key={s} className="mm-stage" data-state={state}>
            <span className="mm-stage__dot" aria-hidden />
            <span className="mm-stage__label">{PIPELINE_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}
