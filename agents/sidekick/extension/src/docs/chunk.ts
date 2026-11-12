import { CHUNK_CHARS, CHUNK_OVERLAP_CHARS } from '../config';

/** page..pageEnd: a sentence that runs over a page break keeps both pages in its citation. */
export type Chunk = { id: string; docId: string; docName: string; page: number; pageEnd: number; text: string };
type Piece = { text: string; page: number };

function split(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    if (current && current.length + 1 + word.length > size) {
      out.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) out.push(current);
  return out;
}

function pieces(pages: string[], size: number): Piece[] {
  return pages.flatMap((pageText, index) =>
    pageText
      .split(/\n+|(?<=[.!?;:])\s+/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .flatMap(sentence => split(sentence, size).map(text => ({ text, page: index + 1 }))),
  );
}

export const pageLabel = (chunk: Pick<Chunk, 'page' | 'pageEnd'>) =>
  chunk.pageEnd > chunk.page ? `tr. ${chunk.page}–${chunk.pageEnd}` : `tr. ${chunk.page}`;

/**
 * Packs the document's lines into chunks of about `size` characters, flowing across page
 * breaks so a fact split over two pages stays whole. Neighbouring chunks share up to
 * `overlap` characters, so a fact on a chunk boundary still appears whole in one of them.
 */
export function chunkPages(
  doc: { id: string; name: string },
  pages: string[],
  size = CHUNK_CHARS,
  overlap = CHUNK_OVERLAP_CHARS,
): Chunk[] {
  const chunks: Chunk[] = [];
  let current: Piece[] = [];
  const flush = () => {
    if (!current.length) return;
    chunks.push({
      id: `${doc.id}#${chunks.length + 1}`,
      docId: doc.id,
      docName: doc.name,
      page: current[0].page,
      pageEnd: current.at(-1)!.page,
      text: current.map(p => p.text).join(' '),
    });
  };
  for (const piece of pieces(pages, size)) {
    const length = current.reduce((sum, p) => sum + p.text.length + 1, 0);
    if (current.length && length + piece.text.length > size) {
      flush();
      const tail: Piece[] = [];
      let kept = 0;
      for (let i = current.length - 1; i >= 0 && kept + current[i].text.length <= overlap; i--) {
        tail.unshift(current[i]);
        kept += current[i].text.length + 1;
      }
      current = tail;
    }
    current.push(piece);
  }
  flush();
  return chunks;
}
