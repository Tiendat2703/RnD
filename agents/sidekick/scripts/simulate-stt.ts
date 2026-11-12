// Simulates Task 4 Step 6 without Chrome/Meet: Blaze TTS speaks Vietnamese, the extension's
// BlazeStt streams it to Blaze STT in real time, and recognized sentences are printed.
// Run: npx tsx --env-file=.env.livekit scripts/simulate-stt.ts ["câu cần đọc"]
import WebSocket from 'ws';
import { BLAZE_API_BASE, FRAME_SAMPLES, SAMPLE_RATE } from '../extension/src/config';
import { BlazeStt, type SttSocket } from '../extension/src/stt';

const apiKey = process.env.BLAZE_API_KEY;
if (!apiKey) throw new Error('BLAZE_API_KEY is missing in .env.livekit');

const text = process.argv[2]
  ?? 'Chúng ta nên chọn mô hình nhận dạng giọng nói nào cho tiếng Việt. '
   + 'Chi phí và độ trễ là hai yếu tố quan trọng nhất. Sau đó mình sẽ bàn về luật trí tuệ nhân tạo.';

const tts = await fetch(`${BLAZE_API_BASE}/v1/audio/speech`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'blaze-tts-2-realtime', voice: 'HN-Nar-Nam-SaleNguyenDuy', input: text,
    response_format: 'pcm', sample_rate: SAMPLE_RATE, language: 'vi',
  }),
});
if (!tts.ok) throw new Error(`Blaze TTS HTTP ${tts.status}: ${await tts.text()}`);
let audio = Buffer.from(await tts.arrayBuffer());
if (audio.subarray(0, 4).toString() === 'RIFF') audio = audio.subarray(44); // WAV header, if returned
const pcm = new Int16Array(audio.buffer, audio.byteOffset, Math.floor(audio.byteLength / 2));
console.log(`TTS: ${(pcm.length / SAMPLE_RATE).toFixed(1)} s audio (${tts.headers.get('content-type')})`);

const started = Date.now();
let lastSent = started;
const stt = new BlazeStt({
  apiKey,
  onFinal: line => console.log(`[+${((Date.now() - started) / 1000).toFixed(1)}s, ${((Date.now() - lastSent) / 1000).toFixed(1)}s after last audio] ${line}`),
  onError: message => console.error(`ERROR: ${message}`),
  socketFactory: url => new WebSocket(url) as unknown as SttSocket,
});
await stt.connect();
console.log('STT connected; streaming in real time…');

// One second of silence after speech lets the server detect the end of the last sentence.
const padded = new Int16Array(pcm.length + SAMPLE_RATE);
padded.set(pcm);
for (let i = 0; i < padded.length; i += FRAME_SAMPLES) {
  stt.sendFrame(padded.slice(i, i + FRAME_SAMPLES));
  lastSent = Date.now();
  await new Promise(r => setTimeout(r, (FRAME_SAMPLES / SAMPLE_RATE) * 1000));
}
stt.close();
await new Promise(r => setTimeout(r, 4_000));
console.log('Done.');
