export const BACKUP_VERSION = 1;
import {
  getDocumentFile,
  loadDocumentMetadata,
  putDocumentFile,
} from "../documents/document-storage";
export type EstateFlowBackup = {
  version: number;
  createdAt: string;
  localStorage: Record<string, string>;
  documents?: { id: string; type: string; dataBase64: string }[];
};
export function createBackup(
  storage: Storage = window.localStorage,
): EstateFlowBackup {
  const data: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("estateflow-")) data[key] = storage.getItem(key) ?? "";
  }
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    localStorage: data,
  };
}
export async function createCompleteBackup(
  storage: Storage = window.localStorage,
): Promise<EstateFlowBackup> {
  const backup = createBackup(storage);
  const documents = [];
  for (const metadata of loadDocumentMetadata()) {
    const blob = await getDocumentFile(metadata.id);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    documents.push({
      id: metadata.id,
      type: blob.type || metadata.mimeType,
      dataBase64: btoa(binary),
    });
  }
  return { ...backup, documents };
}
export function validateBackup(v: unknown): v is EstateFlowBackup {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as EstateFlowBackup).version === BACKUP_VERSION &&
    typeof (v as EstateFlowBackup).localStorage === "object" &&
    (v as EstateFlowBackup).localStorage !== null &&
    Object.keys((v as EstateFlowBackup).localStorage).every(
      (k) =>
        k.startsWith("estateflow-") &&
        typeof (v as EstateFlowBackup).localStorage[k] === "string",
    ) &&
    ((v as EstateFlowBackup).documents === undefined ||
      (Array.isArray((v as EstateFlowBackup).documents) &&
        ((v as EstateFlowBackup).documents ?? []).every(
          (document) =>
            typeof document.id === "string" &&
            typeof document.type === "string" &&
            typeof document.dataBase64 === "string",
        )))
  );
}
export function applyBackup(
  backup: EstateFlowBackup,
  mode: "merge" | "replace",
  storage: Storage = window.localStorage,
) {
  if (!validateBackup(backup)) return false;
  if (mode === "replace") {
    const keys = Array.from({ length: storage.length }, (_, i) =>
      storage.key(i),
    ).filter((k): k is string => Boolean(k?.startsWith("estateflow-")));
    keys.forEach((k) => storage.removeItem(k));
  }
  Object.entries(backup.localStorage).forEach(([k, v]) =>
    storage.setItem(k, v),
  );
  return true;
}
export async function applyCompleteBackup(
  backup: EstateFlowBackup,
  mode: "merge" | "replace",
  storage: Storage = window.localStorage,
) {
  if (!applyBackup(backup, mode, storage)) return false;
  for (const document of backup.documents ?? []) {
    const binary = atob(document.dataBase64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    await putDocumentFile(
      document.id,
      new Blob([bytes], { type: document.type }),
    );
  }
  return true;
}
