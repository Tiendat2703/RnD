// Mirrors BLAZE_API_URL in .env.livekit; an extension cannot read env files at runtime.
export const BLAZE_API_BASE = 'https://dev-api.blaze.vn';
// shortcut: legacy realtime protocol (token handshake, partial/final), which works while the
// new /v1/audio/transcriptions/realtime drops with 1006; Blaze retires it after 31/03/2027.
export const BLAZE_STT_URL = `${BLAZE_API_BASE.replace(/^http/, 'ws')}/v1/stt/realtime`;
export const BLAZE_STT_MODEL = 'stt-stream-1.5';
// OpenAI-compatible gateway; model list at GET /v1/models. Haiku 5.5: fast, cheap, good Vietnamese.
export const BLAZE_LLM_URL = `${BLAZE_API_BASE}/v1/chat/completions`;
export const BLAZE_LLM_MODEL = 'anthropic/claude-haiku-5-5';
export const MEET_CHAT_MAX_CHARS = 450; // Task 1 measures the real limit
export const CHAT_PREFIX = 'MeetMate: ';
export const SAMPLE_RATE = 16_000;
export const FRAME_SAMPLES = 1_600;
export const WINDOW_MS = 120_000;
export const DUPLICATE_MS = 5_000;
export const TOPIC_CHECK_EVERY = 3;
export const TOPIC_CHECK_MIN_GAP_MS = 15_000;
