// Test-only helpers: the fixture PDFs parsed with the same code the extension runs.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { chunkPages, type Chunk } from './chunk';
import { extractPdfPages, type PdfJsLike } from './pdf';

export const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

export async function fixturePages(name: string): Promise<string[]> {
  const data = new Uint8Array(await readFile(`${FIXTURES}${name}`));
  return extractPdfPages(data, pdfjs as unknown as PdfJsLike, { verbosity: 0 });
}

export async function fixtureChunks(): Promise<Chunk[]> {
  const [hd, kh] = await Promise.all([fixturePages('hop-dong.pdf'), fixturePages('ke-hoach.pdf')]);
  return [...chunkPages({ id: 'hd', name: 'hop-dong.pdf' }, hd), ...chunkPages({ id: 'kh', name: 'ke-hoach.pdf' }, kh)];
}
