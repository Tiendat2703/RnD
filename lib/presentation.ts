import type { DocumentChunk, SessionDocument } from './documents';

export type PresentationCoverage = 'pending' | 'partial' | 'covered' | 'skipped';
export type PresentationCorrectness = 'unchecked' | 'supported' | 'contradicted' | 'uncertain';
export interface PresentationItem {
  id: string;
  text: string;
  required: boolean;
  citation: DocumentChunk | null;
  coverage: PresentationCoverage;
  correctness: PresentationCorrectness;
  manual: boolean;
  evidence?: { lineId: string; text: string; atMs: number; source: 'mic' };
  note?: string;
}
export interface PresentationDeviation {
  id: string;
  note: string;
  citation: DocumentChunk;
  evidence: { lineId: string; text: string; atMs: number; source: 'mic' };
  resolvedBy?: { lineId: string; text: string; atMs: number; source: 'mic' };
}
export interface PresentationSnapshot {
  deviations?: PresentationDeviation[];
  version: 1;
  revision: string;
  sequence: number;
  confirmed: boolean;
  paused: boolean;
  autoRemind: boolean;
  items: PresentationItem[];
  documents: SessionDocument[];
  hint: string;
  error: string | null;
}
export type PresentationAction =
  | { kind: 'item'; itemId: string; coverage: PresentationCoverage | 'auto' }
  | { kind: 'pause'; paused: boolean }
  | { kind: 'remind'; enabled: boolean }
  | { kind: 'missing' };
