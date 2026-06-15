import {
  buildSubgroupFromCatalog,
  monumentalSubgroupMock,
  TEST_EXERCISE_CATALOG,
} from "@/lib/exercise-catalog";
import type { MuscleSubgroup } from "@/lib/mock-data";

export function resolveSubgroupByCatalogId(subgroupId: string): MuscleSubgroup {
  const entry = TEST_EXERCISE_CATALOG.subgroups.find((item) => item.id === subgroupId);
  if (!entry) return monumentalSubgroupMock;
  return buildSubgroupFromCatalog(entry);
}
