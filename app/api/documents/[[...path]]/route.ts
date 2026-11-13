import { DOC_LIMITS, DOCUMENT_ID } from '../../../../lib/documents';

export const runtime = 'nodejs';

/** All session uploads use the same byte limit and the same backend parser. */
async function forward(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origin không được phép.' }, { status: 403 });
  const path = (await context.params).path?.join('/') ?? '';
  if (path && !['pdf', 'office', 'text'].includes(path) && !DOCUMENT_ID.test(path)) return Response.json({ error: 'Đường dẫn tài liệu không hợp lệ.' }, { status: 404 });
  const headers = new Headers();
  for (const name of ['Content-Type', 'X-File-Name']) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  try {
    let body: ArrayBuffer | undefined;
    if (request.body) {
      const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
      while (true) {
        const next = await reader.read(); if (next.done) break;
        total += next.value.byteLength;
        if (total > DOC_LIMITS.maxPdfBytes) { await reader.cancel(); return Response.json({ error: `File vượt giới hạn ${DOC_LIMITS.maxPdfBytes / 1024 / 1024} MB.` }, { status: 413 }); }
        chunks.push(next.value);
      }
      const bytes = new Uint8Array(total); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = bytes.buffer;
    }
    const backend = (process.env.MEETMATE_BACKEND_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
    const response = await fetch(`${backend}/api/documents${path ? `/${path}` : ''}`, {
      method: request.method, headers, body, cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(150_000)]),
    });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Không kết nối được nơi lưu tài liệu. Hãy kiểm tra backend rồi thử lại.' }, { status: 502 }); }
}
export const GET = forward;
export const POST = forward;
export const DELETE = forward;
