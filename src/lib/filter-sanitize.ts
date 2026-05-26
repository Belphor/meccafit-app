/** Remove filtros textuais inválidos antes de comparações numéricas ou RPC. */
export function sanitizeTextFilterParam(param: string | null | undefined): string | null {
  if (param === null || param === undefined) return null;

  const normalized = param.trim().toLowerCase();
  if (!normalized || normalized === "geral") return null;

  return normalized;
}

export function sanitizeNumericRouteParam(param: string | null | undefined): number | null {
  const cleaned = sanitizeTextFilterParam(param);
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;

  return Number.parseInt(cleaned, 10);
}
