import type { ClienteDashboardTab } from "@/types/portal.types";
import type { PortalProfileRole } from "@/lib/portal-auth";

export const DEFAULT_DASHBOARD_SUBGRUPO = "peitoral-superior" as const;

export const FORJA_DASHBOARD_ROUTE = "/dashboard/forja";
export const CLIENTE_DASHBOARD_ROUTE = "/dashboard";

export const FORJADOR_PANEL_ROLES = [
  "forjador",
  "forjador_linhagem",
  "forjador_soberano",
] as const satisfies readonly PortalProfileRole[];

export type ForjadorPanelRole = (typeof FORJADOR_PANEL_ROLES)[number];

export function isForjadorPanelRole(role: string | null | undefined): role is ForjadorPanelRole {
  return FORJADOR_PANEL_ROLES.includes(role as ForjadorPanelRole);
}

export function isForjadorSovereign(role: string | null | undefined): boolean {
  return role === "forjador_soberano";
}

export function resolveClienteDashboardRoute(
  _subgrupo: string = DEFAULT_DASHBOARD_SUBGRUPO,
): string {
  return CLIENTE_DASHBOARD_ROUTE;
}

export function resolvePostLoginRoute(role: string): string | null {
  if (isForjadorPanelRole(role)) {
    return FORJA_DASHBOARD_ROUTE;
  }

  if (role === "cliente") {
    return CLIENTE_DASHBOARD_ROUTE;
  }

  return null;
}

/** @deprecated Rotas legado · sem páginas activas — usar CLIENTE_DASHBOARD_ROUTE + ?tab= */
export const internalRoutes = {
  cliente: {
    root: "/cliente",
    dashboard: CLIENTE_DASHBOARD_ROUTE,
    matrixAlma: "/cliente/matrix-da-alma",
    portalBrasa: "/cliente/portal-de-brasa",
    irisEvolucao: "/cliente/iris-evolucao",
    fenixPureza: "/cliente/fenix-pureza",
    renascimento: "/cliente/renascimento",
    historicoSagrado: "/cliente/historico-sagrado",
    consultoriaForjador: "/cliente/consultoria-do-forjador",
  },
  forjador: {
    root: "/forjador",
    dashboard: FORJA_DASHBOARD_ROUTE,
    alunos: "/dashboard/forja",
  },
} as const;

/** @deprecated Tabs legado pré-consolidação dashboard */
export const clienteDashboardTabs: readonly ClienteDashboardTab[] = [
  {
    id: "matrix_alma",
    label: "Matrix da Alma",
    route: internalRoutes.cliente.matrixAlma,
  },
  {
    id: "portal_brasa",
    label: "Portal de Brasa",
    route: internalRoutes.cliente.portalBrasa,
  },
  {
    id: "iris_evolucao",
    label: "IRIS Evolução",
    route: internalRoutes.cliente.irisEvolucao,
  },
  {
    id: "fenix_pureza",
    label: "Fênix Pureza",
    route: internalRoutes.cliente.fenixPureza,
  },
  {
    id: "renascimento",
    label: "Renascimento",
    route: internalRoutes.cliente.renascimento,
  },
  {
    id: "historico_sagrado",
    label: "Histórico Sagrado",
    route: internalRoutes.cliente.historicoSagrado,
  },
  {
    id: "consultoria_forjador",
    label: "A Consultoria do Forjador",
    route: internalRoutes.cliente.consultoriaForjador,
  },
] as const;