export const COVERAGE_LABEL: Record<PresentationCoverage, string> = {
  pending: 'Chưa nói',
  partial: 'Nói một phần',
  covered: 'Đã nói',
  skipped: 'Bỏ qua',
};
export const CORRECTNESS_LABEL: Record<PresentationCorrectness, string> = {
  unchecked: 'Chưa đối chiếu',
  supported: 'Khớp tài liệu',
  contradicted: 'Lệch tài liệu',
  uncertain: 'Chưa chắc',
};
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Dữ liệu thuyết trình không hợp lệ.');
  return v as Record<string, unknown>;
};
const str = (v: unknown, max: number) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw Error('Nội dung thuyết trình không hợp lệ.');
  return v;
};
export function parsePresentation(value: unknown): PresentationSnapshot {
  const p = record(value);
  if (
    p.version !== 1 ||
    !Number.isSafeInteger(p.sequence) ||
    (p.sequence as number) < 0 ||
    typeof p.confirmed !== 'boolean' ||
    typeof p.paused !== 'boolean' ||
    typeof p.autoRemind !== 'boolean' ||
    !Array.isArray(p.items) ||
    !p.items.length ||
    p.items.length > 40 ||
    !Array.isArray(p.documents) ||
    !p.documents.length ||
    p.documents.length > 20
  )
    throw Error('Checklist không hợp lệ.');
  let chars = 0;
  const chunkIds = new Set<string>();
  const docs = p.documents.map((raw) => {
    const d = record(raw);
    const id = str(d.id, 80);
    if (!/^d[a-z0-9]{3,16}$/.test(id)) throw Error('ID tài liệu không hợp lệ.');
    const name = str(d.name, 160);
    if (
      !Array.isArray(d.chunks) ||
      !d.chunks.length ||
      !Number.isInteger(d.pageCount) ||
      (d.pageCount as number) < 1
    )
      throw Error('Tài liệu không hợp lệ.');
    const chunks = d.chunks.map((rawChunk) => {
      const c = record(rawChunk);
      const chunkId = str(c.id, 100);
      const text = str(c.text, 20000);
      if (
        chunkIds.has(chunkId) ||
        !chunkId.startsWith(id + '#') ||
        !Number.isInteger(c.page) ||
        !Number.isInteger(c.pageEnd) ||
        (c.page as number) < 1 ||
        (c.pageEnd as number) < (c.page as number) ||
        (c.pageEnd as number) > (d.pageCount as number)
      )
        throw Error('Đoạn tài liệu không hợp lệ.');
      chunkIds.add(chunkId);
      chars += text.length;
      return {
        id: chunkId,
        docId: id,
        docName: name,
        page: c.page as number,
        pageEnd: c.pageEnd as number,
        text,
      };
    });
    return { id, name, pageCount: d.pageCount as number, chunks };
  });
  if (chars > 2_000_000) throw Error('Tài liệu quá lớn.');
  const ids = new Set<string>();
  const items: PresentationItem[] = p.items.map((raw) => {
    const i = record(raw);
    const id = str(i.id, 80);
    if (
      ids.has(id) ||
      typeof i.required !== 'boolean' ||
      typeof i.manual !== 'boolean' ||
      !Object.hasOwn(COVERAGE_LABEL, String(i.coverage)) ||
      !Object.hasOwn(CORRECTNESS_LABEL, String(i.correctness))
    )
      throw Error('Ý checklist không hợp lệ.');
    ids.add(id);
    let citation: DocumentChunk | null = null;
    if (i.citation !== null) {
      const c = record(i.citation);
      const original = docs.flatMap((d) => d.chunks).find((o) => o.id === c.id);
      const quote = str(c.text, 20000);
      if (!original || !original.text.includes(quote))
        throw Error('Trích dẫn không có trong tài liệu.');
      citation = { ...original, text: quote };
    }
    let evidence: PresentationItem['evidence'];
    if (i.evidence !== undefined) {
      const e = record(i.evidence);
      if (
        e.source !== 'mic' ||
        typeof e.atMs !== 'number' ||
        !Number.isFinite(e.atMs) ||
        e.atMs < 0
      )
        throw Error('Căn cứ lời nói không hợp lệ.');
      evidence = {
        lineId: str(e.lineId, 100),
        text: str(e.text, 4000),
        atMs: e.atMs,
        source: 'mic',
      };
    }
    if (i.correctness === 'contradicted' && (!citation || !evidence))
      throw Error('Cảnh báo thiếu căn cứ.');
    return {
      id,
      text: str(i.text, 1000),
      required: i.required,
      manual: i.manual,
      citation,
      coverage: i.coverage as PresentationCoverage,
      correctness: i.correctness as PresentationCorrectness,
      ...(evidence ? { evidence } : {}),
      ...(typeof i.note === 'string' ? { note: i.note.slice(0, 1200) } : {}),
    };
  });
  const deviations: PresentationDeviation[] = [];
  if (p.deviations !== undefined) {
    if (!Array.isArray(p.deviations) || p.deviations.length > 100)
      throw Error('Danh sách sai lệch không hợp lệ.');
    for (const raw of p.deviations) {
      const d = record(raw);
      const c = record(d.citation);
      const original = docs.flatMap((d) => d.chunks).find((o) => o.id === c.id);
      const quote = str(c.text, 1000);
      if (!original || !original.text.includes(quote)) throw Error('Nguồn cảnh báo không hợp lệ.');
      const evidenceOf = (value: unknown) => {
        const e = record(value);
        if (
          e.source !== 'mic' ||
          typeof e.atMs !== 'number' ||
          !Number.isFinite(e.atMs) ||
          e.atMs < 0
        )
          throw Error('Lời nói không hợp lệ.');
        return {
          lineId: str(e.lineId, 100),
          text: str(e.text, 4000),
          atMs: e.atMs,
          source: 'mic' as const,
        };
      };
      deviations.push({
        id: str(d.id, 100),
        note: str(d.note, 1200),
        citation: { ...original, text: quote },
        evidence: evidenceOf(d.evidence),
        ...(d.resolvedBy ? { resolvedBy: evidenceOf(d.resolvedBy) } : {}),
      });
    }
  }
  return {
    ...(deviations.length ? { deviations } : {}),
    version: 1,
    revision: str(p.revision, 80),
    sequence: p.sequence as number,
    confirmed: p.confirmed,
    paused: p.paused,
    autoRemind: p.autoRemind,
    items,
    documents: docs,
    hint: typeof p.hint === 'string' ? p.hint.slice(0, 3000) : '',
    error: typeof p.error === 'string' ? p.error.slice(0, 1000) : null,
  };
}
export function parsePresentationAction(value: unknown): PresentationAction {
  const a = record(value);
  if (a.kind === 'missing') return { kind: 'missing' };
  if (a.kind === 'pause' && typeof a.paused === 'boolean')
    return { kind: 'pause', paused: a.paused };
  if (a.kind === 'remind' && typeof a.enabled === 'boolean')
    return { kind: 'remind', enabled: a.enabled };
  if (
    a.kind === 'item' &&
    (a.coverage === 'auto' || Object.hasOwn(COVERAGE_LABEL, String(a.coverage)))
  )
    return {
      kind: 'item',
      itemId: str(a.itemId, 80),
      coverage: a.coverage as PresentationCoverage | 'auto',
    };
  throw Error('Thao tác thuyết trình không hợp lệ.');
}
export function presentationStats(p: PresentationSnapshot) {
  const required = p.items.filter((i) => i.required);
  return {
    total: required.length,
    covered: required.filter((i) => i.coverage === 'covered').length,
    partial: required.filter((i) => i.coverage === 'partial').length,
    skipped: required.filter((i) => i.coverage === 'skipped').length,
    missing: required.filter((i) => i.coverage === 'pending' || i.coverage === 'partial'),
    contradictions: p.items.filter((i) => i.correctness === 'contradicted'),
  };
}
export function missingHint(p: PresentationSnapshot) {
  const missing = presentationStats(p).missing.slice(0, 3);
  return missing.length
    ? `Bạn có thể bổ sung: ${missing.map((i) => i.text).join(' · ')}`
    : 'Bạn đã đề cập đủ các ý bắt buộc chưa bỏ qua.';
}
export function presentationMarkdown(title: string, p: PresentationSnapshot) {
  const s = presentationStats(p);
  return [
    `# Thuyết trình: ${title}`,
    '',
    `Đã nói ${s.covered}/${s.total} ý bắt buộc. Một phần: ${s.partial}. Bỏ qua: ${s.skipped}.`,
    'Đây là mức độ bao phủ nội dung, không phải điểm chính xác.',
    '',
    ...p.items.flatMap((i) => [
      `## ${i.text}`,
      `${COVERAGE_LABEL[i.coverage]} · ${CORRECTNESS_LABEL[i.correctness]}${i.manual ? ' · sửa tay' : ''}${!i.required ? ' · tùy chọn' : ''}`,
      i.evidence ? `Lời nói [${Math.floor(i.evidence.atMs / 1000)}s]: ${i.evidence.text}` : '',
      i.citation
        ? `Nguồn: ${i.citation.docName}, tr. ${i.citation.page}–${i.citation.pageEnd}\n> ${i.citation.text}`
        : 'Ý tự thêm, chưa có nguồn.',
      i.note ?? '',
      '',
    ]),
    ...(p.deviations?.length
      ? [
          '',
          '## Sai lệch so với tài liệu',
          ...p.deviations.flatMap((d) => [
            d.note + (d.resolvedBy ? ' — đã tự sửa' : ' — cần xem lại'),
            'Lời nói: ' + d.evidence.text,
            'Nguồn: ' + d.citation.docName + ', tr. ' + d.citation.page + ' — ' + d.citation.text,
            ...(d.resolvedBy ? ['Lời tự sửa: ' + d.resolvedBy.text] : []),
            '',
          ]),
        ]
      : []),
  ].join('\n');
}
