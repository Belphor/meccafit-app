export type ForjadorNavRoute =
  | "/dashboard/forja"
  | "/forjador/dieta"
  | "/forjador/medidas"
  | "/forjador/monitoramento";

export const FORJADOR_WORKSPACE_NAV: ReadonlyArray<{
  href: ForjadorNavRoute;
  label: string;
}> = [
  { href: "/dashboard/forja", label: "Painel Forja" },
  { href: "/forjador/dieta", label: "Dieta semanal" },
  { href: "/forjador/medidas", label: "Medidas" },
  { href: "/forjador/monitoramento", label: "Monitoramento" },
];
