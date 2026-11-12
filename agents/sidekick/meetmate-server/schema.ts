// Kiểm tra phiên web gửi lên. Hình dạng khớp `SavedSession` trong lib/bridgeProtocol.ts;
// giới hạn độ dài để một gói lỗi không làm đầy đĩa hoặc prompt.
import { z } from 'zod';
import type { SavedSession } from '../../../lib/bridgeProtocol';

/** id dùng làm tên tệp: chỉ ký tự an toàn, không có `/` hay `..`. */
export const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

const text = (max: number) => z.string().max(max);

const line = z.object({
  id: text(80),
  text: text(4000),
  atMs: z.number().finite().nonnegative(),
  source: z.enum(['tab', 'mic', 'mixed']),
});

const source = z.object({ title: text(500), url: text(2000), reason: text(1000) });

const topic = z.object({
  topic: z.object({ topic: text(300), keywords: z.array(text(100)).max(30), query: text(500) }),
  result: z.object({ topic: text(300), summary: text(2000), sources: z.array(source).max(20) }).nullable(),
  posted: z.number().int().nonnegative(),
});

export const sessionSchema = z.object({
  id: z.string().regex(SESSION_ID),
  title: text(200),
  kind: z.enum(['san-pham', 'nghien-cuu', 'dao-tao', 'ban-le', 'khac']),
  startedAt: z.number().finite(),
  endedAt: z.number().finite().nullable(),
  lines: z.array(line).max(5000),
  topics: z.array(topic).max(500),
  // thẻ đối chiếu chỉ được lưu lại, báo cáo không đọc chúng
  cards: z.array(z.unknown()).max(500).optional(),
  syncedAt: z.number().nullable().optional(),
});

export type IncomingSession = z.infer<typeof sessionSchema>;

// biên dịch lỗi ngay nếu schema lệch khỏi kiểu dùng chung
const _check: (s: IncomingSession) => Omit<SavedSession, 'cards'> = (s) => s;
void _check;
