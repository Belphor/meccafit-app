/**
 * FENYXIA · Local Storage Service
 * Arquitetura híbrida mobile: binários no disco (Capacitor/Tauri/OPFS) + metadados no IndexedDB.
 * Custo cloud: zero · fallback defensivo em navegadores de teste.
 */

import {
  buildAvatarRelativePath,
  buildSelfieRelativePath,
  deleteAppFile,
  resolveAppFileSrc,
  writeAppFile,
} from "@/services/mobile-filesystem-bridge";

const DB_NAME = "fenyxia_local_db";
const DB_VERSION = 2;
const STORE_AVATAR = "premium_avatar";
const STORE_SELFIES = "selfies_ciclo";
const LEGACY_AVATAR_KEY = "current";

export type EvolutionAvatarUpdatedDetail = {
  userId: string;
};
const MAX_CYCLE_SELFIES = 3;

/** Slots fixos do ciclo mensal · apenas native_path no IndexedDB */
export const CYCLE_SELFIE_DAY_IDS = {
  1: "cycle-selfie-day-1",
  15: "cycle-selfie-day-15",
  30: "cycle-selfie-day-30",
} as const;

export type CycleSelfieDay = keyof typeof CYCLE_SELFIE_DAY_IDS;

export const EVOLUTION_AVATAR_UPDATED_EVENT = "meccafit:evolution-avatar-updated";

type AvatarPathRecord = {
  native_path: string;
  updatedAt: string;
};

type SelfiePathRecord = {
  id: string;
  native_path: string;
  capturedAt: string;
};

/** @deprecated Use SelfiePathRecord + getCycleSelfiePaths */
export type CycleSelfieRecord = {
  id: string;
  blob: Blob;
  capturedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isAvatarPathRecord(value: unknown): value is AvatarPathRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.native_path === "string" && row.native_path.length > 0;
}

function isSelfiePathRecord(value: unknown): value is SelfiePathRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.native_path === "string" &&
    row.native_path.length > 0
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("IndexedDB indisponível"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion > 0 && oldVersion < DB_VERSION) {
        if (db.objectStoreNames.contains(STORE_AVATAR)) {
          db.deleteObjectStore(STORE_AVATAR);
        }
        if (db.objectStoreNames.contains(STORE_SELFIES)) {
          db.deleteObjectStore(STORE_SELFIES);
        }
      }

      if (!db.objectStoreNames.contains(STORE_AVATAR)) {
        db.createObjectStore(STORE_AVATAR);
      }
      if (!db.objectStoreNames.contains(STORE_SELFIES)) {
        db.createObjectStore(STORE_SELFIES, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Falha ao abrir fenyxia_local_db"));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () =>
        reject(request.error ?? new Error(`IndexedDB ${storeName} falhou`));
    });
  } finally {
    db.close();
  }
}

function avatarStorageKey(userId: string): string {
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : LEGACY_AVATAR_KEY;
}

function notifyAvatarUpdated(userId: string): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent<EvolutionAvatarUpdatedDetail>(EVOLUTION_AVATAR_UPDATED_EVENT, {
        detail: { userId },
      }),
    );
  } catch {
    /* fallback silencioso */
  }
}

