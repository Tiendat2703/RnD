import * as pdfjs from 'pdfjs-dist';
import { chunkPages } from './chunk';
import { extractPdfPages, looksScanned, type PdfJsLike } from './pdf';
import type { StoredDoc } from './store';

// pdf.js runs its parser in a worker; extension pages may only load workers they ship.
pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

export const MAX_PDF_BYTES = 40 * 1024 * 1024;

/** Reads a PDF in the side panel and prepares its chunks; nothing leaves the machine here. */
export async function ingestPdf(file: File): Promise<StoredDoc> {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error(`${file.name}: chỉ hỗ trợ file PDF`);
  if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name}: file lớn hơn 40 MB`);
  const pages = await extractPdfPages(new Uint8Array(await file.arrayBuffer()), pdfjs as unknown as PdfJsLike, {
    cMapUrl: chrome.runtime.getURL('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: chrome.runtime.getURL('standard_fonts/'),
  });
  if (looksScanned(pages)) throw new Error(`${file.name}: PDF không có lớp chữ (có thể là bản scan), MeetMate chưa đọc được loại này`);
  // Short ids keep chunk ids, and so the prompt, small.
  const id = `d${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
  const chunks = chunkPages({ id, name: file.name }, pages);
  return {
    id, name: file.name, size: file.size, pageCount: pages.length,
    chars: chunks.reduce((n, c) => n + c.text.length, 0), chunks, addedAt: Date.now(),
  };
}
