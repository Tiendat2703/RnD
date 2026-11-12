// The slice of pdf.js this file uses, so the browser build and the Node tests share one parser.
type TextItem = { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean };
type PdfPage = { getTextContent(): Promise<{ items: unknown[] }> };
type PdfDocument = { numPages: number; getPage(n: number): Promise<PdfPage> };
export type PdfJsLike = {
  getDocument(src: Record<string, unknown>): { promise: Promise<PdfDocument>; destroy(): Promise<void> };
};

const isTextItem = (item: unknown): item is TextItem =>
  typeof (item as TextItem)?.str === 'string' && Array.isArray((item as TextItem).transform);

/** Rebuilds lines from positioned text runs: a new baseline starts a line, a gap adds a space. */
export function itemsToText(items: unknown[]): string {
  let out = '';
  let last: TextItem | null = null;
  for (const item of items.filter(isTextItem)) {
    if (last) {
      const size = Math.max(Math.abs(item.transform[3]) || item.height || 1, 1);
      const sameLine = Math.abs(item.transform[5] - last.transform[5]) < size * 0.5;
      if (last.hasEOL || !sameLine) out += '\n';
      else if (item.transform[4] - (last.transform[4] + last.width) > size * 0.2 && !/\s$/.test(out) && !/^\s/.test(item.str)) out += ' ';
    }
    out += item.str;
    last = item;
  }
  return out.replace(/[ \t]+\n/g, '\n').trim();
}

export async function extractPdfPages(data: Uint8Array, pdfjs: PdfJsLike, options: Record<string, unknown> = {}): Promise<string[]> {
  // eval stays off: extension pages forbid it under Manifest V3's content security policy.
  const task = pdfjs.getDocument({ data, isEvalSupported: false, ...options });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      pages.push(itemsToText((await page.getTextContent()).items));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

/** A scanned PDF has pages but almost no text layer; without OCR it cannot be read. */
export function looksScanned(pages: string[]): boolean {
  const chars = pages.reduce((sum, p) => sum + p.replace(/\s/g, '').length, 0);
  return pages.length > 0 && chars < 40 * pages.length;
}
