export type DashboardTabId = "treino" | "dieta" | "evolucao" | "comunidade" | "perfil";

export type DashboardTabDefinition = {
  id: DashboardTabId;
  label: string;
  requiresPersonalBond?: boolean;
};

export const DASHBOARD_TAB_DEFINITIONS: readonly DashboardTabDefinition[] = [
  { id: "treino", label: "Treino" },
  { id: "evolucao", label: "Evolução" },
  { id: "comunidade", label: "Comunidade" },
  { id: "perfil", label: "Perfil" },
  { id: "dieta", label: "Dieta", requiresPersonalBond: true },
] as const;

export const DEFAULT_DASHBOARD_TAB: DashboardTabId = "treino";

const LEGACY_TAB_ALIASES: Record<string, DashboardTabId> = {
  forum: "comunidade",
};

export function normalizeDashboardTabParam(
  tabParam: string | null | undefined,
): DashboardTabId | null {
  if (!tabParam) return null;
  const normalized = LEGACY_TAB_ALIASES[tabParam] ?? tabParam;
  return isDashboardTabId(normalized) ? normalized : null;
}

export function filterDashboardTabs(hasPersonalBond: boolean): DashboardTabDefinition[] {
  return DASHBOARD_TAB_DEFINITIONS.filter(
    (tab) => !tab.requiresPersonalBond || hasPersonalBond,
  );
}

export function isDashboardTabId(value: string | null | undefined): value is DashboardTabId {
  return (
    value === "treino" ||
    value === "dieta" ||
    value === "evolucao" ||
    value === "comunidade" ||
    value === "perfil"
  );
}

export function resolveDashboardTabFromParam(
  tabParam: string | null | undefined,
  hasPersonalBond: boolean,
): DashboardTabId {
  const normalized = normalizeDashboardTabParam(tabParam);
  if (!normalized) {
    return DEFAULT_DASHBOARD_TAB;
  }

  if (normalized === "dieta" && !hasPersonalBond) {
    return DEFAULT_DASHBOARD_TAB;
  }

  return normalized;
}

export function isDietaTabAllowed(hasPersonalBond: boolean, tab: DashboardTabId): boolean {
  return tab !== "dieta" || hasPersonalBond;
}

export function buildDashboardHref(options: {
  subgrupo?: string | null;
  tab?: DashboardTabId | null;
}): string {
  const params = new URLSearchParams();

  if (options.subgrupo?.trim()) {
    params.set("subgrupo", options.subgrupo.trim());
  }

  if (options.tab && options.tab !== DEFAULT_DASHBOARD_TAB) {
    params.set("tab", options.tab);
  }

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}
