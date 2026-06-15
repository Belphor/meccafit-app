export type DashboardTabId = "treino" | "dieta" | "evolucao" | "forum";

export type DashboardTabDefinition = {
  id: DashboardTabId;
  label: string;
  requiresPersonalBond?: boolean;
};

export const DASHBOARD_TAB_DEFINITIONS: readonly DashboardTabDefinition[] = [
  { id: "treino", label: "Treino" },
  { id: "dieta", label: "Dieta", requiresPersonalBond: true },
  { id: "evolucao", label: "Evolução" },
  { id: "forum", label: "Fórum Brasa-Viva" },
] as const;

export const DEFAULT_DASHBOARD_TAB: DashboardTabId = "treino";

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
    value === "forum"
  );
}

export function resolveDashboardTabFromParam(
  tabParam: string | null | undefined,
  hasPersonalBond: boolean,
): DashboardTabId {
  if (!isDashboardTabId(tabParam)) {
    return DEFAULT_DASHBOARD_TAB;
  }

  if (tabParam === "dieta" && !hasPersonalBond) {
    return DEFAULT_DASHBOARD_TAB;
  }

  return tabParam;
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
