import type { Enums } from "@/types/database.types";

export function subgroupIdToMusculo(subgroupId: string): Enums<"subgrupo_muscular"> {
  const normalized = subgroupId.trim().toLowerCase();

  if (normalized.includes("peitoral") || normalized.includes("peito")) return "peito";
  if (normalized.includes("inferior") || normalized.includes("perna")) return "pernas";
  if (normalized === "core" || normalized.includes("abdome") || normalized.includes("abdômen"))
    return "abdomen";
  if (normalized.includes("costa")) return "costas";
  if (normalized.includes("ombro")) return "ombros";
  if (normalized.includes("braco") || normalized.includes("braço")) return "bracos";
  if (normalized.includes("perna")) return "pernas";

  return "peito";
}