async function readAvatarRecord(userId: string): Promise<AvatarPathRecord | null> {
  try {
    const key = avatarStorageKey(userId);
    const raw = await withStore<unknown>(STORE_AVATAR, "readonly", (store) => store.get(key));
    if (isAvatarPathRecord(raw)) return raw;

    if (key !== LEGACY_AVATAR_KEY) {
      const legacy = await withStore<unknown>(STORE_AVATAR, "readonly", (store) =>
        store.get(LEGACY_AVATAR_KEY),
      );
      if (isAvatarPathRecord(legacy)) {
        await withStore<IDBValidKey>(STORE_AVATAR, "readwrite", (store) => store.put(legacy, key));
        await withStore<undefined>(STORE_AVATAR, "readwrite", (store) =>
          store.delete(LEGACY_AVATAR_KEY),
        );
        return legacy;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function readSelfieRecords(): Promise<SelfiePathRecord[]> {
  try {
    const db = await openDatabase();
    try {
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(STORE_SELFIES, "readonly");
        const store = tx.objectStore(STORE_SELFIES);
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(Array.isArray(request.result) ? request.result : []);
        };
        request.onerror = () =>
          reject(request.error ?? new Error("Falha ao listar selfies_ciclo"));
      });

      return rows.filter(isSelfiePathRecord);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

async function trimCycleSelfiesToLimit(): Promise<void> {
  const selfies = await readSelfieRecords();
  if (selfies.length <= MAX_CYCLE_SELFIES) return;

  const sorted = [...selfies].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  const overflow = sorted.slice(0, sorted.length - MAX_CYCLE_SELFIES);

  for (const row of overflow) {
    try {
      await deleteAppFile(row.native_path);
      await withStore<undefined>(STORE_SELFIES, "readwrite", (store) =>
        store.delete(row.id),
      );
    } catch {
      /* ignora falha unitária */
    }
  }
}

/**
 * Grava avatar no disco do dispositivo e persiste apenas o native_path no IndexedDB.
 * Cada conta (userId) tem arquivo e chave próprios.
 */
export async function saveLocalAvatar(userId: string, file: File): Promise<void> {
  if (!isBrowser() || !isFile(file) || !userId.trim()) return;

  try {
    const relativePath = buildAvatarRelativePath(userId, file);
    const previous = await readAvatarRecord(userId);

    const written = await writeAppFile(relativePath, file);
    if (!written) return;

    const record: AvatarPathRecord = {
      native_path: written.native_path,
      updatedAt: new Date().toISOString(),
    };

    await withStore<IDBValidKey>(STORE_AVATAR, "readwrite", (store) =>
      store.put(record, avatarStorageKey(userId)),
    );

    if (previous && previous.native_path !== written.native_path) {
      await deleteAppFile(previous.native_path);
    }

    notifyAvatarUpdated(userId);
  } catch {
    /* modo anónimo / quota / policy blocked */
  }
}

/**
 * Retorna URL pronta para `src` do React (Capacitor convertFileSrc, file:// ou blob OPFS).
 * Null → UI usa placeholder SVG.
 */
export async function getLocalAvatarPath(userId: string): Promise<string | null> {
  if (!isBrowser() || !userId.trim()) return null;

  try {
    const record = await readAvatarRecord(userId);
    if (!record) return null;
    return await resolveAppFileSrc(record.native_path);
  } catch {
    return null;
  }
}

/**
 * Grava selfie de ciclo no disco e indexa apenas o native_path (máx. 3/mês).
 */
export async function saveCycleSelfie(id: string, file: File): Promise<void> {
  if (!isBrowser() || !isFile(file) || !id.trim()) return;

  const trimmedId = id.trim();

  try {
    const relativePath = buildSelfieRelativePath(trimmedId, file);
    const written = await writeAppFile(relativePath, file);
    if (!written) return;

    const row: SelfiePathRecord = {
      id: trimmedId,
      native_path: written.native_path,
      capturedAt: new Date().toISOString(),
    };

    await withStore<IDBValidKey>(STORE_SELFIES, "readwrite", (store) =>
      store.put(row),
    );
    await trimCycleSelfiesToLimit();
  } catch {
    /* fallback silencioso */
  }
}

/** Resolve URL local de uma selfie de ciclo pelo id (ex.: cycle-selfie-day-1). */
export async function getCycleSelfiePathById(id: string): Promise<string | null> {
  if (!isBrowser() || !id.trim()) return null;

  try {
    const rows = await readSelfieRecords();
    const target = rows.find((row) => row.id === id.trim());
    if (!target) return null;
    return await resolveAppFileSrc(target.native_path);
  } catch {
    return null;
  }
}

/** Lista URLs resolvíveis das selfies do ciclo (mais recente primeiro). */
export async function getCycleSelfiePaths(): Promise<string[]> {
  if (!isBrowser()) return [];

  try {
    const rows = await readSelfieRecords();
    const sorted = [...rows].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );

    const paths: string[] = [];
    for (const row of sorted) {
      const src = await resolveAppFileSrc(row.native_path);
      if (src) paths.push(src);
    }
    return paths;
  } catch {
    return [];
  }
}

export async function deleteLocalAvatar(userId: string): Promise<void> {
  if (!isBrowser() || !userId.trim()) return;

  try {
    const record = await readAvatarRecord(userId);
    if (record) {
      await deleteAppFile(record.native_path);
    }
    await withStore<undefined>(STORE_AVATAR, "readwrite", (store) =>
      store.delete(avatarStorageKey(userId)),
    );
    notifyAvatarUpdated(userId);
  } catch {
    /* silencioso */
  }
}

export async function deleteCycleSelfie(id: string): Promise<void> {
  if (!isBrowser() || !id.trim()) return;

  const trimmedId = id.trim();

  try {
    const rows = await readSelfieRecords();
    const target = rows.find((row) => row.id === trimmedId);
    if (target) {
      await deleteAppFile(target.native_path);
    }
    await withStore<undefined>(STORE_SELFIES, "readwrite", (store) =>
      store.delete(trimmedId),
    );
  } catch {
    /* silencioso */
  }
}

export function notifyEvolutionAvatarUpdated(userId: string): void {
  notifyAvatarUpdated(userId);
}

export async function dataUrlToFile(dataUrl: string, fileName = "avatar.webp"): Promise<File | null> {
  if (!isBrowser() || !dataUrl.startsWith("data:")) return null;

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const type = blob.type || "image/webp";
    return new File([blob], fileName, { type });
  } catch {
    return null;
  }
}

export async function persistEvolutionAvatarFromDataUrl(
  userId: string,
  dataUrl: string,
): Promise<void> {
  const file = await dataUrlToFile(dataUrl, "avatar.webp");
  if (!file) return;
  await saveLocalAvatar(userId, file);
}

/** @deprecated Use getLocalAvatarPath(userId) */
export async function getLocalAvatar(userId: string): Promise<Blob | null> {
  const src = await getLocalAvatarPath(userId);
  if (!src) return null;

  try {
    const response = await fetch(src);
    return await response.blob();
  } catch {
    return null;
  }
}

/** @deprecated Use getCycleSelfiePaths */
export async function getCycleSelfies(): Promise<CycleSelfieRecord[]> {
  const rows = await readSelfieRecords();
  const result: CycleSelfieRecord[] = [];

  for (const row of rows) {
    try {
      const src = await resolveAppFileSrc(row.native_path);
      if (!src) continue;
      const response = await fetch(src);
      const blob = await response.blob();
      result.push({ id: row.id, blob, capturedAt: row.capturedAt });
    } catch {
      /* ignora entrada corrompida */
    }
  }

  return result.sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );
}

/** @deprecated Preferir getLocalAvatarPath(userId) */
export async function readEvolutionAvatarDataUrl(userId: string): Promise<string | null> {
  return getLocalAvatarPath(userId);
}

/** @deprecated Use saveLocalAvatar(userId, file) */
export async function persistEvolutionAvatar(
  userId: string,
  record: { dataUrl: string },
): Promise<void> {
  await persistEvolutionAvatarFromDataUrl(userId, record.dataUrl);
}

/** @deprecated Use getLocalAvatarPath(userId) */
export async function readEvolutionAvatar(userId: string): Promise<{ dataUrl: string } | null> {
  const dataUrl = await getLocalAvatarPath(userId);
  return dataUrl ? { dataUrl } : null;
}

/** @deprecated Binários não devem trafegar como Blob na API pública */
export async function saveLocalAvatarFromBlob(userId: string, blob: Blob): Promise<void> {
  if (!isBrowser()) return;
  const type = blob.type || "image/webp";
  const file = new File([blob], `avatar.${type.includes("png") ? "png" : "webp"}`, { type });
  await saveLocalAvatar(userId, file);
}

/** @deprecated Use saveLocalAvatar(userId, file) */
export async function saveLocalAvatarLegacy(userId: string, blob: Blob): Promise<void> {
  await saveLocalAvatarFromBlob(userId, blob);
}

/** @deprecated */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (!isBrowser()) return "";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader falhou"));
    reader.readAsDataURL(blob);
  });
}

/** @deprecated Use dataUrlToFile */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  const file = await dataUrlToFile(dataUrl);
  return file;
}
