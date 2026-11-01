# MeetMate Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extension Chrome "MeetMate" nghe cuộc họp Google Meet tiếng Việt, nhận ra chủ đề đang bàn, tìm nguồn thật và gửi vào chat Meet từng nguồn kèm lý do chọn.

**Architecture:** Popup lấy `streamId` của tab Meet, background mở một offscreen document. Offscreen document chạy toàn bộ pipeline: ghi âm tab cùng micro, chuyển sang PCM 16 kHz, gửi tới Blaze STT, đưa câu đã chốt vào cửa sổ transcript, nhờ Blaze LLM tách chủ đề, Exa tìm nguồn, Blaze LLM viết lý do. Kết quả đi qua background tới content script, content script gõ vào chat Meet.

**Tech Stack:** TypeScript, Chrome Manifest V3 (`tabCapture`, `offscreen`, `storage`), AudioWorklet, esbuild, vitest. Tất cả dùng lại package `agents/sidekick`. Thêm duy nhất dev dependency `@types/chrome`.

**Spec:** mục "Thiết kế đã chốt" ngay bên dưới, chốt trong hội thoại ngày 01/11/2026.

## Thiết kế đã chốt

- Người dùng đang ở trong cuộc họp Google Meet, bấm icon MeetMate rồi bấm **Bắt đầu**. Bot không vào phòng như một thành viên.
- Âm thanh lấy từ hai nguồn: âm thanh của tab Meet (giọng người khác) và micro (giọng người dùng).
- **Blaze** lo nhận dạng giọng nói và LLM, đây là yêu cầu bắt buộc. **Exa** chỉ lo tìm nguồn.
- Agent chạy liên tục trong lúc họp. Khi chủ đề đổi, nó hủy việc đang làm và research chủ đề mới.
- Kết quả gửi vào chat Meet, mỗi tin bắt đầu bằng `MeetMate: `. Tin nhắn đứng tên người dùng.
- Mỗi kết quả gồm từng nguồn và lý do chọn nguồn. Agent không kết luận thay nhóm.
- Bản demo chạy local, cài bằng "Load unpacked", mỗi lần chỉ dùng cho một cuộc họp.

## Global Constraints

- Chrome ≥ 116 và Node 24.
- STT (đổi ngày 01/11/2026): API realtime mới `/v1/audio/transcriptions/realtime` trả HTTP 101 rồi ngắt với mã 1006, nên tạm dùng **giao thức cũ** `wss://<host>/v1/stt/realtime`. Message đầu tiên là `{token, language: "vi", model: "stt-stream-1.5"}`, server trả `successful-authentication` rồi `ready`; kết quả là `partial`/`final` có trường `text`; kết thúc bằng cách đóng socket. Giao thức cũ hết hỗ trợ sau 31/03/2027. Đã kiểm chứng bằng `scripts/simulate-stt.ts`.
- Âm thanh gửi Blaze: frame nhị phân PCM s16le, 16 kHz, mono, 1.600 mẫu (100 ms) mỗi frame.
- Kết thúc phiên STT: ngừng gửi audio, chờ 1 giây để nhận nốt `final`, rồi đóng socket.
- Khóa API (Blaze, Exa) **không bao giờ** nằm trong mã nguồn hay file build. Người dùng nhập khóa ở popup, khóa được lưu trong `chrome.storage.local` với tên `blazeApiKey` và `exaApiKey`.
- Mọi URL gửi vào chat phải nằm trong kết quả Exa trả về. URL do LLM tự bịa thì bị loại.
- Toàn bộ chữ hiển thị cho người dùng viết bằng tiếng Việt.
- Thư mục chưa có git. Bỏ qua các bước commit, hoặc commit sau mỗi task nếu nhóm đã bật git.

## Review Focus

