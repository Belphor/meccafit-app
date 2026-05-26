/** Chaves de cache térmico / altar — limpeza explícita no logout (PLUTUS). */
import { DASHBOARD_CACHE_PREFIX } from "@/lib/dashboard-cache";
import { PHASE_TIER_STORAGE_PREFIX } from "@/lib/dashboard-config";

const LEGACY_ALTAR_KEY = "ALTAR_VTC_SESSION_TARGET_KG";
const FENYXIA_PREFIX = "fenyxia_";
const MECCAFIT_PREFIX = "meccafit:";

function clearSessionStorageByPrefix(prefix: string): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // quota ou modo privado
  }
}

export function clearThermicSessionCache(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LEGACY_ALTAR_KEY);

    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.startsWith(FENYXIA_PREFIX) || key.startsWith(MECCAFIT_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key);
    });

    clearSessionStorageByPrefix(DASHBOARD_CACHE_PREFIX);
    clearSessionStorageByPrefix(PHASE_TIER_STORAGE_PREFIX);
  } catch {
    // Falha silenciosa — quota ou modo privado.
  }
}