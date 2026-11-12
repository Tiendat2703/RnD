import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import type { TeacherMember, TeacherVoiceSnapshot } from '../../../lib/teacher';
import { LiveStt, type SttState, type SttHandlers } from '../extension/src/live-stt';
import { BlazeStt, type SttSocket } from '../extension/src/stt';
import { HttpError } from './service';

export interface TeacherTranscriber {
  start(): Promise<void>;
  sendFrame(frame: Int16Array): void;
  stop(): void;
}
export interface TeacherVoiceHandlers {
  onFinal(text: string): void;
  onPartial(text: string): void;
  onState(state: SttState, detail?: string): void;
  onFatal(message: string): void;
}
interface VoiceSession {
  roomId: string; memberId: string; lastPacketAt: number; lastPacket: number;
  stt: TeacherTranscriber; snapshot: TeacherVoiceSnapshot;
}

/** Keeps STT credentials on the server; each member owns an independent microphone session. */
export class TeacherVoiceService {
  private readonly sessions = new Map<string, VoiceSession>();
  private readonly sweepTimer: ReturnType<typeof setInterval>;
  constructor(private readonly options: {
    apiKey: string;
    authorize(roomId: string, token: string): Promise<TeacherMember>;
    create?: (handlers: TeacherVoiceHandlers) => TeacherTranscriber;
    now?: () => number;
  }) {
    this.sweepTimer = setInterval(() => this.sweep(), 10_000);
    this.sweepTimer.unref();
  }
  private now() { return (this.options.now ?? Date.now)(); }

  private create(handlers: TeacherVoiceHandlers): TeacherTranscriber {
    if (this.options.create) return this.options.create(handlers);
    return new LiveStt({ ...handlers, create: (callbacks: SttHandlers) => new BlazeStt({
      ...callbacks, apiKey: this.options.apiKey, socketFactory: url => {
        const socket = new WebSocket(url);
        // ws needs an error listener; BlazeStt's close/timeout paths report the failure.
        socket.on('error', () => undefined);
        return socket as unknown as SttSocket;
      },
    }) });
  }

  async start(roomId: string, token: string): Promise<TeacherVoiceSnapshot> {
    const member = await this.options.authorize(roomId, token);
    if (!this.options.apiKey) throw new HttpError(503, 'Nhận giọng nói chưa được cấu hình. Hãy kết nối dịch vụ Blaze cho Teacher.');
    this.sweep();
    // Starting again replaces this member's previous microphone, never someone else's.
    for (const [id, session] of this.sessions) {
      if (session.roomId === roomId && session.memberId === member.id) this.close(id, session);
    }
    if (this.sessions.size >= 60) throw new HttpError(429, 'Có quá nhiều micro đang kết nối. Hãy thử lại sau.');
    const id = randomUUID();
    const snapshot: TeacherVoiceSnapshot = { id, status: 'connecting', partial: '', finals: [], error: null };
    let sequence = 0;
    const stt = this.create({
      onFinal: text => {
        if (snapshot.status === 'closed' || snapshot.status === 'error') return;
        const final = text.trim().slice(0, 6000);
        if (!final) return;
        snapshot.finals.push({ sequence: ++sequence, text: final });
        if (snapshot.finals.length > 30) snapshot.finals.shift();
        snapshot.partial = '';
      },
      onPartial: text => { if (snapshot.status === 'listening') snapshot.partial = text.slice(0, 6000); },
      onState: state => {
        if (snapshot.status === 'closed' || snapshot.status === 'error') return;
        snapshot.status = state === 'live' ? 'listening' : state === 'stopped' ? 'closed' : state;
      },
      onFatal: () => { snapshot.status = 'error'; snapshot.error = 'Nhận giọng nói đã dừng. Hãy kiểm tra kết nối hoặc cấu hình Blaze rồi bật lại micro.'; },
    });
    const session = { roomId, memberId: member.id, lastPacketAt: this.now(), lastPacket: -1, stt, snapshot };
    this.sessions.set(id, session);
    try {
      await stt.start();
      // A stopped/replaced handshake must not leave a live provider connection behind.
      if (!this.sessions.has(id)) { stt.stop(); throw new HttpError(409, 'Lượt bật micro đã được thay thế.'); }
      return this.copy(snapshot);
    } catch (error) {
      this.close(id, session);
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'Không kết nối được dịch vụ nhận giọng nói. Hãy kiểm tra khóa Blaze và thử lại.');
    }
  }

  private async owned(roomId: string, token: string, id: string): Promise<VoiceSession> {
    const member = await this.options.authorize(roomId, token);
    const session = this.sessions.get(id);
    if (!session || session.roomId !== roomId || session.memberId !== member.id) throw new HttpError(404, 'Phiên micro không còn hoạt động. Hãy bật lại micro.');
    return session;
  }

  async audio(roomId: string, token: string, id: string, packet: number, data: Buffer): Promise<TeacherVoiceSnapshot> {
    const session = await this.owned(roomId, token, id);
    if (!data.length || data.length > 32_000 || data.length % 2) throw new HttpError(400, 'Gói âm thanh PCM không hợp lệ.');
    if (!Number.isSafeInteger(packet) || packet < 0) throw new HttpError(400, 'Thứ tự gói âm thanh không hợp lệ.');
    if (packet <= session.lastPacket) return this.copy(session.snapshot); // A network retry never sends the same sound twice.
    if (packet !== session.lastPacket + 1) throw new HttpError(409, 'Gói âm thanh bị thiếu hoặc sai thứ tự. Hãy bật lại micro.');
    if (session.snapshot.status === 'closed' || session.snapshot.status === 'error') return this.copy(session.snapshot);
    session.lastPacket = packet; session.lastPacketAt = this.now();
    const samples = new Int16Array(data.length / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = data.readInt16LE(i * 2);
    for (let i = 0; i < samples.length; i += 1600) session.stt.sendFrame(samples.subarray(i, i + 1600));
    return this.copy(session.snapshot);
  }

  async stop(roomId: string, token: string, id: string): Promise<{ ok: true }> {
    const session = await this.owned(roomId, token, id); this.close(id, session); return { ok: true };
  }
  private copy(snapshot: TeacherVoiceSnapshot): TeacherVoiceSnapshot {
    return { ...snapshot, finals: snapshot.finals.map(final => ({ ...final })) };
  }
  private close(id: string, session: VoiceSession) {
    session.snapshot.status = 'closed'; session.stt.stop(); this.sessions.delete(id);
  }
  sweep(): void {
    for (const [id, session] of this.sessions) {
      if (this.now() - session.lastPacketAt > 30_000) this.close(id, session);
    }
  }
  dispose(): void {
    clearInterval(this.sweepTimer);
    for (const [id, session] of this.sessions) this.close(id, session);
  }
}
