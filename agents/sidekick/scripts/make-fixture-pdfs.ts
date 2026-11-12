// Renders extension/fixtures/*.md into real text PDFs (Chromium print), used by the PDF tests,
// the meeting simulation and the end-to-end test. Run: npx tsx scripts/make-fixture-pdfs.ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const dir = 'extension/fixtures';
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toHtml(markdown: string): string {
  const body = markdown.split(/\n{2,}/).map(block => {
    const text = block.trim();
    if (text.startsWith('## ')) return `<h2>${escape(text.slice(3))}</h2>`;
    if (text.startsWith('# ')) return `<h1>${escape(text.slice(2))}</h1>`;
    return `<p>${text.split('\n').map(escape).join('<br>')}</p>`;
  }).join('\n');
  return `<!doctype html><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; font-size: 15pt; line-height: 1.6; margin: 0; }
    h1 { font-size: 20pt; } h2 { font-size: 17pt; margin-top: 1.4em; }
  </style>${body}`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of (await readdir(dir)).filter(f => f.endsWith('.md'))) {
  await page.setContent(toHtml(await readFile(join(dir, name), 'utf8')));
  const out = join(dir, name.replace(/\.md$/, '.pdf'));
  await page.pdf({ path: out, format: 'A4', margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' } });
  console.log(`wrote ${out}`);
}
await browser.close();
