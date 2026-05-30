import type { ClienteDashboardTab } from "@/types/portal.types";

export const DEFAULT_DASHBOARD_SUBGRUPO = "peitoral-superior" as const;

export const FORJA_DASHBOARD_ROUTE = "/dashboard/forja";

export function resolveClienteDashboardRoute(
  subgrupo: string = DEFAULT_DASHBOARD_SUBGRUPO,
): string {
  return `/dashboard?subgrupo=${encodeURIComponent(subgrupo)}`;
}

export function resolvePostLoginRoute(role: string): string | null {
  if (role === "forjador_soberano") {
    return FORJA_DASHBOARD_ROUTE;
  }

  if (role === "cliente") {
    return internalRoutes.cliente.dashboard;
  }

  return null;
}

export const internalRoutes = {
  cliente: {
    root: "/cliente",
    dashboard: "/dashboard",
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
    dashboard: "/forjador/dashboard",
    alunos: "/forjador/alunos",
  },
} as const;

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
