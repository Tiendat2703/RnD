// lib/docxText.ts — đọc chữ từ một file .docx ngay trong trình duyệt, không gửi đi đâu.
//
// .docx là file zip chứa word/document.xml. Ở đây chỉ làm đúng việc cần cho kho tài liệu:
// lấy các đoạn văn (kèm cờ "đây là tiêu đề") rồi gói thành các đoạn có vị trí để truy xuất.
// Chưa đọc bảng phức tạp, hình, chú thích hay số trang: chúng không có trong file zip theo
// cách đáng tin, nên bản mẫu không tuyên bố số trang thật.

export const MAX_DOCX_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 30 * 1024 * 1024;

export interface DocParagraph {
  text: string;
  heading: boolean;
}

export interface DocChunk {
  locator: string;
  text: string;
}

export interface ParsedDoc {
  paragraphs: DocParagraph[];
  chunks: DocChunk[];
  wordCount: number;
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  if (buf.byteLength > MAX_XML_BYTES) throw new Error("Nội dung file quá lớn để đọc.");
  return new Uint8Array(buf);
}

/** Lấy một mục trong file zip theo tên. */
async function zipEntry(buf: ArrayBuffer, name: string): Promise<Uint8Array | null> {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65535); i--) {
    if (u32(v, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Đây không phải file .docx hợp lệ.");
  const count = u16(v, eocd + 10);
  let p = u32(v, eocd + 16);
  for (let n = 0; n < count; n++) {
    if (u32(v, p) !== 0x02014b50) break;
    const method = u16(v, p + 10);
    const compSize = u32(v, p + 20);
    const nameLen = u16(v, p + 28);
    const extraLen = u16(v, p + 30);
    const commentLen = u16(v, p + 32);
    const localOff = u32(v, p + 42);
    const entryName = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (entryName === name) {
      const lNameLen = u16(v, localOff + 26);
      const lExtraLen = u16(v, localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(start, start + compSize);
      if (method === 0) return raw;
      if (method === 8) return inflateRaw(raw);
      throw new Error("File .docx dùng kiểu nén chưa hỗ trợ.");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function paragraphsOf(xml: string): DocParagraph[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Không đọc được nội dung file .docx.");
  const out: DocParagraph[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
    let text = "";
    for (const node of Array.from(p.getElementsByTagNameNS("*", "*"))) {
      if (node.localName === "t") text += node.textContent ?? "";
      else if (node.localName === "tab") text += " ";
      else if (node.localName === "br") text += " ";
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const style = p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") ?? "";
    out.push({ text, heading: /^(heading\s*\d|title|tiêu)/i.test(style.replace(/([a-z])(\d)/i, "$1 $2")) });
  }
  return out;
}

const CHUNK_MAX = 700;

/** Gói các đoạn văn thành đoạn truy xuất: theo tiêu đề nếu có, không thì theo độ dài. */
export function chunkParagraphs(paras: DocParagraph[]): DocChunk[] {
  const chunks: DocChunk[] = [];
  const hasHeading = paras.some((p) => p.heading);
  let heading = "";
  let buf: string[] = [];
  let seq = 0;
  const flush = () => {
    const text = buf.join(" ").trim();
    buf = [];
    if (!text) return;
    seq++;
    const locator = hasHeading && heading ? heading : `Đoạn ${seq}`;
    for (let i = 0; i < text.length; i += CHUNK_MAX) chunks.push({ locator, text: text.slice(i, i + CHUNK_MAX) });
  };
  for (const p of paras) {
    if (hasHeading && p.heading) {
      flush();
      heading = p.text;
      continue;
    }
    if (!hasHeading && buf.join(" ").length + p.text.length > CHUNK_MAX) flush();
    buf.push(p.text);
  }
  flush();
  return chunks;
}

export async function parseDocx(file: File): Promise<ParsedDoc> {
  if (file.size > MAX_DOCX_BYTES) throw new Error("File quá lớn (tối đa 10 MB).");
  const xml = await zipEntry(await file.arrayBuffer(), "word/document.xml");
  if (!xml) throw new Error("Không tìm thấy nội dung trong file .docx.");
  const paragraphs = paragraphsOf(new TextDecoder().decode(xml));
  if (paragraphs.length === 0) throw new Error("File không có chữ nào để đọc.");
  const wordCount = paragraphs.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
  return { paragraphs, chunks: chunkParagraphs(paragraphs), wordCount };
}
