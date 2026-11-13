// A scripted meeting through the real pipeline, without Chrome: Blaze TTS speaks each line,
// the extension's LiveStt streams it to Blaze STT in real time, and the extension's pipeline
// checks it against the fixture PDFs with the real Blaze LLM. Every line has an expectation;
// the script scores what MeetMate reported and how long it took after the speaker stopped.
//
// Run: BLAZE_API_KEY=... npx tsx scripts/simulate-meeting.ts [--wav out.wav]
// Optional EXA_API_KEY enables web research. TTS audio is cached in extension/.cache/.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { BLAZE_API_BASE, FRAME_SAMPLES, SAMPLE_RATE } from '../extension/src/config';
import { buildLibrary } from '../extension/src/doccheck';
import { fixtureChunks } from '../extension/src/docs/fixtures';
import { fold } from '../extension/src/docs/normalize';
import { LiveStt } from '../extension/src/live-stt';
import { blazeChat } from '../extension/src/llm';
import { DEFAULT_SETTINGS, type Card } from '../extension/src/messages';
import { createPipeline } from '../extension/src/pipeline';
import { BlazeStt, type SttSocket } from '../extension/src/stt';
import { ExaProvider } from '../server/providers/exa';

type Kind = 'contradiction' | 'partial' | 'supported' | 'answer' | 'not_in_doc';
type Expect = 'none' | Kind | Kind[];
export const MEETING: { say: string; expect: Expect; note: string; ask?: boolean }[] = [
  { say: 'Chào mọi người, hôm nay mình rà soát lại hợp đồng với bên Sao Mai nhé.', expect: 'none', note: 'mở đầu' },
  { say: 'Theo hợp đồng thì phí bảo trì sau thời gian bảo hành là mười lăm triệu một tháng.', expect: 'contradiction', note: 'tự kiểm (chỉ người dùng thấy): hợp đồng ghi 12 triệu' },
  { say: 'Hạn chót bàn giao toàn bộ hệ thống là ngày ba mươi tháng tư năm hai nghìn không trăm hai mươi bảy.', expect: ['contradiction', 'partial'], note: 'tự kiểm: hợp đồng ghi 31/03/2027' },
  { say: 'Bảo hành thì mười hai tháng kể từ ngày ký biên bản nghiệm thu cuối cùng.', expect: 'supported', note: 'tự kiểm: đúng tài liệu' },
  { say: 'Trợ lý ơi, đợt hai thanh toán bao nhiêu phần trăm giá trị hợp đồng?', expect: 'answer', note: 'từ khóa: 40%', ask: true },
  { say: 'Hay là mình đề xuất với Sao Mai tăng phí bảo trì lên mười lăm triệu nhỉ?', expect: 'none', note: 'đề xuất, không phải khẳng định' },
  { say: 'Đội phát triển bên mình có sáu người thôi.', expect: ['contradiction', 'partial'], note: 'tự kiểm: kế hoạch ghi 7 người' },
  { say: 'Trợ lý ơi, theo hợp đồng tranh chấp thì sẽ giải quyết ở đâu nhỉ?', expect: 'answer', note: 'từ khóa: VIAC', ask: true },
  { say: 'Ứng dụng di động mình làm bằng Flutter cho nhanh.', expect: 'contradiction', note: 'tự kiểm: kế hoạch ghi React Native' },
  { say: 'Hôm nay trời mưa to quá, mọi người về nhớ cẩn thận nhé.', expect: 'none', note: 'nói chuyện phiếm' },
  { say: 'Trợ lý ơi, ứng dụng trong kế hoạch có hỗ trợ ví ZaloPay không?', expect: 'answer', note: 'từ khóa: ZaloPay để giai đoạn sau', ask: true },
  { say: 'Trợ lý ơi, trong hợp đồng có ghi giá cổ phiếu của Blue River không?', expect: 'not_in_doc', note: 'từ khóa: hỏi rõ nội dung file nhưng file không có', ask: true },
  { say: 'Trợ lý ơi, trong hợp đồng phí bảo trì mỗi tháng bao nhiêu?', expect: 'answer', note: 'từ khóa: 12 triệu', ask: true },
  { say: 'Trợ lý ơi, trong kế hoạch ứng dụng di động dùng công nghệ gì?', expect: 'answer', note: 'từ khóa: React Native', ask: true },
  { say: 'MeetMate ơi, Việt Nam hiện nay có bao nhiêu tỉnh thành?', expect: 'none', note: 'tên cũ không kích hoạt tìm kiếm' },
];

const apiKey = process.env.BLAZE_API_KEY;
if (!apiKey) throw new Error('BLAZE_API_KEY is missing');
const wavOut = process.argv.includes('--wav') ? process.argv[process.argv.indexOf('--wav') + 1] : null;
const GAP_SAMPLES = Math.round(SAMPLE_RATE * 1.6); // silence between speakers

