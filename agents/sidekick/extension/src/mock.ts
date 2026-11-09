// Chế độ thử: phát một cuộc họp giả qua đúng các sự kiện mà pipeline thật sẽ phát, để thử
// panel trong Meet và luồng web mà không cần khóa Blaze/OpenAI, không ghi âm, không gọi mạng
// và KHÔNG gõ gì vào chat Meet (dữ liệu giả không được lọt vào một cuộc họp có người thật).
//
// Kịch bản là cuộc họp BA – PM – developer ở mục III.3.2 của bản mô tả (mocks/meeting-claims.json):
// mỗi câu có thể sinh một Knowledge Card với trạng thái bằng chứng và trích dẫn tài liệu. Khi có
// backend, thay phần phát này bằng pipeline thật; kiểu `card` giữ nguyên.
import type { ExtToWeb } from '../../../../lib/bridgeProtocol';
import type { KnowledgeCard } from '../../../../lib/evidence';
import scenario from '../../../../mocks/meeting-claims.json';

const LINE_GAP_MS = 2600;
const STEP_MS = 700;

/** Chạy cuộc họp giả; trả về hàm dừng. Gọi `emit` như pipeline thật. */
export function runMock(emit: (e: ExtToWeb) => void): () => void {
  let stopped = false;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    timers.push(
      window.setTimeout(() => {
        if (!stopped) fn();
      }, ms),
    );
  };

  scenario.lines.forEach((l, i) => {
    later((i + 1) * LINE_GAP_MS, () => {
      // atMs lấy theo kịch bản (05:12, 12:40…) để dòng và thẻ cùng một đồng hồ
      emit({ type: 'line', line: { id: l.id, text: l.text, atMs: l.atMs, source: 'mixed' } });

      const cards = scenario.cards.filter((c) => c.atMs === l.atMs) as unknown as KnowledgeCard[];
      if (cards.length === 0) return;

      emit({ type: 'stage', stage: 'topic' }); // phát hiện nhận định
      later(STEP_MS, () => emit({ type: 'stage', stage: 'searching' })); // truy xuất tài liệu
      later(STEP_MS * 2, () => emit({ type: 'stage', stage: 'writing' })); // đối chiếu
      later(STEP_MS * 3, () => {
        emit({ type: 'stage', stage: 'posting' }); // hiển thị thẻ
        for (const card of cards) emit({ type: 'card', card });
      });
      later(STEP_MS * 4, () => emit({ type: 'stage', stage: null }));
    });
  });

  return () => {
    stopped = true;
    timers.forEach((id) => window.clearTimeout(id));
  };
}
