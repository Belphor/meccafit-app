import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CATALOG_PATH = resolve(process.cwd(), "src/data/test-exercise-catalog.json");

let cached = null;

export function loadExerciseCatalog() {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  return cached;
}

export function listCatalogExercises() {
  const catalog = loadExerciseCatalog();
  return catalog.subgroups.flatMap((subgroup) =>
    subgroup.exercises.map((exercise) => ({
      ...exercise,
      subgroupId: subgroup.id,
      musculo: subgroup.musculo,
    })),
  );
}

export function listCatalogExerciseIds() {
  return listCatalogExercises().map((exercise) => exercise.id);
}

export function findCatalogExercise(exerciseId) {
  return listCatalogExercises().find((exercise) => exercise.id === exerciseId) ?? null;
}

export function matchesCatalogExercise(row) {
  const id = Number(row.exercicio_id);
  const catalog = listCatalogExercises();
  if (catalog.some((exercise) => exercise.id === id)) return true;

  const name = String(row.exercicio_nome ?? "").trim().toLowerCase();
  return catalog.some((exercise) => exercise.name.toLowerCase() === name);
}
