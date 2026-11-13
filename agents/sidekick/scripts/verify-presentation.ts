// Explicit integration check: synthetic content, real Blaze calls. Never loaded by unit tests.
import { mkdir, writeFile } from 'node:fs/promises';
import { generateChecklist } from '../meetmate-server/presentation';
import { blazeChat } from '../meetmate-server/llm';
import { createPresentationPipeline } from '../extension/src/presentation-pipeline';
import type { PresentationSnapshot } from '../../../lib/presentation';

const key = process.env.BLAZE_API_KEY?.trim();
if (!key) throw Error('BLAZE_API_KEY is required');
const facts = [
  'Tốc độ phản hồi trung bình là 1,8 giây.',
  'Phí dịch vụ là 100 nghìn đồng mỗi tháng.',
  'Sản phẩm hỗ trợ tiếng Việt và tiếng Anh.',
  'Tài liệu được mã hóa khi truyền.',
  'Phiên thử nghiệm có 20 người tham gia.',
  'Thời gian triển khai dự kiến là 4 tuần.',
  'Có nút xuất báo cáo PDF.',
  'Người dùng có thể xóa bản ghi.',
  'Dữ liệu demo dùng cho thử nghiệm nội bộ.',
  'Sản phẩm chưa hỗ trợ ngoại tuyến.',
];
const chunks = facts.map((text, n) => ({
  id: `dverify#${n + 1}`,
  docId: 'dverify',
  docName: 'Synthetic demo.txt',
  page: 1,
  pageEnd: 1,
  text,
}));
const documents = [{ id: 'dverify', name: 'Synthetic demo.txt', pageCount: 1, chunks }];
const chat = blazeChat({ apiKey: key, timeoutMs: 60_000 });
const generated = await generateChecklist(documents, chat, AbortSignal.timeout(60_000));
const base: PresentationSnapshot = {
  ...generated,
  confirmed: true,
  items: chunks.map((c, n) => ({
    id: `item-${n + 1}`,
    text: c.text,
    required: true,
    citation: c,
    coverage: 'pending',
    correctness: 'unchecked',
    manual: false,
  })),
};
const cases = [
  {
    name: 'paraphrase',
    text: 'Trung bình, chỉ cần một phẩy tám giây là nhận được phản hồi.',
    id: 'item-1',
    coverage: 'covered',
    correctness: 'supported',
  },
  {
    name: 'exact-wrong-number',
    text: 'Phí dịch vụ chính xác là 200 nghìn đồng mỗi tháng.',
    id: 'item-2',
    coverage: 'covered',
    correctness: 'contradicted',
  },
  {
    name: 'approximate-rounding',
    text: 'Thời gian trả lời trung bình khoảng 2 giây.',
    id: 'item-1',
    coverage: 'covered',
    correctness: 'supported',
  },
  {
    name: 'question-not-claim',
    text: 'Liệu mình có thể giảm phí xuống còn 50 nghìn đồng mỗi tháng không?',
    id: 'item-2',
    coverage: 'not-covered',
    correctness: 'not-contradicted',
  },
  {
    name: 'topic-only',
    text: 'Tiếp theo tôi sẽ trình bày về ngôn ngữ hỗ trợ.',
    id: 'item-3',
    coverage: 'not-covered',
    correctness: 'not-contradicted',
  },
];
const results = [];
for (const test of cases) {
  let resolve!: (s: PresentationSnapshot) => void;
  const complete = new Promise<PresentationSnapshot>((r) => (resolve = r));
  let updates = 0;
  const started = performance.now();
  const pipeline = createPresentationPipeline({
    id: 'synthetic-verification',
    snapshot: structuredClone(base),
    chat,
    emit: (e) => {
      if (e.kind === 'presentation' && ++updates > 1) resolve(e.snapshot);
    },
  });
  pipeline.onFinal(test.text);
  const timeout = setTimeout(() => resolve({ ...base, error: 'verification timeout' }), 65_000);
  const result = await complete;
  clearTimeout(timeout);
  pipeline.stop();
  const item = result.items.find((i) => i.id === test.id)!;
  const passed =
    !result.error &&
    (test.coverage === 'not-covered'
      ? item.coverage !== 'covered'
      : item.coverage === test.coverage) &&
    (test.correctness === 'not-contradicted'
      ? item.correctness !== 'contradicted'
      : item.correctness === test.correctness);
  results.push({
    name: test.name,
    passed,
    coverage: item.coverage,
    correctness: item.correctness,
    error: result.error,
    latencyMs: Math.round(performance.now() - started),
  });
  console.log(test.name, passed ? 'PASS' : 'FAIL');
}
await mkdir('.sidekick', { recursive: true });
await writeFile(
  '.sidekick/presentation-verification.json',
  JSON.stringify(
    {
      at: new Date().toISOString(),
      synthetic: true,
      generatedItems: generated.items.length,
      apiCalls: 1 + cases.length,
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