1. **Người dùng mở loa ngoài:** micro thu lại giọng người khác, khiến cùng một câu xuất hiện hai lần. Kỳ vọng: câu trùng (sau chuẩn hóa) trong vòng 5 giây bị bỏ, kiểm thử ở Task 5. Khi demo nên đeo tai nghe.
2. **Nói chuyện phiếm hoặc im lặng lâu:** chat không bị spam. Kỳ vọng: chủ đề rỗng thì không gửi gì, kiểm thử ở Task 7.
3. **LLM trả JSON hỏng hoặc bọc trong ```` ```json ````:** chương trình không sập và bỏ qua lượt đó, kiểm thử ở Task 5 và Task 6.
4. **LLM bịa URL không có trong kết quả Exa:** nguồn đó bị loại, kiểm thử ở Task 6.
5. **Blaze lỗi giữa cuộc họp** (hết credit hoặc mất kết nối): lỗi hiện ở popup, không gửi vào chat. Người dùng vẫn nghe được cuộc họp, vì âm thanh tab phải được phát lại sau khi bị capture. Kiểm thử ở Task 4, kiểm tra tay ở Task 3.

## Tổng quan các task

| # | Task | Kết quả kiểm tra được |
|---|---|---|
| 1 | Ghi nhận thông số chưa biết: endpoint và model LLM của Blaze, cách Blaze chốt câu, selector và giới hạn độ dài chat Meet | `config.ts` và `selectors.ts` có giá trị thật |
| 2 | Khung extension: manifest, build, popup nhập khóa, xin quyền micro, background, offscreen | Load unpacked chạy được, popup hiện "Đang chạy" |
| 3 | Ghi âm tab và micro, phát lại âm thanh tab, tạo frame PCM 16 kHz | Có test; khoảng 10 frame/giây; người dùng vẫn nghe được cuộc họp |
| 4 | Client Blaze STT | Có test; console in ra câu tiếng Việt |
| 5 | Blaze LLM, cửa sổ transcript (bỏ câu trùng), tách chủ đề | Có test |
| 6 | Exa, viết lý do chọn nguồn, loại URL bịa, cắt tin theo độ dài | Có test |
| 7 | Điều phối: đổi chủ đề thì hủy research cũ, không gửi kết quả cũ | Có test |
| 8 | Gửi chat Meet, nối toàn bộ, chạy thử với 2 người | Tin "MeetMate:" hiện trong chat |

---

## Cấu trúc file

Tất cả nằm trong `agents/sidekick/`:

| File | Trách nhiệm |
|---|---|
| `extension/static/manifest.json`, `popup.html`, `offscreen.html`, `mic-permission.html` | File tĩnh, được copy sang `dist-extension/` |
| `extension/src/config.ts` | Hằng số (URL, model, kích thước frame, ngưỡng) |
| `extension/src/messages.ts` | Kiểu message giữa popup, background, offscreen và content |
| `extension/src/popup.ts` | Nhập khóa, Bắt đầu/Dừng, hiện trạng thái |
| `extension/src/mic-permission.ts` | Xin quyền micro một lần cho extension |
| `extension/src/background.ts` | Mở/đóng offscreen document, chuyển tin nhắn tới tab, lưu trạng thái |
| `extension/src/offscreen.ts` | Nối pipeline: audio → STT → session |
| `extension/src/audio.ts` + `pcm-worklet.ts` + `pcm.ts` | Ghi âm tab và micro, phát lại âm thanh tab, tạo frame PCM16 |
| `extension/src/stt.ts` | Client WebSocket cho Blaze STT |
| `extension/src/llm.ts` | Client Blaze LLM |
| `extension/src/transcript.ts` | Cửa sổ transcript và bỏ câu trùng |
| `extension/src/topic.ts` | Prompt, gọi LLM và đọc kết quả chủ đề |
| `extension/src/research.ts` | Exa, viết lý do chọn nguồn, lọc URL, định dạng tin chat |
| `extension/src/session.ts` | Điều phối: khi nào tách chủ đề, hủy research cũ, gửi tin |
| `extension/src/content/selectors.ts` + `content.ts` | Gõ tin nhắn vào chat Meet |
| `scripts/build-extension.mjs` | Build bằng esbuild |

Chỉnh sửa thêm:
- `package.json`: thêm script `"extension:build": "node scripts/build-extension.mjs"` và devDependency `@types/chrome`.
- `tsconfig.json`: thêm `"extension"` vào `include` và `"chrome"` vào `types`.
- `.gitignore`: thêm `dist-extension/`.

Dùng lại `ExaProvider` ở `server/providers/exa.ts` (`search(query, signal): Promise<Source[]>`) và kiểu `Source` ở `shared/types.ts`.

---

### Task 1: Ghi nhận các thông số chưa biết (không viết code sản phẩm)

**Files:**
- Create: `extension/src/config.ts`
- Create: `extension/src/content/selectors.ts`

**Interfaces:**
- Produces: tất cả hằng số trong `config.ts` và `selectors.ts`. Mọi task sau dùng các tên này.

- [ ] **Step 1: Đọc mục "LLM API" trong tài liệu Blaze.** Người trong nhóm mở trang này trong trình duyệt và ghi lại: endpoint, header xác thực, cấu trúc body của một request hội thoại, đường dẫn tới phần chữ trả lời trong response, và tên model nên dùng. Chạy request mẫu trong tài liệu bằng `curl` với một câu tiếng Việt.
  Expected: HTTP 200 và có chữ tiếng Việt trả về.
- [ ] **Step 2: Đọc mô tả `turn_detection` và `input_audio.commit` trong trang STT realtime.** Ghi lại server có tự gửi `transcript.text.done` khi người nói ngừng mà không cần `commit` hay không.
- [ ] **Step 3: Thử gửi chat Meet bằng console.** Vào một cuộc họp thử, mở khung chat, mở DevTools và chạy:

```js
const box = document.querySelector('textarea');
box.focus();
document.execCommand('insertText', false, 'MeetMate: thử');
box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
```

  Expected: tin "MeetMate: thử" hiện trong chat. Nếu không hiện, tìm selector đúng cho ô nhập, nút gửi và nút mở chat. Ưu tiên thuộc tính không đổi theo ngôn ngữ giao diện (`jsname`, `data-*`). Sau đó gửi lần lượt chuỗi dài 300, 500 và 1.000 ký tự để đo giới hạn độ dài của một tin.
- [ ] **Step 4: Tạo `extension/src/config.ts`** với các giá trị đã ghi nhận:

```ts
export const BLAZE_STT_URL = 'wss://dev-api.blaze.vn/v1/audio/transcriptions/realtime';
export const BLAZE_STT_MODEL = 'blaze-stt-1.5-realtime';
export const BLAZE_LLM_URL = '';      // từ Step 1
export const BLAZE_LLM_MODEL = '';    // từ Step 1
export const MEET_CHAT_MAX_CHARS = 450; // = độ dài dài nhất gửi trọn vẹn ở Step 3, trừ 20
export const CHAT_PREFIX = 'MeetMate: ';
export const SAMPLE_RATE = 16_000;
export const FRAME_SAMPLES = 1_600;
export const WINDOW_MS = 120_000;
export const DUPLICATE_MS = 5_000;
export const TOPIC_CHECK_EVERY = 3;
export const TOPIC_CHECK_MIN_GAP_MS = 15_000;
```

  Tạo `extension/src/content/selectors.ts` export `CHAT_INPUT`, `CHAT_SEND_BUTTON` và `CHAT_OPEN_BUTTON`, mỗi hằng là một mảng selector thử lần lượt. Nếu Step 1 cho thấy LLM nằm ở tên miền khác `dev-api.blaze.vn`, ghi tên miền đó lại để thêm vào `host_permissions` ở Task 2.
  Expected: `BLAZE_LLM_URL` và `BLAZE_LLM_MODEL` không còn rỗng.

### Task 2: Khung extension, build, popup và quyền micro

**Files:**
- Create: `extension/static/manifest.json`, `popup.html`, `offscreen.html`, `mic-permission.html`
- Create: `extension/src/messages.ts`, `popup.ts`, `mic-permission.ts`, `background.ts`, `offscreen.ts` (bản rỗng: chỉ nhận message và báo trạng thái "Đang chạy")
- Create: `scripts/build-extension.mjs`
- Modify: `package.json`, `tsconfig.json`, `.gitignore` (xem mục Cấu trúc file)

**Interfaces:**
- Produces, trong `messages.ts`:

```ts
export type Msg =
  | { type: 'meetmate.start'; tabId: number; streamId: string }   // popup → background
  | { type: 'meetmate.stop' }                                     // popup → background
  | { type: 'meetmate.offscreen.start'; streamId: string; blazeApiKey: string; exaApiKey: string } // background → offscreen
  | { type: 'meetmate.offscreen.stop' }                           // background → offscreen
  | { type: 'meetmate.post'; text: string }                       // offscreen → background → content
  | { type: 'meetmate.status'; status: string };                  // offscreen → background
