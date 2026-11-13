// Phiên do web console tạo và gửi sang (session.prepare), chờ được chọn trong khung bên rồi
// bắt đầu nghe. Mỗi phiên giữ tài liệu riêng; khi được chọn, tài liệu của nó thành kho tài liệu
// mà pipeline dùng. Một phiên chỉ dùng được một lần: ghi xong thì bị xóa khỏi danh sách, vì ghi
// lại cùng id sẽ đè lên phiên đã lưu (sessionStore.startSession).
import type { SessionDraft } from '../../../../lib/bridgeProtocol';
import { DRAFTS_STORE, run, type StoredDoc } from './docs/store';

export type DraftRecord = {
  id: string;
  draft: SessionDraft;
  docs: StoredDoc[];
  /** epoch ms lúc web gửi sang */
  preparedAt: number;
};

/** Thông tin hiển thị một phiên chờ, không kèm nội dung tài liệu. */
export type DraftSummary = { id: string; title: string; kind: SessionDraft['kind']; mode?: SessionDraft['mode']; assistantType?: SessionDraft['assistantType']; docCount: number; docNames: string[]; preparedAt: number };

/** Giữ tối đa chừng này phiên chờ; phiên cũ nhất bị bỏ trước. */
export const MAX_DRAFTS = 10;

export const summaryOf = (r: DraftRecord): DraftSummary => ({
  id: r.id,
  title: r.draft.title,
  kind: r.draft.kind,
  ...(r.draft.mode ? { mode: r.draft.mode } : {}),
  ...(r.draft.assistantType ? { assistantType: r.draft.assistantType } : {}),
  docCount: r.docs.length,
  docNames: r.docs.map(d => d.name),
  preparedAt: r.preparedAt,
});

/** Phiên cần bỏ để danh sách không vượt `max` (cũ nhất trước). Hàm thuần, để test. */
export function overflow(records: Pick<DraftRecord, 'id' | 'preparedAt'>[], max = MAX_DRAFTS): string[] {
  return [...records].sort((a, b) => b.preparedAt - a.preparedAt).slice(max).map(r => r.id);
}

const all = () => run<DraftRecord[]>('readonly', s => s.getAll(), DRAFTS_STORE);

export async function listDrafts(): Promise<DraftRecord[]> {
  return (await all()).sort((a, b) => b.preparedAt - a.preparedAt);
}

export async function getDraftRecord(id: string): Promise<DraftRecord | null> {
  return (await run<DraftRecord | undefined>('readonly', s => s.get(id), DRAFTS_STORE)) ?? null;
}

export async function putDraft(record: DraftRecord): Promise<void> {
  await run('readwrite', s => s.put(record), DRAFTS_STORE);
  for (const id of overflow(await all())) await deleteDraft(id);
}

export async function deleteDraft(id: string): Promise<void> {
  await run('readwrite', s => s.delete(id), DRAFTS_STORE);
}
