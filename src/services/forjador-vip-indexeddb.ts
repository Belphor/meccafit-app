import {
  normalizeWeeklyDietDraft,
  type BodyMetricsDraft,
  type WeeklyDietDraft,
} from "@/lib/forjador-vip-types";
import type { ScientificMetricsEntry } from "@/lib/scientific-metrics-types";

const DB_NAME = "meccafit_forjador_vip_db";
const DB_VERSION = 2;
const STORE_DIET_DRAFTS = "diet_weekly_drafts";
const STORE_DIET_HISTORY = "diet_weekly_history";
const STORE_METRICS_DRAFTS = "body_metrics_drafts";
const STORE_METRICS_HISTORY = "body_metrics_history";
const STORE_SCIENTIFIC_HISTORY = "scientific_metrics_history";

export type DietHistoryEntry = WeeklyDietDraft & {
  id: string;
  savedAt: string;
};

export type BodyMetricsHistoryEntry = BodyMetricsDraft & {
  id: string;
  savedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function dietDraftKey(clientId: string, semanaRef: string): string {
  return `${clientId}:${semanaRef}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("IndexedDB indisponível"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_DIET_DRAFTS)) {
        db.createObjectStore(STORE_DIET_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_DIET_HISTORY)) {
        const history = db.createObjectStore(STORE_DIET_HISTORY, { keyPath: "id" });
        history.createIndex("clientId", "clientId", { unique: false });
        history.createIndex("savedAt", "savedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_METRICS_DRAFTS)) {
        db.createObjectStore(STORE_METRICS_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_METRICS_HISTORY)) {
        const history = db.createObjectStore(STORE_METRICS_HISTORY, { keyPath: "id" });
        history.createIndex("clientId", "clientId", { unique: false });
        history.createIndex("savedAt", "savedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SCIENTIFIC_HISTORY)) {
        const scientific = db.createObjectStore(STORE_SCIENTIFIC_HISTORY, { keyPath: "id" });
        scientific.createIndex("clientId", "clientId", { unique: false });
        scientific.createIndex("measuredAt", "measuredAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error(`Falha ao abrir ${DB_NAME}`));
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

export async function loadWeeklyDietDraft(
  clientId: string,
  semanaRef: string,
): Promise<WeeklyDietDraft | null> {
  if (!isBrowser()) return null;
  const key = dietDraftKey(clientId, semanaRef);
  const row = await withStore<WeeklyDietDraft | undefined>(
    STORE_DIET_DRAFTS,
    "readonly",
    (store) => store.get(key),
  );
  return row ? normalizeWeeklyDietDraft(row) : null;
}

export async function saveWeeklyDietDraft(draft: WeeklyDietDraft): Promise<void> {
  if (!isBrowser()) return;
  const key = dietDraftKey(draft.clientId, draft.semanaRef);
  await withStore<IDBValidKey>(
    STORE_DIET_DRAFTS,
    "readwrite",
    (store) => store.put(draft, key),
  );
}

export async function appendWeeklyDietHistory(
  draft: WeeklyDietDraft,
): Promise<DietHistoryEntry> {
  const entry: DietHistoryEntry = {
    ...draft,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    await withStore<IDBValidKey>(
      STORE_DIET_HISTORY,
      "readwrite",
      (store) => store.put(entry),
    );
  }

  return entry;
}

export async function listWeeklyDietHistory(
  clientId: string,
  limit = 24,
): Promise<DietHistoryEntry[]> {
  if (!isBrowser()) return [];

  const db = await openDatabase();
  try {
    return await new Promise<DietHistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_DIET_HISTORY, "readonly");
      const store = tx.objectStore(STORE_DIET_HISTORY);
      const index = store.index("clientId");
      const request = index.openCursor(IDBKeyRange.only(clientId), "prev");
      const rows: DietHistoryEntry[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || rows.length >= limit) {
          resolve(rows);
          return;
        }
        rows.push(cursor.value as DietHistoryEntry);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Falha ao listar histórico de dieta"));
    });
  } finally {
    db.close();
  }
}

export async function loadBodyMetricsDraft(clientId: string): Promise<BodyMetricsDraft | null> {
  if (!isBrowser()) return null;
  const row = await withStore<BodyMetricsDraft | undefined>(
    STORE_METRICS_DRAFTS,
    "readonly",
    (store) => store.get(clientId),
  );
  return row ?? null;
}

export async function saveBodyMetricsDraft(draft: BodyMetricsDraft): Promise<void> {
  if (!isBrowser()) return;
  await withStore<IDBValidKey>(
    STORE_METRICS_DRAFTS,
    "readwrite",
    (store) => store.put(draft, draft.clientId),
  );
}

export async function appendBodyMetricsHistory(
  draft: BodyMetricsDraft,
): Promise<BodyMetricsHistoryEntry> {
  const entry: BodyMetricsHistoryEntry = {
    ...draft,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    await withStore<IDBValidKey>(
      STORE_METRICS_HISTORY,
      "readwrite",
      (store) => store.put(entry),
    );
  }

  return entry;
}

export async function listBodyMetricsHistory(
  clientId: string,
  limit = 24,
): Promise<BodyMetricsHistoryEntry[]> {
  if (!isBrowser()) return [];

  const db = await openDatabase();
  try {
    return await new Promise<BodyMetricsHistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_METRICS_HISTORY, "readonly");
      const store = tx.objectStore(STORE_METRICS_HISTORY);
      const index = store.index("clientId");
      const request = index.openCursor(IDBKeyRange.only(clientId), "prev");
      const rows: BodyMetricsHistoryEntry[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || rows.length >= limit) {
          resolve(rows);
          return;
        }
        rows.push(cursor.value as BodyMetricsHistoryEntry);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Falha ao listar histórico de medidas"));
    });
  } finally {
    db.close();
  }
}

export function isForjadorVipIndexedDbAvailable(): boolean {
  return isBrowser();
}

export async function appendScientificMetricsEntry(
  entry: ScientificMetricsEntry,
): Promise<ScientificMetricsEntry> {
  if (isBrowser()) {
    await withStore<IDBValidKey>(
      STORE_SCIENTIFIC_HISTORY,
      "readwrite",
      (store) => store.put(entry),
    );
  }
  return entry;
}

export async function listScientificMetricsHistory(
  clientId: string,
  limit = 120,
): Promise<ScientificMetricsEntry[]> {
  if (!isBrowser()) return [];

  const db = await openDatabase();
  try {
    return await new Promise<ScientificMetricsEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_SCIENTIFIC_HISTORY, "readonly");
      const store = tx.objectStore(STORE_SCIENTIFIC_HISTORY);
      const index = store.index("clientId");
      const request = index.openCursor(IDBKeyRange.only(clientId), "prev");
      const rows: ScientificMetricsEntry[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || rows.length >= limit) {
          rows.sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
          resolve(rows);
          return;
        }
        rows.push(cursor.value as ScientificMetricsEntry);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Falha ao listar histórico científico"));
    });
  } finally {
    db.close();
  }
}

export async function deleteScientificMetricsEntry(entryId: string): Promise<void> {
  if (!isBrowser()) return;
  await withStore<undefined>(STORE_SCIENTIFIC_HISTORY, "readwrite", (store) => store.delete(entryId));
}

export async function clearScientificMetricsHistory(clientId: string): Promise<void> {
  if (!isBrowser()) return;

  const entries = await listScientificMetricsHistory(clientId, 500);
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SCIENTIFIC_HISTORY, "readwrite");
      const store = tx.objectStore(STORE_SCIENTIFIC_HISTORY);
      for (const entry of entries) {
        store.delete(entry.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Falha ao limpar histórico científico"));
    });
  } finally {
    db.close();
  }
}

export function resolveLatestScientificEntry(
  entries: ScientificMetricsEntry[],
): ScientificMetricsEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] ?? null;
}
