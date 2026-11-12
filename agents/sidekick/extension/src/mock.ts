// Chế độ thử: phát lại một bản ghi mẫu qua đúng sự kiện `line` mà pipeline thật phát, để thử
// panel trong Meet và luồng web mà không cần khóa Blaze/Exa, không ghi âm, không gọi mạng
// và KHÔNG gõ gì vào chat Meet (dữ liệu giả không được lọt vào một cuộc họp có người thật).
//
// Chỉ phát dòng bản ghi: không có chủ đề, nguồn hay thẻ đối chiếu giả.
import type { ExtToWeb } from '../../../../lib/bridgeProtocol';
import transcript from '../../../../mocks/meeting-transcript.json';

const LINE_GAP_MS = 2600;

/** Phát lại bản ghi mẫu; trả về hàm dừng. Gọi `emit` như pipeline thật. */
export function runMock(emit: (e: ExtToWeb) => void): () => void {
  let stopped = false;
  const timers: number[] = [];

  transcript.forEach((l, i) => {
    timers.push(
      window.setTimeout(() => {
        if (!stopped) emit({ type: 'line', line: { id: l.id, text: l.text, atMs: l.atMs, source: 'mixed' } });
      }, (i + 1) * LINE_GAP_MS),
    );
  });

  return () => {
    stopped = true;
    timers.forEach((id) => window.clearTimeout(id));
  };
}
