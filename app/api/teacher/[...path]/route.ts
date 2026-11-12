import { TEACHER_LIMITS } from '../../../../lib/teacher';

export const runtime = 'nodejs';

/** Same-origin gateway: shared rooms work at the web URL, including on a LAN. */
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origin không được phép.' }, { status: 403 });
  const path = (await context.params).path.join('/');
  if (!/^(?:config|rooms(?:\/[\da-f-]{36}(?:\/(?:info|join|documents|messages|voice(?:\/[\da-f-]{36}\/(?:audio|stop))?))?)?)$/i.test(path)) {
    return Response.json({ error: 'Đường dẫn Teacher không hợp lệ.' }, { status: 404 });
  }
  const headers = new Headers();
  for (const key of ['Content-Type', 'X-Teacher-Member', 'X-File-Name', 'X-Voice-Sequence']) {
    const value = request.headers.get(key); if (value) headers.set(key, value);
  }
  try {
    let body: ArrayBuffer | undefined;
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > TEACHER_LIMITS.fileBytes) { await reader.cancel(); return Response.json({ error: 'Tối đa 10 MB mỗi tệp.' }, { status: 413 }); }
        chunks.push(next.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = bytes.buffer;
    }
    const backend = (process.env.MEETMATE_BACKEND_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
    const upstream = await fetch(`${backend}/api/teacher/${path}`, {
      method: request.method, headers, body, cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(150_000)]),
    });
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Không kết nối được phòng học. Hãy kiểm tra backend rồi thử lại.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
