import express, { type Request, type Response, type NextFunction } from 'express';
import { createTeacherSchema, teacherJoinSchema, teacherMessageSchema, type TeacherService } from './teacher';
import { HttpError } from './service';
import type { TeacherVoiceService } from './teacher-voice';

export function teacherRouter(service: TeacherService, voice?: TeacherVoiceService) {
  const router = express.Router();
  const route = (fn: (req: Request) => unknown | Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve().then(() => fn(req)).then(data => res.json(data), next);
  };
  const token = (req: Request) => req.header('X-Teacher-Member') ?? '';
  const id = (req: Request) => String(req.params.id);
  router.get('/config', route(() => service.config()));
  router.get('/rooms', route(() => service.list()));
  router.post('/rooms', route(req => {
    const parsed = createTeacherSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Hãy nhập tên phòng, môn học, trình độ và tên của bạn.');
    return service.create(parsed.data);
  }));
  router.get('/rooms/:id/info', route(req => service.info(id(req))));
  router.get('/rooms/:id', route(req => service.get(id(req), token(req))));
  if (voice) {
    router.post('/rooms/:id/voice', route(req => voice.start(id(req), token(req))));
    router.post('/rooms/:id/voice/:voiceId/audio', express.raw({ type: 'application/octet-stream', limit: '32kb' }), route(req => {
      if (!Buffer.isBuffer(req.body)) throw new HttpError(400, 'Không nhận được âm thanh.');
      const sequence = req.header('X-Voice-Sequence') ?? '';
      if (!/^\d+$/.test(sequence)) throw new HttpError(400, 'Gói âm thanh thiếu số thứ tự.');
      return voice.audio(id(req), token(req), String(req.params.voiceId), Number(sequence), req.body);
    }));
    router.post('/rooms/:id/voice/:voiceId/stop', route(req => voice.stop(id(req), token(req), String(req.params.voiceId))));
  }
  router.post('/rooms/:id/join', route(req => {
    const parsed = teacherJoinSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Hãy nhập tên của bạn (tối đa 60 ký tự).');
    return service.join(id(req), parsed.data.name);
  }));
  router.post('/rooms/:id/documents', express.raw({ type: 'application/octet-stream', limit: '10mb' }), route(req => {
    let name: string;
    try { name = decodeURIComponent(req.header('X-File-Name') ?? ''); }
    catch { throw new HttpError(400, 'Tên tệp không hợp lệ.'); }
    if (!Buffer.isBuffer(req.body)) throw new HttpError(400, 'Không nhận được nội dung tệp.');
    return service.upload(id(req), token(req), name, req.body);
  }));
  router.post('/rooms/:id/messages', route(req => {
    const parsed = teacherMessageSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Câu hỏi không hợp lệ hoặc quá 6.000 ký tự.');
    return service.message(id(req), token(req), parsed.data);
  }));
  return router;
}
