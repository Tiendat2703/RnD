import type { Chunk } from './chunk';

/** Documents live in the extension's IndexedDB, shared by the side panel and the offscreen page. */
export type StoredDoc = {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  chars: number;
  chunks: Chunk[];
  addedAt: number;
};

const DB = 'meetmate';
const STORE = 'docs';
/** Phiên web đã gửi sang (drafts.ts), mỗi phiên kèm tài liệu riêng. Có từ phiên bản 2 của DB. */
export const DRAFTS_STORE = 'drafts';

export function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>, name = STORE): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const request = body(tx.objectStore(name));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const listDocs = async () => (await run<StoredDoc[]>('readonly', s => s.getAll())).sort((a, b) => a.addedAt - b.addedAt);
export const saveDoc = (doc: StoredDoc) => run('readwrite', s => s.put(doc)).then(() => undefined);
export const deleteDoc = (id: string) => run('readwrite', s => s.delete(id)).then(() => undefined);
/** Thay toàn bộ kho bằng tài liệu của phiên do web gửi (một giao dịch: không bao giờ nửa cũ nửa mới). */
export async function replaceDocs(docs: StoredDoc[]): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      for (const doc of docs) store.put(doc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
