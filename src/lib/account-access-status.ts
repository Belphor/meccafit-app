/** Normaliza status_altar do perfil (case/acentos). */
export function normalizeAccountAccessStatus(
  statusAltar: string | null | undefined,
): string {
  return String(statusAltar ?? "ativo")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function isAccountSuspended(statusAltar: string | null | undefined): boolean {
  return normalizeAccountAccessStatus(statusAltar) === "suspenso";
}

/** Penalidade suprema — exílio das chamas no altar. */
export function resolveProfileIsPunished(
  statusAltar: string | null | undefined,
  customPreferences?: unknown,
): boolean {
  if (
    customPreferences &&
    typeof customPreferences === "object" &&
    !Array.isArray(customPreferences)
  ) {
    const prefs = customPreferences as Record<string, unknown>;
    if (prefs.is_punished === true) return true;
  }

  const normalized = normalizeAccountAccessStatus(statusAltar);
  return normalized === "penalizado" || normalized === "punished" || normalized === "exilado";
}

export type AccountAccessTone = "active" | "suspended" | "neutral";

export type AccountAccessDisplay = {
  label: string;
  tone: AccountAccessTone;
};

/** Rótulo de acesso para monitoramento e painéis do forjador. */
export function resolveAccountAccessDisplay(
  statusAltar: string | null | undefined,
): AccountAccessDisplay {
  const normalized = normalizeAccountAccessStatus(statusAltar);

  if (normalized === "suspenso") {
    return { label: "Suspenso", tone: "suspended" };
  }

  if (normalized === "ativo" || normalized === "purificado") {
    return { label: "Acesso liberado", tone: "active" };
  }

  const raw = String(statusAltar ?? "").trim();
  return {
    label: raw.length > 0 ? raw : "Indefinido",
    tone: "neutral",
  };
}

/** Mensagem de bloqueio no login; null quando o acesso é permitido. */
export function resolveLoginBlockMessage(
  statusAltar: string | null | undefined,
): string | null {
  if (isAccountSuspended(statusAltar)) {
    return "Sua conta está suspensa. Entre em contato com a academia ou com seu Forjador para reativar o acesso.";
  }

  return null;
}
