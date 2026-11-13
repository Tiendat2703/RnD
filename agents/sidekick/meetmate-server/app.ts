import { generateChecklist } from './presentation';
import type { Chat } from './llm';
// HTTP cho web console. Chỉ nghe loopback (xem index.ts) và chỉ nhận origin của web.
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { DOC_LIMITS } from '../../../lib/documents';
import { buildDocument, cleanName, readPdf, type DocumentStore } from './documents';
import { SESSION_ID, sessionSchema } from './schema';
import { HttpError, type SessionService } from './service';
import type { TeacherService } from './teacher';
import { teacherRouter } from './teacher-routes';
import { parseTeacherFile } from './teacher-files';
import type { TeacherVoiceService } from './teacher-voice';

export interface AppOptions {
  service: SessionService;
  documents: DocumentStore;
  /** origin web được phép gọi, ví dụ http://localhost:3000 */
  allowedOrigins: string[];
  presentationChat?: Chat | null;
  teacher?: TeacherService;
  teacherVoice?: TeacherVoiceService;
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

// .docx và văn bản dán được đọc trên trình duyệt; backend chỉ nhận các trang chữ.
const textDocSchema = z.object({
  name: z.string().min(1).max(500),
  format: z.enum(['DOCX', 'TEXT']),
  size: z.number().int().min(0).max(DOC_LIMITS.maxPdfBytes),
  pages: z.array(z.string().max(2_000_000)).min(1).max(5_000),
});

export function createApp({ service, documents, allowedOrigins, teacher, teacherVoice, presentationChat }: AppOptions) {
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Teacher-Member, X-File-Name, X-Voice-Sequence');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  if (teacher) app.use('/api/teacher', teacherRouter(teacher, teacherVoice));

  app.post('/api/presentation/checklist', route(async req => {
    if(process.env.MEETMATE_PRESENTATION_ENABLED==='false') throw new HttpError(503,'Chế độ Thuyết trình đang tạm tắt.');
    const ids = z.array(z.string().min(1).max(80)).min(1).max(20).safeParse(req.body?.documentIds);
    if (!ids.success) throw new HttpError(400, 'Chọn ít nhất một tài liệu.');
    const docs = await Promise.all([...new Set(ids.data)].map(id => documents.get(id)));
    return generateChecklist(docs, presentationChat ?? null, AbortSignal.timeout(60_000));
  }));

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

  app.get('/api/documents', route(() => documents.list()));

  app.get('/api/documents/:id', route((req) => documents.get(String(req.params.id ?? ''))));
  app.post('/api/documents/office', express.raw({ type: 'application/octet-stream', limit: DOC_LIMITS.maxPdfBytes }), route(async req => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'Không nhận được nội dung tệp. Hãy chọn lại file.');
    let name: string;
    try { name = cleanName(decodeURIComponent(req.header('X-File-Name') ?? '')); }
    catch { throw new HttpError(400, 'Tên tệp không hợp lệ.'); }
    if (!/\.(docx|pptx)$/i.test(name)) throw new HttpError(400, 'Hỗ trợ Word DOCX và slide PPTX. Với DOC/PPT cũ, hãy lưu lại bằng định dạng mới.');
    const parsed = await parseTeacherFile(name, req.body, { bytes: DOC_LIMITS.maxPdfBytes, chars: DOC_LIMITS.maxSessionChars });
    // Empty slides are omitted by extraction; retain their positions for accurate citations.
    const pages: string[] = [];
    for (const section of parsed.sections) {
      const page = Number(section.locator.match(/(\d+)$/)?.[1] ?? pages.length + 1);
      while (pages.length < page) pages.push('');
      pages[page - 1] = section.text;
    }
    return documents.save(buildDocument(name, parsed.format as 'DOCX' | 'PPTX', req.body.length, pages));
  }));

  // PDF gửi nguyên byte (không multipart); tên file nằm ở header, đã encodeURIComponent.
  app.post(
    '/api/documents/pdf',
    express.raw({ type: 'application/pdf', limit: DOC_LIMITS.maxPdfBytes }),
    route(async (req) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'Không nhận được nội dung file PDF.');
      let name: string;
      try {
        name = cleanName(decodeURIComponent(String(req.headers['x-file-name'] ?? '')));
      } catch {
        name = 'Tài liệu.pdf';
      }
      const pages = await readPdf(new Uint8Array(req.body), name);
      return documents.save(buildDocument(name, 'PDF', req.body.length, pages));
    }),
  );

  app.post(
    '/api/documents/text',
    route(async (req) => {
      const parsed = textDocSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'Dữ liệu tài liệu không hợp lệ.');
      const { name, format, size, pages } = parsed.data;
      return documents.save(buildDocument(cleanName(name), format, size, pages));
    }),
  );

  app.delete(
    '/api/documents/:id',
    route(async (req) => {
      await documents.remove(String(req.params.id ?? ''));
      return { ok: true };
    }),
  );

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const type = (error as { type?: string }).type;
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'Dữ liệu quá lớn để gửi (PDF tối đa 40 MB).' });
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
