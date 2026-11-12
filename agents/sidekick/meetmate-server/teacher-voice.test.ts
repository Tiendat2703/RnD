import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeacherVoiceService, type TeacherVoiceHandlers } from './teacher-voice';

const services: TeacherVoiceService[] = [];
afterEach(() => services.splice(0).forEach(service => service.dispose()));
function setup(apiKey = 'server-only-test-key') {
  const connections: { handlers: TeacherVoiceHandlers; frames: Int16Array[]; stop: ReturnType<typeof vi.fn> }[] = [];
  let now = 0;
  const service = new TeacherVoiceService({
    apiKey, now: () => now,
    authorize: async (_room, token) => {
      if (!['a', 'b'].includes(token)) throw Object.assign(new Error('Not a member'), { status: 403 });
      return { id: token, name: token === 'a' ? 'Lan' : 'Minh', joinedAt: 0 };
    },
    create: handlers => {
      const connection = { handlers, frames: [] as Int16Array[], stop: vi.fn() };
      connections.push(connection);
      return { start: async () => handlers.onState('live'), sendFrame: frame => connection.frames.push(frame.slice()), stop: connection.stop };
    },
  });
  services.push(service);
  return { service, connections, tick: (ms: number) => { now += ms; } };
}

describe('Teacher microphone relay', () => {
  it('relays little-endian PCM in provider frames and never duplicates a retried packet', async () => {
    const { service, connections } = setup();
    const session = await service.start('room-a', 'a');
    expect(session.status).toBe('listening');
    const audio = Buffer.alloc(16_000);
    audio.writeInt16LE(-1234, 0); audio.writeInt16LE(2345, 2);
    await service.audio('room-a', 'a', session.id, 0, audio);
    expect(connections[0].frames).toHaveLength(5);
    expect([...connections[0].frames[0].slice(0, 2)]).toEqual([-1234, 2345]);
    await service.audio('room-a', 'a', session.id, 0, audio);
    expect(connections[0].frames).toHaveLength(5);
    await expect(service.audio('room-a', 'a', session.id, 2, audio)).rejects.toMatchObject({ status: 409 });
    expect(JSON.stringify(session)).not.toContain('server-only-test-key');
  });

  it('streams partials and sequenced finals so polling cannot repeat a question', async () => {
    const { service, connections } = setup();
    const session = await service.start('room-a', 'a');
    connections[0].handlers.onPartial('Trợ lý, giảng');
    let snapshot = await service.audio('room-a', 'a', session.id, 0, Buffer.alloc(3200));
    expect(snapshot.partial).toBe('Trợ lý, giảng');
    connections[0].handlers.onFinal('Trợ lý, giảng slide này.');
    snapshot = await service.audio('room-a', 'a', session.id, 1, Buffer.alloc(3200));
    expect(snapshot.finals).toEqual([{ sequence: 1, text: 'Trợ lý, giảng slide này.' }]);
    expect(snapshot.partial).toBe('');
    snapshot.finals[0].text = 'client mutation';
    expect((await service.audio('room-a', 'a', session.id, 2, Buffer.alloc(3200))).finals[0].text).toBe('Trợ lý, giảng slide này.');
  });

  it('isolates members and rooms and replaces only the same member microphone', async () => {
    const { service, connections } = setup();
    const lan = await service.start('room-a', 'a');
    const minh = await service.start('room-a', 'b');
    await expect(service.audio('room-a', 'b', lan.id, 0, Buffer.alloc(3200))).rejects.toMatchObject({ status: 404 });
    await expect(service.audio('room-b', 'a', lan.id, 0, Buffer.alloc(3200))).rejects.toMatchObject({ status: 404 });
    await expect(service.start('room-a', 'intruder')).rejects.toMatchObject({ status: 403 });
    await service.start('room-a', 'a');
    expect(connections[0].stop).toHaveBeenCalledOnce();
    expect(connections[1].stop).not.toHaveBeenCalled();
    await expect(service.audio('room-a', 'a', lan.id, 0, Buffer.alloc(3200))).rejects.toMatchObject({ status: 404 });
    await service.stop('room-a', 'b', minh.id);
    expect(connections[1].stop).toHaveBeenCalledOnce();
  });

  it('releases disconnected microphones and rejects malformed packets', async () => {
    const { service, connections, tick } = setup();
    const session = await service.start('room-a', 'a');
    await expect(service.audio('room-a', 'a', session.id, 0, Buffer.alloc(3))).rejects.toMatchObject({ status: 400 });
    await expect(service.audio('room-a', 'a', session.id, 0, Buffer.alloc(32_002))).rejects.toMatchObject({ status: 400 });
    tick(30_001); service.sweep();
    expect(connections[0].stop).toHaveBeenCalledOnce();
    await expect(service.audio('room-a', 'a', session.id, 0, Buffer.alloc(3200))).rejects.toMatchObject({ status: 404 });
  });

  it('requires a configured STT credential and surfaces terminal provider failures', async () => {
    const missing = setup('');
    await expect(missing.service.start('room-a', 'a')).rejects.toMatchObject({ status: 503 });
    expect(missing.connections).toEqual([]);
    const { service, connections } = setup();
    const session = await service.start('room-a', 'a');
    connections[0].handlers.onFatal('provider detail');
    const failed = await service.audio('room-a', 'a', session.id, 0, Buffer.alloc(3200));
    expect(failed.status).toBe('error');
    expect(failed.error).not.toContain('provider detail');
  });
});
