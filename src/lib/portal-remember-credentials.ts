/** Persistência local de e-mail/senha nos portais (conveniência no dispositivo). */

export type PortalRememberScope = "cliente" | "forja";

export type RememberedCredentials = {
  email: string;
  password: string;
};

const STORAGE_PREFIX = "meccafit.portal.remember.";

function storageKey(scope: PortalRememberScope): string {
  return `${STORAGE_PREFIX}${scope}`;
}

export function loadRememberedCredentials(
  scope: PortalRememberScope,
): RememberedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedCredentials>;
    const email = typeof parsed.email === "string" ? parsed.email.trim() : "";
    const password = typeof parsed.password === "string" ? parsed.password : "";
    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}

export function saveRememberedCredentials(
  scope: PortalRememberScope,
  credentials: RememberedCredentials,
): void {
  if (typeof window === "undefined") return;
  const email = credentials.email.trim();
  const password = credentials.password;
  if (!email || !password) {
    clearRememberedCredentials(scope);
    return;
  }
  window.localStorage.setItem(storageKey(scope), JSON.stringify({ email, password }));
}

export function clearRememberedCredentials(scope: PortalRememberScope): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(scope));
}
