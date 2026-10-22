// Borrador de publicación en IndexedDB (E2): si se cierra la pestaña o falla la conexión a mitad,
// el anuncio y sus fotos (ya procesadas) siguen en el dispositivo. Solo para anuncios nuevos.

import type { PublishDraft } from "./draft";

const DB = "reboard";
const STORE = "borradores";
const KEY = "publicar";

export interface StoredPhoto {
  blob: Blob;
  width: number;
  height: number;
}

export interface StoredDraft {
  draft: Omit<PublishDraft, "photos">;
  photos: StoredPhoto[];
  step: number;
  savedAt: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(req.result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Navegación privada o almacenamiento lleno: el borrador sigue en memoria.
    return undefined;
  }
}

export const saveStoredDraft = (d: StoredDraft) => run("readwrite", (s) => s.put(d, KEY));
export const loadStoredDraft = async () => (await run<StoredDraft | undefined>("readonly", (s) => s.get(KEY))) ?? null;
export const clearStoredDraft = () => run("readwrite", (s) => s.delete(KEY));
