export const EVOLUTION_CALOR_REFRESH_EVENT = "meccafit:evolution-calor-refresh";

export type EvolutionCalorRefreshDetail = {
  userId: string;
  source?: "treino_registrado" | "cardio_voo_cinzas" | "manual";
};

export function dispatchEvolutionCalorRefresh(
  userId: string,
  source?: EvolutionCalorRefreshDetail["source"],
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<EvolutionCalorRefreshDetail>(EVOLUTION_CALOR_REFRESH_EVENT, {
      detail: { userId, source },
    }),
  );
}
