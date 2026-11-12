// Backend MeetMate: nhận phiên từ web khi người dùng bấm "Lưu phiên", tạo báo cáo.
// Chạy: npm run meetmate:server (trong agents/sidekick). Cấu hình ở .env.local.
import { resolve } from 'node:path';
import { createApp } from './app';
import { DEFAULT_LLM_MODEL, DEFAULT_LLM_URL, blazeChat } from './llm';
import { generateReport } from './report';
import { SessionService } from './service';
import { SessionStore } from './store';

const apiKey = process.env.BLAZE_API_KEY?.trim() ?? '';
const model = process.env.MEETMATE_LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
const url = process.env.MEETMATE_LLM_URL?.trim() || DEFAULT_LLM_URL;
const port = Number(process.env.MEETMATE_PORT || 3001);
const dataDir = resolve(process.env.MEETMATE_DATA_DIR || '.meetmate-data');
const origins = (process.env.MEETMATE_WEB_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const chat = apiKey ? blazeChat({ apiKey, url, model }) : null;
const service = new SessionService(new SessionStore(dataDir), (session) => {
  // không có khóa vẫn khởi động và vẫn lưu phiên; chỉ bước tạo báo cáo báo lỗi
  if (!chat) throw new Error('Backend chưa có khóa Blaze. Thêm BLAZE_API_KEY vào agents/sidekick/.env.local rồi khởi động lại.');
  return generateReport(session, { chat, model });
});

createApp({ service, allowedOrigins: origins }).listen(port, '127.0.0.1', () => {
  console.log(`MeetMate backend: http://127.0.0.1:${port}`);
  console.log(`  dữ liệu: ${dataDir}`);
  console.log(`  LLM: ${model} @ ${url}${apiKey ? '' : ' (CHƯA có BLAZE_API_KEY)'}`);
  console.log(`  web được phép: ${origins.join(', ')}`);
});
