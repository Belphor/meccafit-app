export type ForjadorNavRoute =
  | "/dashboard/forja"
  | "/forjador/dieta"
  | "/forjador/medidas"
  | "/forjador/monitoramento";

export const FORJADOR_WORKSPACE_NAV: ReadonlyArray<{
  href: ForjadorNavRoute;
  label: string;
}> = [
  { href: "/dashboard/forja", label: "Treinos" },
  { href: "/forjador/dieta", label: "Nutrição VIP" },
  { href: "/forjador/medidas", label: "Medidas VIP" },
  { href: "/forjador/monitoramento", label: "Monitoramento" },
];
