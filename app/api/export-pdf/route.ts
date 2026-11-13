import { chromium } from '@playwright/test';

export const runtime = 'nodejs';

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function reportHtml(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const heading = /^#{1,3}\s+(.+)$/.exec(line);
      if (heading) return '<h2>' + escape(heading[1]) + '</h2>';
      if (line.startsWith('> ')) return '<blockquote>' + escape(line.slice(2)) + '</blockquote>';
      return line ? '<p>' + escape(line) + '</p>' : '<div class="gap"></div>';
    })
    .join('');
}

export async function POST(request: Request) {
  if (
    request.headers.get('origin') &&
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return Response.json({ error: 'Origin không được phép.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.title !== 'string' ||
    typeof body.text !== 'string' ||
    !body.text.trim() ||
    body.title.length > 500 ||
    body.text.length > 500_000
  ) {
    return Response.json({ error: 'Nội dung báo cáo không hợp lệ.' }, { status: 400 });
  }
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    // Only escaped text is rendered: meeting content cannot load scripts or remote resources.
    await page.setContent(`<!doctype html><html lang="vi"><meta charset="utf-8"><style>
      @page { size: A4; margin: 20mm; }
      body { font: 11pt/1.6 Arial, sans-serif; color: #17212b; }
      h1 { font-size: 20pt; line-height: 1.3; }
      p { margin: 3pt 0; white-space: pre-wrap; overflow-wrap: anywhere; }
      h2 { font-size: 13pt; margin: 12pt 0 5pt; break-after: avoid; }
      blockquote { margin: 5pt 0; padding-left: 10pt; border-left: 2px solid #ccd4dc; overflow-wrap: anywhere; }
      .gap { height: 5pt; }
    </style><body><h1>${escape(body.title)}</h1>${reportHtml(body.text)}</body></html>`);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="bao-cao-cuoc-hop.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { error: 'Không tạo được PDF. Kiểm tra Chrome đã được cài trên máy chạy frontend.' },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