async function speak(text: string): Promise<Int16Array> {
  const cache = `extension/.cache/tts-${createHash('sha1').update(text).digest('hex').slice(0, 16)}.pcm`;
  let audio = await readFile(cache).catch(() => null);
  if (!audio) {
    const tts = await fetch(`${BLAZE_API_BASE}/v1/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'blaze-tts-2-realtime', voice: 'HN-Nar-Nam-SaleNguyenDuy', input: text, response_format: 'pcm', sample_rate: SAMPLE_RATE, language: 'vi' }),
    });
    if (!tts.ok) throw new Error(`Blaze TTS HTTP ${tts.status}: ${await tts.text()}`);
    audio = Buffer.from(await tts.arrayBuffer());
    if (audio.subarray(0, 4).toString() === 'RIFF') audio = audio.subarray(44);
    await mkdir('extension/.cache', { recursive: true });
    await writeFile(cache, audio);
  }
  return new Int16Array(audio.buffer.slice(audio.byteOffset, audio.byteOffset + (audio.byteLength & ~1)));
}

function wav(pcm: Int16Array): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.byteLength, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24); header.writeUInt32LE(SAMPLE_RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([header, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]);
}

const lines = await Promise.all(MEETING.map(m => speak(m.say)));
const total = lines.reduce((n, l) => n + l.length + GAP_SAMPLES, SAMPLE_RATE);
const audio = new Int16Array(total);
const ends: number[] = []; // sample index where each line's speech ends
let at = SAMPLE_RATE; // one second of silence first
for (const l of lines) { audio.set(l, at); at += l.length; ends.push(at); at += GAP_SAMPLES; }
if (wavOut) {
  await writeFile(wavOut, wav(audio));
  console.log(`wrote ${wavOut} (${(audio.length / SAMPLE_RATE).toFixed(1)} s)`);
  if (process.argv.includes('--wav-only')) process.exit(0);
}

const library = buildLibrary(await fixtureChunks());
const chat = blazeChat(apiKey);
const exaKey = process.env.EXA_API_KEY;
const cards: (Card & { heardAt: number })[] = [];
const finals: { text: string; at: number }[] = [];
const posts: string[] = [];
const errors: string[] = [];
const started = Date.now();
const clock = () => (Date.now() - started) / 1000;

const pipeline = createPipeline({
  chat,
  library: () => library,
  search: exaKey ? (q, s) => new ExaProvider(exaKey).search(q, s) : null,
  settings: () => ({ ...DEFAULT_SETTINGS, webResearch: Boolean(exaKey) }),
  emit: e => {
    if (e.kind === 'card') cards.push({ ...e.card, heardAt: clock() });
    if (e.kind === 'final') finals.push({ text: e.text, at: clock() });
    if (e.kind === 'notice' && e.level === 'error') errors.push(e.message);
  },
  post: (_id, messages) => posts.push(...messages),
});

const stt = new LiveStt({
  create: h => new BlazeStt({ apiKey, ...h, socketFactory: url => new WebSocket(url) as unknown as SttSocket }),
  onFinal: t => pipeline.onFinal(t),
  onPartial: t => pipeline.onPartial(t),
  onState: (s, d) => console.log(`[${clock().toFixed(1)}s] STT ${s}${d ? `: ${d}` : ''}`),
  onFatal: m => { throw new Error(m); },
});
console.log(`Library: ${library.chunks.length} chunks, ${library.full ? 'full context' : 'retrieval'}; web research ${exaKey ? 'on' : 'off'}`);
await stt.start();
// Real time: one 100 ms frame every 100 ms, on a drift-free schedule.
const streamStart = Date.now();
for (let i = 0, n = 0; i < audio.length; i += FRAME_SAMPLES, n++) {
  stt.sendFrame(audio.slice(i, i + FRAME_SAMPLES));
  const wait = streamStart + (n + 1) * 100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}
const speechEnd = (i: number) => (streamStart - started) / 1000 + ends[i] / SAMPLE_RATE;
console.log(`[${clock().toFixed(1)}s] audio done; waiting for the last checks…`);
await new Promise(r => setTimeout(r, 15_000));
stt.stop();
pipeline.stop();

// Match each card to the script line it is about: the line whose words it shares most.
const overlap = (a: string, b: string) => {
  const A = new Set(fold(a).split(' ')); const B = fold(b).split(' ');
  return B.filter(w => A.has(w)).length / Math.max(1, B.length);
};
const lineOf = (card: Card) => {
  const said = card.utterance ?? card.text;
  let best = -1, score = 0;
  MEETING.forEach((m, i) => { const s = overlap(m.say, said); if (s > score) { score = s; best = i; } });
  return score >= 0.35 ? best : -1;
};

console.log('\nTranscript (Blaze STT):');
for (const f of finals) console.log(`  [${f.at.toFixed(1)}s] ${f.text}`);
console.log('\nResults:');
let pass = 0;
MEETING.forEach((m, i) => {
  const got = cards.filter(c => c.kind !== 'research' && lineOf(c) === i);
  const kinds = m.expect === 'none' ? [] : [m.expect].flat();
  const ok = m.expect === 'none'
    ? got.length === 0
    : got.some(c => kinds.includes(c.kind as Kind) && (!m.ask || c.mode === 'ask'));
  if (ok) pass++;
  const latency = got.length ? ` (+${(got[0].heardAt - speechEnd(i)).toFixed(1)}s sau khi nói xong)` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${i + 1}. [${m.expect}] ${m.note}${latency}`);
  for (const c of got) console.log(`        → ${c.kind}${c.mode === 'ask' ? ' (ask)' : ''}${c.repeat ? ' (repeat, chat ' + c.chat + ')' : ''}: ${c.text}${c.source ? ` [${c.source}]` : ''}`);
});
const stray = cards.filter(c => c.kind !== 'research' && lineOf(c) < 0);
for (const c of stray) console.log(`  ? unmatched ${c.kind}: ${c.utterance ?? ''} → ${c.text}`);
for (const c of cards.filter(c => c.kind === 'research')) console.log(`  research: ${c.title} (${c.links?.length} sources)`);
console.log(`\nChat messages that would be posted (${posts.length}):`);
for (const p of posts) console.log(`  ${p.replace(/\n/g, ' ⏎ ')}`);
if (errors.length) console.log(`\nErrors:\n  ${errors.join('\n  ')}`);
console.log(`\nScore: ${pass}/${MEETING.length}`);
process.exit(pass === MEETING.length && !errors.length ? 0 : 1);
