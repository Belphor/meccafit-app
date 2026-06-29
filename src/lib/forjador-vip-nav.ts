export type ForjadorNavRoute =
  | "/dashboard/forja"
  | "/forjador/dieta"
  | "/forjador/medidas"
  | "/forjador/monitoramento"
  | "/forjador/academia";

export type ForjadorNavItem = {
  href: ForjadorNavRoute;
  label: string;
  sovereignOnly?: boolean;
};

export const FORJADOR_WORKSPACE_NAV: ReadonlyArray<ForjadorNavItem> = [
  { href: "/dashboard/forja", label: "Treinos" },
  { href: "/forjador/dieta", label: "Nutrição" },
  { href: "/forjador/medidas", label: "Medidas" },
  { href: "/forjador/monitoramento", label: "Monitoramento" },
  { href: "/forjador/academia", label: "Academia", sovereignOnly: true },
];

export function resolveForjadorWorkspaceNav(isSovereign: boolean): ForjadorNavItem[] {
  return FORJADOR_WORKSPACE_NAV.filter((item) => !item.sovereignOnly || isSovereign);
}