```

  Trạng thái được lưu ở `chrome.storage.session` với key `status`. Popup đọc key này và theo dõi `chrome.storage.onChanged`.

- [ ] **Step 1: Viết `manifest.json`.** Gồm `manifest_version: 3`, `name: "MeetMate"`, `version: "0.1.0"`, `permissions: ["tabCapture", "offscreen", "storage"]`, `host_permissions: ["https://meet.google.com/*", "https://dev-api.blaze.vn/*", "https://api.exa.ai/*"]` (cộng tên miền LLM từ Task 1 nếu khác), `background.service_worker: "background.js"`, `action.default_popup: "popup.html"`, và `content_scripts` chạy `content.js` trên `https://meet.google.com/*`.
- [ ] **Step 2: Viết `scripts/build-extension.mjs`.** Dùng esbuild bundle các entry `background`, `offscreen`, `popup`, `content`, `mic-permission` và `pcm-worklet` trong `extension/src` (content nằm ở `extension/src/content/content.ts`) ra `dist-extension/<tên>.js`, với `format: 'iife'`, `platform: 'browser'`, `target: 'chrome116'`. Sau đó copy `extension/static/*` sang `dist-extension/`. Để tạm `content.ts` và `pcm-worklet.ts` rỗng nếu chưa tới task của chúng.
- [ ] **Step 3: Viết popup.**
  - Popup có hai ô nhập kiểu password (khóa Blaze, khóa Exa), được lưu vào `chrome.storage.local`, cùng nút **Bắt đầu**/**Dừng** và một dòng trạng thái.
  - Khi bấm Bắt đầu:
    1. Nếu tab hiện tại không phải `https://meet.google.com/...`, báo "Hãy mở MeetMate trong tab Google Meet".
    2. Nếu thiếu khóa, báo "Thiếu khóa Blaze hoặc Exa".
    3. Nếu `navigator.permissions.query({ name: 'microphone' })` khác `granted`, mở tab `mic-permission.html`. Trang này gọi `getUserMedia({ audio: true })`, rồi dừng track và tự đóng.
    4. Gọi `chrome.tabCapture.getMediaStreamId({ targetTabId })` ngay trong popup, rồi gửi `meetmate.start`.
- [ ] **Step 4: Viết background.**
  - Khi nhận `meetmate.start`: tạo offscreen bằng `chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Capture Google Meet audio for transcription' })` nếu chưa có, đọc khóa từ storage, rồi gửi `meetmate.offscreen.start`.
  - Khi nhận `meetmate.stop`: gửi `meetmate.offscreen.stop`, rồi `chrome.offscreen.closeDocument()`.
  - Khi nhận `meetmate.post`: chuyển bằng `chrome.tabs.sendMessage(tabId, msg)`.
  - Khi nhận `meetmate.status`: ghi vào `chrome.storage.session`.
- [ ] **Step 5: Build và typecheck.**
  Run: `npm install -D @types/chrome && npm run check && npm run extension:build`
  Expected: không có lỗi, `dist-extension/` chứa `manifest.json` và 6 file `.js`.
- [ ] **Step 6: Kiểm tra tay.** Vào `chrome://extensions`, bật Developer mode, Load unpacked `dist-extension/`. Mở một tab Meet, nhập khóa, bấm Bắt đầu.
  Expected: lần đầu Chrome hỏi quyền micro. Popup sau đó hiện "Đang chạy". Bấm Dừng thì offscreen đóng (kiểm tra ở `chrome://extensions` > Inspect views).

### Task 3: Ghi âm tab và micro, tạo frame PCM16

**Files:**
- Create: `extension/src/pcm.ts`, `extension/src/pcm-worklet.ts`, `extension/src/audio.ts`
- Test: `extension/src/pcm.test.ts`
- Modify: `extension/src/offscreen.ts`

**Interfaces:**
- Produces:
  - `floatToPcm16(input: Float32Array): Int16Array`
  - `class FrameBatcher { constructor(frameSamples: number, onFrame: (frame: Int16Array) => void); push(samples: Int16Array): void }`
  - `startCapture(streamId: string, onFrame: (frame: Int16Array) => void, onStatus: (s: string) => void): Promise<() => void>`, trả về hàm dừng.

- [ ] **Step 1: Viết test thất bại.**

```ts
it('clamps and scales floats to PCM16', () => {
  expect([...floatToPcm16(new Float32Array([0, 1, -1, 2, -2, 0.5]))])
    .toEqual([0, 32767, -32767, 32767, -32767, 16384]);
});
it('emits fixed-size frames and keeps the remainder', () => {
  const frames: Int16Array[] = [];
  const b = new FrameBatcher(4, f => frames.push(f));
  b.push(new Int16Array([1, 2, 3]));
  b.push(new Int16Array([4, 5, 6, 7, 8, 9]));
  expect(frames.map(f => [...f])).toEqual([[1, 2, 3, 4], [5, 6, 7, 8]]);
});
```

- [ ] **Step 2: Chạy test, kiểm tra nó thất bại.**
  Run: `npx vitest run extension/src/pcm.test.ts`
  Expected: FAIL vì chưa có module.
- [ ] **Step 3: Viết `pcm.ts`.** Dùng `Math.round(clamped * 32767)`.
- [ ] **Step 4: Viết `pcm-worklet.ts`.** Processor tên `meetmate-pcm` nhận đầu vào mono, chạy `floatToPcm16`, đưa vào `FrameBatcher(FRAME_SAMPLES)`, và gửi `frame.buffer` qua `port.postMessage` (transfer). Lib `DOM` của TypeScript không có `AudioWorkletProcessor` và `registerProcessor`, nên khai báo `declare` tối thiểu cho hai tên này ngay trong file.
- [ ] **Step 5: Viết `audio.ts`.**
  1. Lấy stream tab bằng `getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } })`.
  2. **Phát lại** âm thanh tab qua một `AudioContext()` riêng ở sample rate mặc định. Nếu bỏ bước này, người dùng mất tiếng cuộc họp. Không phát qua context 16 kHz, vì sẽ làm giảm chất lượng âm thanh người dùng nghe.
  3. Lấy micro bằng `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })`. Nếu lỗi, tiếp tục chỉ với âm thanh tab và gọi `onStatus('Không dùng được micro — chỉ nghe âm thanh từ người khác')`.
  4. Tạo `new AudioContext({ sampleRate: SAMPLE_RATE })` (trình duyệt tự đổi sample rate), nối cả tab và micro vào một `AudioWorkletNode` `meetmate-pcm` với `channelCount: 1` và `channelCountMode: 'explicit'`.
  5. Khi track tab phát sự kiện `ended` (người dùng rời Meet hoặc đóng tab), gọi hàm dừng.
- [ ] **Step 6: Chạy test.**
  Run: `npx vitest run extension/src/pcm.test.ts && npm run check`
  Expected: PASS.
- [ ] **Step 7: Kiểm tra tay.** Tạm log số frame mỗi giây trong `offscreen.ts`, build lại, bắt đầu trong một cuộc Meet có người nói.
  Expected: khoảng 10 frame mỗi giây, và người dùng vẫn nghe rõ cuộc họp. Xóa log sau khi kiểm tra xong.

### Task 4: Client Blaze STT

**Files:**
- Create: `extension/src/stt.ts`
- Test: `extension/src/stt.test.ts`
- Modify: `extension/src/offscreen.ts`

**Interfaces:**
- Produces:

```ts
export type SttSocket = {
  binaryType: string;
  onopen: (() => void) | null; onclose: (() => void) | null; onerror: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  readyState: number; send(data: string | ArrayBufferLike): void; close(): void;
};
export function blazeSttUrl(): string; // khóa nằm trong message đầu tiên, không nằm trên URL
export class BlazeStt {
  constructor(opts: { apiKey: string; onFinal: (text: string) => void; onError: (message: string) => void;
                      socketFactory?: (url: string) => SttSocket });
  connect(): Promise<void>;        // resolve khi nhận ready; reject khi lỗi, gặp message lạ trước ready, hoặc quá 10 giây
  sendFrame(frame: Int16Array): void; // bỏ qua nếu socket chưa mở
  close(): void;                   // ngừng gửi frame, chờ 1 giây để nhận nốt final rồi đóng socket
}
```

- [ ] **Step 1: Viết test thất bại.** Dùng một fake socket lưu lại những gì đã `send`.
  - `blazeSttUrl('a&b')` chứa `model=blaze-stt-1.5-realtime`, `language=vi` và `api_key=a%26b`.
  - Khi mở socket, gửi `{token, language: "vi", model: "stt-stream-1.5"}`. `connect()` resolve sau `successful-authentication` rồi `ready`.
  - `transcript.text.done` với `text: '  Xin chào  '` gọi `onFinal('Xin chào')`. Text rỗng không gọi `onFinal`.
  - `transcript.text.partial` không gọi callback nào.
  - `{"type":"error","error":{"message":"Insufficient credits"}}` gọi `onError('Blaze STT: Insufficient credits')`.
  - Socket đóng bất ngờ (chưa gọi `close()`) gọi `onError('Mất kết nối Blaze STT')`.
  - `sendFrame` trước khi mở thì không gửi gì. Sau khi mở thì gửi đúng `frame.buffer`.
  - `close()` ngừng gửi frame ngay, vẫn nhận `final` trong 1 giây, sau đó mới đóng socket.
- [ ] **Step 2: Chạy test, kiểm tra nó thất bại.**
  Run: `npx vitest run extension/src/stt.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Viết `stt.ts`.** `socketFactory` mặc định là `url => new WebSocket(url)`, với `binaryType = 'arraybuffer'`. Không log khóa API hay nội dung transcript.
- [ ] **Step 4: Chạy test.**
  Run: `npx vitest run extension/src/stt.test.ts`
  Expected: PASS.
- [ ] **Step 5: Nối vào offscreen.**
  - `startCapture` gọi `stt.sendFrame`. Tạm log `onFinal` ra console. `onError` gửi `meetmate.status`.
  - Nếu Task 1 Step 2 cho thấy server cần `commit` hoặc cần bật `turn_detection`, thêm lệnh đó theo tài liệu ngay sau `connect()`.
- [ ] **Step 6: Kiểm tra tay.** Nói tiếng Việt trong một cuộc Meet thử.
  Expected: console của offscreen in ra từng câu tiếng Việt trong vài giây sau khi nói. Nhập khóa Blaze sai thì popup hiện lỗi.

### Task 5: Blaze LLM, cửa sổ transcript và tách chủ đề

**Files:**
- Create: `extension/src/llm.ts`, `extension/src/transcript.ts`, `extension/src/topic.ts`
- Test: `extension/src/llm.test.ts`, `extension/src/transcript.test.ts`, `extension/src/topic.test.ts`

**Interfaces:**
- Produces:

```ts
// llm.ts
export type ChatMessage = { role: 'system' | 'user'; content: string };
export type Chat = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;
export function blazeChat(apiKey: string, fetcher?: typeof fetch): Chat;
// transcript.ts
export class TranscriptWindow {
  constructor(windowMs?: number, duplicateMs?: number);
  add(text: string, atMs: number): boolean; // false nếu là câu trùng
  text(nowMs: number): string;              // các câu trong cửa sổ, nối bằng '\n'
}
// topic.ts
export type Topic = { topic: string; keywords: string[]; query: string };
export type TopicDecision = Topic & { changed: boolean };
export function parseTopic(raw: string): TopicDecision | null;
export function detectTopic(chat: Chat, current: Topic | null, transcript: string, signal: AbortSignal): Promise<TopicDecision | null>;
```

  Prompt cố định trong `topic.ts`. System:

  > Bạn đọc transcript cuộc họp tiếng Việt và xác định chủ đề chính ở phần gần nhất. Chỉ trả về một object JSON: {"topic": string, "keywords": string[], "query": string, "changed": boolean}. topic là cụm ngắn tiếng Việt; để rỗng nếu đang nói chuyện phiếm hoặc chưa rõ chủ đề. keywords tối đa 8 từ khóa. query là truy vấn tìm kiếm web ngắn, chọn tiếng Việt hoặc tiếng Anh tùy ngôn ngữ cho kết quả tốt hơn. changed là true nếu chủ đề khác chủ đề hiện tại.

  User: `Chủ đề hiện tại: ${current?.topic ?? 'chưa có'}\n\nTranscript:\n${transcript}`

- [ ] **Step 1: Viết test thất bại.**
  - **llm:**
    - Với fake `fetch` trả HTTP 200 theo đúng cấu trúc response ghi ở Task 1, `blazeChat` trả về đúng chữ trả lời.
    - Với HTTP 402, nó ném lỗi có chứa `402`.
    - Request có header `Authorization: Bearer <key>` và model `BLAZE_LLM_MODEL`.
  - **transcript:**
    - `add('Lãi suất', 0)` rồi `add('lãi  suất', 3000)` trả về `false`.
    - Thêm lại cùng câu đó ở thời điểm 9000 trả về `true`.
    - `text(200_000)` không còn câu ở thời điểm 0, vì đã ra ngoài `WINDOW_MS`.
  - **topic:**
    - `parseTopic` đọc được JSON thuần và JSON bọc trong ```` ```json ````.
    - Với chuỗi `'xin lỗi'`, `parseTopic` trả về `null`.
    - Topic rỗng thì giữ nguyên chuỗi rỗng.
    - Thiếu `query` khi topic không rỗng thì trả về `null`.
    - `keywords` bị cắt còn 8 phần tử, và bỏ các phần tử không phải chuỗi.
    - `detectTopic` gửi đúng 2 message, message user chứa `Chủ đề hiện tại: chưa có`.
- [ ] **Step 2: Chạy test, kiểm tra nó thất bại.**
  Run: `npx vitest run extension/src/llm.test.ts extension/src/transcript.test.ts extension/src/topic.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Viết ba module.**
  - Chuẩn hóa câu để so trùng bằng cách viết thường và gộp các khoảng trắng liên tiếp.
  - `parseTopic` lấy đoạn từ `{` đầu tiên tới `}` cuối cùng rồi `JSON.parse` trong `try`.
- [ ] **Step 4: Chạy test.**
  Run: cùng lệnh ở Step 2.
  Expected: PASS.

### Task 6: Tìm nguồn, viết lý do, định dạng tin chat

**Files:**
- Create: `extension/src/research.ts`
- Test: `extension/src/research.test.ts`

**Interfaces:**
- Consumes: `Chat` và `ChatMessage` (Task 5), `Topic` (Task 5), `Source` (`shared/types.ts`), `ExaProvider` (`server/providers/exa.ts`).
- Produces:

```ts
export type SourceReason = { title: string; url: string; reason: string };
export type ResearchResult = { topic: string; summary: string; sources: SourceReason[] };
export type Search = (query: string, signal: AbortSignal) => Promise<Source[]>;
export function parseResearch(raw: string, allowed: Source[], topic: string): ResearchResult | null;
export function research(topic: Topic, deps: { search: Search; chat: Chat }, signal: AbortSignal): Promise<ResearchResult | null>;
export function formatChatMessages(r: ResearchResult, maxChars?: number): string[];
```

  Prompt cố định. System:

  > Bạn là trợ lý nghiên cứu cho một cuộc họp. Chỉ dùng các nguồn được cung cấp, không thêm nguồn khác. Ưu tiên theo độ tin cậy: tài liệu chính thức > nghiên cứu hoặc benchmark độc lập > văn bản pháp luật > báo uy tín > blog. Không kết luận thay nhóm. Chỉ trả về JSON: {"summary": string, "sources": [{"url": string, "reason": string}]}. summary tối đa 300 ký tự tiếng Việt, tóm tắt thông tin các nguồn đưa ra. reason tối đa 200 ký tự tiếng Việt, giải thích vì sao nguồn này đáng tin và liên quan.

  User: `Chủ đề: ${topic.topic}`, sau đó với mỗi nguồn: tiêu đề, URL, và `text` cắt còn 1.500 ký tự.

- [ ] **Step 1: Viết test thất bại.**
  - **`parseResearch`:**
    - Bỏ nguồn có URL không nằm trong `allowed`.
    - Lấy `title` từ `allowed`, không lấy từ LLM.
    - Nếu không còn nguồn nào thì trả về `null`.
    - Đọc được JSON bọc trong ```` ```json ````.
  - **`research`:**
    - Gọi `search` với `topic.query`.
    - Nếu `search` trả về mảng rỗng thì trả về `null` và **không** gọi `chat`.
    - Chuyển cùng `signal` cho cả `search` và `chat`.
  - **`formatChatMessages`:**
    - Tin đầu tiên là `MeetMate: Chủ đề: <topic>\n<summary>`.
    - Mỗi nguồn là một tin `MeetMate: [i/n] <title>\n<url>\nVì sao chọn: <reason>`.
    - Với `maxChars = 120`, mọi tin có độ dài ≤ 120. URL không bao giờ bị cắt. Phần title, summary hoặc reason bị cắt và kết thúc bằng `…`.
- [ ] **Step 2: Chạy test, kiểm tra nó thất bại.**
  Run: `npx vitest run extension/src/research.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Viết `research.ts`.** Không import `ExaProvider` trong file này. Offscreen sẽ truyền `(q, s) => new ExaProvider(exaApiKey).search(q, s)` làm `search`.
- [ ] **Step 4: Chạy test.**
  Run: `npx vitest run extension/src/research.test.ts`
  Expected: PASS.

### Task 7: Điều phối phiên họp

**Files:**
- Create: `extension/src/session.ts`
- Test: `extension/src/session.test.ts`

**Interfaces:**
- Consumes: `TranscriptWindow`, `Topic`, `TopicDecision` (Task 5), `ResearchResult`, `formatChatMessages` (Task 6).
- Produces:

```ts
export class MeetingSession {
  constructor(deps: {
    detect: (current: Topic | null, transcript: string, signal: AbortSignal) => Promise<TopicDecision | null>;
    research: (topic: Topic, signal: AbortSignal) => Promise<ResearchResult | null>;
    post: (text: string) => void;
    onError: (message: string) => void;
    now?: () => number;
  });
  onFinal(text: string): void;
  stop(): void;
}
```

  Quy tắc:
  - Gọi `detect` khi có ít nhất `TOPIC_CHECK_EVERY` câu mới kể từ lần kiểm tra trước, đã qua ít nhất `TOPIC_CHECK_MIN_GAP_MS`, và không có lần `detect` nào đang chạy.
  - Chủ đề mới là khi kết quả có `topic` khác rỗng và (`current === null` hoặc `changed === true`). Khi đó: abort controller research cũ, đặt `current`, rồi chạy research mới.
  - Kết quả research chỉ được gửi khi controller của nó chưa bị abort.
  - Lỗi từ `detect` hoặc `research` (trừ `AbortError`) được chuyển cho `onError`, không gửi vào chat.

- [ ] **Step 1: Viết test thất bại.** Dùng `now` giả và fake `detect`/`research` có thể resolve bằng tay.
  - 2 câu thì không gọi `detect`. Câu thứ 3 ở thời điểm ≥ 15.000 ms thì gọi đúng 1 lần.
  - Chủ đề A rồi chủ đề B (`changed: true`) khi research A đang chạy: signal của A bị abort, kết quả A trả về muộn **không** được gửi, kết quả B được gửi.
  - `changed: false` với chủ đề hiện có thì không gọi `research` lần nữa.
  - `topic: ''` thì không gọi `research` và không gửi gì.
  - `research` ném lỗi `Error('Exa 429')` thì `onError` được gọi và `post` không được gọi.
  - Câu trùng (theo `TranscriptWindow.add` trả về `false`) không được tính vào số câu mới.
  - Sau `stop()`: research đang chạy bị abort, và `onFinal` không còn gọi `detect`.
- [ ] **Step 2: Chạy test, kiểm tra nó thất bại.**
  Run: `npx vitest run extension/src/session.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Viết `session.ts`.** Mỗi tin trong `formatChatMessages(result)` được gửi qua `post` theo thứ tự.
- [ ] **Step 4: Chạy test.**
  Run: `npx vitest run extension/src/session.test.ts`
  Expected: PASS.

### Task 8: Gửi chat Meet, nối toàn bộ và chạy thử thật

**Files:**
- Create: `extension/src/content/content.ts`
- Modify: `extension/src/offscreen.ts`

**Interfaces:**
- Consumes: `CHAT_INPUT`, `CHAT_SEND_BUTTON`, `CHAT_OPEN_BUTTON` (Task 1), `Msg` (Task 2), `BlazeStt` (Task 4), `blazeChat` và `detectTopic` (Task 5), `research` (Task 6), `MeetingSession` (Task 7).

- [ ] **Step 1: Viết `content.ts`.**
  - Nhận `meetmate.post` và đưa vào hàng đợi, gửi tuần tự, mỗi tin cách nhau 600 ms.
  - Với mỗi tin:
    1. Tìm ô nhập theo `CHAT_INPUT`.
    2. Nếu không thấy, bấm `CHAT_OPEN_BUTTON` rồi chờ tối đa 3 giây.
    3. Focus ô nhập và chèn chữ bằng `document.execCommand('insertText', false, text)`.
    4. Bấm `CHAT_SEND_BUTTON`, hoặc phát phím Enter như ở Task 1.
  - Nếu không tìm được ô nhập, trả lời `{ ok: false }`. Background khi đó ghi trạng thái "Không gửi được vào chat Meet".
- [ ] **Step 2: Nối pipeline trong `offscreen.ts`.**
  - `chat = blazeChat(blazeApiKey)`.
  - `new MeetingSession({ detect: (c, t, s) => detectTopic(chat, c, t, s), research: (t, s) => research(t, { search: (q, sig) => new ExaProvider(exaApiKey).search(q, sig), chat }, s), post: text => chrome.runtime.sendMessage({ type: 'meetmate.post', text }), onError: status })`.
  - `BlazeStt.onFinal` gọi `session.onFinal`.
  - Khi nhận `meetmate.offscreen.stop`: gọi `session.stop()`, `stt.close()` và hàm dừng audio.
  - Xóa các log transcript tạm còn sót từ Task 4.
- [ ] **Step 3: Chạy toàn bộ test, typecheck và build.**
  Run: `npm test && npm run check && npm run extension:build`
  Expected: tất cả PASS, build không lỗi.
- [ ] **Step 4: Chạy thử thật.** Hai người vào một cuộc Meet. Người chạy MeetMate đeo tai nghe. Cả hai bàn khoảng một phút về một chủ đề AI, rồi chuyển sang chủ đề thứ hai.
  Expected:
  - Trong vòng khoảng 30 giây sau khi chủ đề rõ ràng, chat có tin `MeetMate: Chủ đề: …` và các tin `[i/n]`. Link bấm được và đúng là trang Exa trả về.
  - Khi đổi chủ đề, có một bộ tin mới cho chủ đề thứ hai.
  - Nói chuyện phiếm thì không có tin nào.
  - Bấm Dừng thì không còn tin mới. Người dùng nghe cuộc họp bình thường trong suốt buổi thử.
