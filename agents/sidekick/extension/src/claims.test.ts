import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDocument, readPdf } from '../../meetmate-server/documents';
import { checkable, hasFact, isQuestion } from './claims';
import { buildLibrary, type DocLibrary } from './doccheck';

// The real sample documents (contract + plan), read by the same parser the backend uses, so the
// score threshold is checked against what a meeting actually gets.
let lib: DocLibrary;
beforeAll(async () => {
  const chunks = [];
  for (const name of ['hop-dong.pdf', 'ke-hoach.pdf']) {
    const data = new Uint8Array(readFileSync(join(import.meta.dirname, '../fixtures', name)));
    chunks.push(...buildDocument(name, 'PDF', data.byteLength, await readPdf(data, name)).chunks);
  }
  lib = buildLibrary(chunks);
});

describe('checkable: which meeting lines are worth an automatic check', () => {
  it.each([
    'Theo hợp đồng thì phí bảo trì sau thời gian bảo hành là 15 triệu một tháng.',
    'Theo hợp đồng thì phí bảo trì sau thời gian bảo hành là mười lăm triệu một tháng.',
    'Hạn chót bàn giao toàn bộ hệ thống là ngày 30 tháng 4 năm 2027.',
    'Bảo hành thì 12 tháng kể từ ngày ký biên bản nghiệm thu cuối cùng.',
    'Ứng dụng di động mình làm bằng Flutter cho nhanh.',
    'Đợt 2 thanh toán 40% giá trị hợp đồng.',
    'Tranh chấp thì đưa ra tòa án nhân dân Hà Nội giải quyết.',
    'Thanh toán trong app hỗ trợ ZaloPay luôn.',
  ])('checks a claim with a hard fact about the documents: %s', line => {
    expect(checkable(line, lib)).toMatchObject({ pass: true });
  });

  it.each([
    ['Chào mọi người, hôm nay mình rà soát lại hợp đồng với bên Sao Mai nhé.', 'hedge'],
    ['Hay là mình đề xuất với Sao Mai tăng phí bảo trì lên 15 triệu nhỉ?', 'question'],
    ['Hay là mình đề xuất với Sao Mai tăng phí bảo trì lên mười lăm triệu nhỉ.', 'hedge'],
    ['Nếu khách đồng ý thì tháng sau mình làm.', 'hedge'],
    ['Hôm nay trời mưa to quá, mọi người về nhớ cẩn thận nhé.', 'no-fact'],
    ['Phần thanh toán thì để buổi sau mình bàn tiếp.', 'no-fact'],
    ['Hôm qua cả team đi ăn hết 500 nghìn.', 'no-doc-match'],
    ['Tuần sau mình họp lại nhé.', 'no-doc-match'],
    ['Tháng sau team mình đi du lịch Đà Lạt 3 ngày.', 'no-doc-match'],
    ['Năm nay công ty tuyển thêm 10 người.', 'no-doc-match'],
    ['Phí bảo trì bao nhiêu nhỉ?', 'question'],
    ['Ok mọi người nghe rõ không?', 'question'],
  ])('skips greetings, proposals, questions, small talk and facts the documents do not cover: %s', (line, reason) => {
    expect(checkable(line, lib)).toEqual(expect.objectContaining({ pass: false, reason }));
  });

  it('reads facts said as words, units and names', () => {
    expect(hasFact('phí là mười lăm triệu')).toBe(true);
    expect(hasFact('chốt 40%')).toBe(true);
    expect(hasFact('app viết bằng Flutter')).toBe(true);
    expect(hasFact('để buổi sau bàn tiếp')).toBe(false);
    expect(hasFact('Đội phát triển bên mình có sáu người thôi.')).toBe(true);
    expect(hasFact('mọi người về cẩn thận nhé')).toBe(false);
    expect(isQuestion('phí bảo trì là bao nhiêu')).toBe(true);
  });
});

describe('checkable with a one-passage document', () => {
  it('does not depend on how many passages the documents have', () => {
    const tiny = buildLibrary([{ id: 'dt#1', docId: 'dt', docName: 'ghi-chu', page: 1, pageEnd: 1, text: 'Phí bảo trì 12 triệu đồng.' }]);
    expect(checkable('Phí bảo trì là 15 triệu đồng một tháng.', tiny)).toMatchObject({ pass: true });
    // the note says nothing about the deadline: nothing to check against
    expect(checkable('Hạn chót bàn giao là ngày 30 tháng 4.', tiny)).toMatchObject({ pass: false, reason: 'no-doc-match' });
  });
});

