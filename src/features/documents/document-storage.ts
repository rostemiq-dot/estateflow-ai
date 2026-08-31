import type { DocumentMetadata } from "./document-data";
const META = "estateflow-documents";
const DB = "estateflow-document-files";
const STORE = "files";
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export function validateDocument(file: Pick<File, "type" | "size">) {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type))
    return "Unsupported file type. Use PDF, JPG, PNG, WEBP, DOCX, or XLSX.";
  if (file.size > MAX_DOCUMENT_SIZE)
    return "File is too large. Maximum size is 10 MB.";
  if (file.size <= 0) return "File is empty.";
  return "";
}
export function loadDocumentMetadata(): DocumentMetadata[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(META) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter(
          (x): x is DocumentMetadata =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as DocumentMetadata).id === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function saveDocumentMetadata(items: readonly DocumentMetadata[]) {
  try {
    window.localStorage.setItem(META, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE))
        r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function putDocumentFile(id: string, file: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = db
      .transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put(file, id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}
export async function getDocumentFile(id: string) {
  const db = await openDb();
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(id);
    r.onsuccess = () => resolve(r.result as Blob | undefined);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return result;
}
export async function deleteDocumentFile(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}
