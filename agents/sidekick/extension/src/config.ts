// Hằng số của extension. Giá trị lấy từ OpenAPI công khai của dev-api.blaze.vn
// (03/11/2026): /v1/chat/completions là OpenAI-compatible, xác thực Bearer.
export const BLAZE_STT_URL = 'wss://dev-api.blaze.vn/v1/audio/transcriptions/realtime';
export const BLAZE_STT_MODEL = 'blaze-stt-1.5-realtime';
export const BLAZE_LLM_URL = 'https://dev-api.blaze.vn/v1/chat/completions';
// Tên model lấy từ ví dụ trong OpenAPI của Blaze; xác nhận lại bằng
// `GET /v1/models` với khóa thật trước khi demo.
export const BLAZE_LLM_MODEL = 'openai/gpt-4.1-mini';
export const EXA_SEARCH_URL = 'https://api.exa.ai/search';
// Chưa đo được giới hạn thật của chat Meet (Task 1 bước 3); 450 là giá trị đã chốt trong kế hoạch.
export const MEET_CHAT_MAX_CHARS = 450;
export const CHAT_PREFIX = 'MeetMate: ';
export const CHAT_GAP_MS = 600;
export const SAMPLE_RATE = 16_000;
export const FRAME_SAMPLES = 1_600;
export const WINDOW_MS = 120_000;
export const DUPLICATE_MS = 5_000;
export const TOPIC_CHECK_EVERY = 3;
export const TOPIC_CHECK_MIN_GAP_MS = 15_000;
export const MAX_SOURCES = 4;
