import { inflateRawSync } from 'node:zlib';
import { TEACHER_LIMITS, type TeacherSection } from '../../../lib/teacher';
import { HttpError } from './service';

const MAX_XML = 12 * 1024 * 1024;

/** Reads selected OOXML parts, enforcing compressed and expanded size limits. */
function unzipParts(data: Buffer): Map<string, string> {
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('Không phải tệp Office hợp lệ.');
  const parts = new Map<string, string>();
  let offset = data.readUInt32LE(end + 16);
  let total = 0;
  const count = data.readUInt16LE(end + 10);
  if (count > 10_000) throw new Error('Tệp có quá nhiều thành phần.');
  for (let n = 0; n < count; n++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) throw new Error('Tệp Office bị hỏng.');
    const method = data.readUInt16LE(offset + 10);
    const compressed = data.readUInt32LE(offset + 20);
    const expanded = data.readUInt32LE(offset + 24);
    const nameLen = data.readUInt16LE(offset + 28);
    const extraLen = data.readUInt16LE(offset + 30);
    const commentLen = data.readUInt16LE(offset + 32);
    const local = data.readUInt32LE(offset + 42);
    const name = data.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');
    if (/^(?:word\/document\.xml|ppt\/presentation\.xml|ppt\/_rels\/presentation\.xml\.rels|ppt\/slides\/slide\d+\.xml)$/.test(name)) {
      if (total + expanded > MAX_XML) throw new Error('Nội dung giải nén quá lớn.');
      if (data.readUInt32LE(local) !== 0x04034b50) throw new Error('Tệp Office bị hỏng.');
      const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
      if (start + compressed > data.length) throw new Error('Tệp Office bị thiếu dữ liệu.');
      const raw = data.subarray(start, start + compressed);
      const xml = method === 0 ? raw : method === 8 ? inflateRawSync(raw, { maxOutputLength: MAX_XML }) : null;
      if (!xml || xml.length > MAX_XML) throw new Error('Kiểu nén chưa hỗ trợ.');
      total += xml.length;
      if (total > MAX_XML) throw new Error('Nội dung giải nén quá lớn.');
      parts.set(name, xml.toString('utf8'));
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return parts;
}

function decodeXml(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_m, code: string) => {
    if (code.startsWith('#')) {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[code.toLowerCase()] ?? '';
  });
}

function paragraphs(xml: string, prefix: 'w' | 'a'): string[] {
  const blocks = xml.match(new RegExp(`<${prefix}:p(?:\\s[^>]*)?>[\\s\\S]*?<\\/${prefix}:p>`, 'g')) ?? [];
  return blocks.map(block => [...block.matchAll(new RegExp(`<${prefix}:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${prefix}:t>`, 'g'))]
    .map(match => decodeXml(match[1])).join('')).map(text => text.trim()).filter(Boolean);
}

function attribute(tag: string, name: string): string {
  return tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']+)["']`))?.[1] ?? '';
}

export async function parseTeacherFile(name: string, data: Buffer): Promise<{ format: string; sections: TeacherSection[] }> {
  if (!data.length || data.length > TEACHER_LIMITS.fileBytes) throw new HttpError(400, 'Mỗi tệp cần có nội dung và không quá 10 MB.');
  const format = name.split('.').pop()?.toLowerCase() ?? '';
  let sections: TeacherSection[] = [];
  try {
    if (format === 'txt' || format === 'md') {
      const text = data.toString('utf8').replace(/\u0000/g, '').trim();
      sections = text.split(/\n\s*\n/).filter(Boolean).map((text, i) => ({ locator: `Đoạn ${i + 1}`, text }));
    } else if (format === 'docx') {
      const xml = unzipParts(data).get('word/document.xml');
      if (!xml) throw new Error('Không tìm thấy nội dung Word.');
      sections = paragraphs(xml, 'w').map((text, i) => ({ locator: `Đoạn ${i + 1}`, text }));
    } else if (format === 'pptx') {
      const parts = unzipParts(data);
      const relationships = new Map<string, string>();
      for (const match of (parts.get('ppt/_rels/presentation.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*\/?\s*>/g)) {
        const target = attribute(match[0], 'Target');
        if (/^(?:\/ppt\/)?slides\/slide\d+\.xml$/.test(target)) {
          relationships.set(attribute(match[0], 'Id'), target.startsWith('/') ? target.slice(1) : `ppt/${target}`);
        }
      }
      const ordered = [...(parts.get('ppt/presentation.xml') ?? '').matchAll(/<p:sldId\b[^>]*\/?\s*>/g)]
        .map(match => relationships.get(attribute(match[0], 'r:id')));
      if (!ordered.length || ordered.some(path => !path || !parts.has(path))) throw new Error('Không đọc được thứ tự slide. Hãy xuất lại thành PPTX hoặc PDF.');
      sections = ordered.map((path, i) => ({ locator: `Slide ${i + 1}`, text: paragraphs(parts.get(path!)!, 'a').join('\n') }));
    } else if (format === 'pdf') {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const task = getDocument({ data: new Uint8Array(data), useSystemFonts: true });
      try {
        const doc = await task.promise;
        if (doc.numPages > 200) throw new Error('Tối đa 200 trang mỗi PDF.');
        let chars = 0;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
          chars += text.length;
          if (chars > TEACHER_LIMITS.documentChars) throw new Error('Tài liệu quá dài. Hãy chia PDF thành các chương nhỏ hơn.');
          sections.push({ locator: `Trang ${i}`, text });
        }
      } finally { await task.destroy(); }
    } else {
      throw new Error('Hỗ trợ PDF, DOCX, PPTX, TXT và MD. Với DOC/PPT cũ, hãy lưu lại thành DOCX/PPTX.');
    }
    sections = sections.filter(section => section.text.trim());
    if (!sections.length) throw new Error('Tệp không có chữ để đọc. Với tài liệu scan hoặc slide chỉ có hình, hãy thêm lớp chữ hoặc tải bản có văn bản.');
    if (sections.reduce((sum, section) => sum + section.text.length, 0) > TEACHER_LIMITS.documentChars) {
      throw new Error('Tài liệu quá dài (tối đa 80.000 ký tự). Hãy chia thành các chương.');
    }
    return { format: format.toUpperCase(), sections };
  } catch (error) {
    throw new HttpError(400, error instanceof RangeError ? 'Tệp bị hỏng hoặc không đúng định dạng.' : error instanceof Error ? error.message : 'Không đọc được tệp.');
  }
}
