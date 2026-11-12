// HTTP cho web console. Chỉ nghe loopback (xem index.ts) và chỉ nhận origin của web.
import express, { type NextFunction, type Request, type Response } from 'express';
import { SESSION_ID, sessionSchema } from './schema';
import { HttpError, type SessionService } from './service';

export interface AppOptions {
  service: SessionService;
  /** origin web được phép gọi, ví dụ http://localhost:3000 */
  allowedOrigins: string[];
}

type Handler = (req: Request, res: Response) => Promise<unknown>;
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).then((body) => res.json(body), next);
};

function idParam(req: Request): string {
  const id = String(req.params.id ?? '');
  if (!SESSION_ID.test(id)) throw new HttpError(400, 'Mã phiên không hợp lệ.');
  return id;
}

export function createApp({ service, allowedOrigins }: AppOptions) {
  const app = express();
  const allowed = new Set(allowedOrigins);

  // Trình duyệt luôn gửi Origin cho yêu cầu khác origin. Origin lạ bị chặn hẳn, không chỉ
  // thiếu header CORS. Không có Origin (curl, test) thì cho qua vì server chỉ nghe loopback.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!allowed.has(origin)) {
        res.status(403).json({ error: 'Origin không được phép.' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/sessions', route(() => service.list()));

  app.post(
    '/api/sessions',
    route(async (req) => {
      const parsed = sessionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'Dữ liệu phiên không hợp lệ.');
      return service.save(parsed.data);
    }),
  );

  app.get('/api/sessions/:id', route((req) => service.get(idParam(req))));

  app.post('/api/sessions/:id/report/retry', route((req) => service.retry(idParam(req))));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const type = (error as { type?: string }).type;
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'Phiên quá lớn để gửi.' });
      return;
    }
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Dữ liệu gửi lên không phải JSON hợp lệ.' });
      return;
    }
    console.error('[meetmate]', error);
    res.status(500).json({ error: 'Backend gặp lỗi khi xử lý.' });
  });

  return app;
}
