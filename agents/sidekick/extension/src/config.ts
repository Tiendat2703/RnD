// Mirrors BLAZE_API_URL in .env.livekit; an extension cannot read env files at runtime.
export const BLAZE_API_BASE = 'https://api.blaze.vn';
// shortcut: legacy realtime protocol (token handshake, partial/final), which works while the
// new /v1/audio/transcriptions/realtime drops with 1006; Blaze retires it after 31/03/2027.
export const BLAZE_STT_URL = `${BLAZE_API_BASE.replace(/^http/, 'ws')}/v1/stt/realtime`;
export const BLAZE_STT_MODEL = 'stt-stream-1.5';
// OpenAI-compatible gateway; model list at GET /v1/models.
export const BLAZE_LLM_URL = `${BLAZE_API_BASE}/v1/chat/completions`;
export const BLAZE_LLM_MODEL = 'openai/gpt-6-luna';
export const MEET_CHAT_MAX_CHARS = 450; // Task 1 measures the real limit
export const CHAT_PREFIX = 'MeetMate: ';
export const SAMPLE_RATE = 16_000;
export const FRAME_SAMPLES = 1_600;
export const WINDOW_MS = 120_000;
export const DUPLICATE_MS = 5_000;
export const TOPIC_CHECK_EVERY = 3;
export const TOPIC_CHECK_MIN_GAP_MS = 15_000;

// STT reconnect backoff after a drop mid-meeting.
export const STT_RETRY_BASE_MS = 1_000;
export const STT_RETRY_MAX_MS = 15_000;

// Documents: chunks flow across pages and record the page range they cover.
export const CHUNK_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 150;
// Documents up to this size go to the LLM whole, as a fixed prompt prefix the gateway caches
// (measured: 99.8% cached from the second call, 1.7–3.5 s). Larger sets fall back to BM25 top-K.
export const FULL_DOC_MAX_CHARS = 300_000;
export const RETRIEVE_TOP_K = 20;
// A line needs this many meaningful syllables (or a number, or a question) to be worth a check.
export const MIN_MEANINGFUL_TERMS = 4;
// A finding already reported is not repeated within this window.
export const REPORT_TTL_MS = 10 * 60_000;
// Lines before the new ones that give the LLM conversational context.
export const DOC_CONTEXT_LINES = 4;
// "Trợ lý" said alone: only the next line within this window is the question.
export const WAKE_FOLLOWUP_MS = 10_000;
// Web answers: fewer, shorter sources make Exa reply faster and the LLM read and write less.
export const RESEARCH_MAX_SOURCES = 3;
export const RESEARCH_SOURCE_CHARS = 1_500;
