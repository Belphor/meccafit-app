import { monumentalSubgroupMock, subgroupsCatalog, type MuscleSubgroup } from "@/lib/mock-data";
import { sanitizeNumericRouteParam, sanitizeTextFilterParam } from "@/lib/filter-sanitize";

export function resolveSubgroupFromParam(param: string | null | undefined): MuscleSubgroup {
  const cleaned = sanitizeTextFilterParam(param);
  if (!cleaned) return monumentalSubgroupMock;

  const numericRouteId = sanitizeNumericRouteParam(param);

  const match = subgroupsCatalog.find(
    (subgroup) =>
      subgroup.id === cleaned ||
      subgroup.slug === cleaned ||
      (numericRouteId !== null && subgroup.numericRouteId === numericRouteId),
  );

  return match ?? monumentalSubgroupMock;
}
