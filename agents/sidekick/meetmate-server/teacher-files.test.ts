import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { parseTeacherFile } from './teacher-files';

/** Small OOXML fixture with a real ZIP central directory. */
function officeZip(parts: Record<string, string>): Buffer {
  const locals: Buffer[] = []; const entries: Buffer[] = []; let offset = 0;
  for (const [name, text] of Object.entries(parts)) {
    const filename = Buffer.from(name); const source = Buffer.from(text); const data = deflateRawSync(source);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(source.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, data);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(source.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    entries.push(central, filename); offset += local.length + filename.length + data.length;
  }
  const directory = Buffer.concat(entries); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(parts).length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

describe('Teacher file extraction', () => {
  it('reads Word text runs, tables and XML entities with paragraph locations', async () => {
    const file = officeZip({ 'word/document.xml': '<w:document><w:p><w:r><w:t>Hàm số &amp; </w:t></w:r><w:r><w:t>đạo hàm</w:t></w:r></w:p><w:tbl><w:p><w:r><w:t>x = &#50;</w:t></w:r></w:p></w:tbl></w:document>' });
    expect(await parseTeacherFile('Bài học.docx', file)).toEqual({ format: 'DOCX', sections: [
      { locator: 'Đoạn 1', text: 'Hàm số & đạo hàm' }, { locator: 'Đoạn 2', text: 'x = 2' },
    ] });
  });

  it('uses presentation relationships for slide order, not filenames', async () => {
    const file = officeZip({
      'ppt/presentation.xml': '<p:presentation><p:sldIdLst><p:sldId id="1" r:id="rB"/><p:sldId id="2" r:id="rA"/></p:sldIdLst></p:presentation>',
      'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="rA" Target="slides/slide1.xml"/><Relationship Id="rB" Target="slides/slide2.xml"/></Relationships>',
      'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>Ví dụ tiếp theo</a:t></a:r></a:p></p:sld>',
      'ppt/slides/slide2.xml': '<p:sld><a:p><a:r><a:t>Kiến thức nền</a:t></a:r></a:p></p:sld>',
    });
    expect((await parseTeacherFile('slide.pptx', file)).sections).toEqual([
      { locator: 'Slide 1', text: 'Kiến thức nền' }, { locator: 'Slide 2', text: 'Ví dụ tiếp theo' },
    ]);
  });

  it('reads a real text PDF with page locations', async () => {
    const file = await readFile(new URL('../extension/fixtures/hop-dong.pdf', import.meta.url));
    const parsed = await parseTeacherFile('contract.pdf', file);
    expect(parsed.sections[0].locator).toBe('Trang 1');
    expect(parsed.sections.map(section => section.text).join(' ')).toContain('12.000.000');
  });

  it.each([
    ['old.doc', Buffer.from('old Word')], ['empty.txt', Buffer.from(' ')], ['bad.docx', Buffer.from('invalid')],
    ['scan.pptx', officeZip({ 'ppt/presentation.xml': '<p:presentation/>' })],
    ['large.txt', Buffer.from('a'.repeat(80_001))],
  ])('rejects unsupported, unreadable or oversized content: %s', async (name, bytes) => {
    await expect(parseTeacherFile(name, bytes)).rejects.toMatchObject({ status: 400 });
  });
});
