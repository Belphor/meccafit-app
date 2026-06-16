/**
 * Comunidade · estado de evolução do cliente (MIDAS + PLUTUS)
 */

import {
  resolveNivelTermicoGlobal,
  type EvolutionCalorPayload,
  type MuscleCalorLevel,
} from "@/components/evolution/human-body-constants";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import {
  fetchPerfilPublicoAtleta,
  type PerfilPublicoAtleta,
} from "@/lib/comunidade-data";

export type ComunidadeClienteEvolution = {
  nivelTermicoGlobal: MuscleCalorLevel;
  indiceIgnicao: number;
  calorPayload: EvolutionCalorPayload;
  perfilPublico: PerfilPublicoAtleta;
};

export async function fetchComunidadeClienteEvolution(
  userId: string,
): Promise<{ data: ComunidadeClienteEvolution | null; error: string | null }> {
  try {
    const [calorPayload, perfilResult] = await Promise.all([
      fetchMuscularEvolutionPayload(),
      fetchPerfilPublicoAtleta(userId),
    ]);

    if (!perfilResult.data) {
      return {
        data: null,
        error: perfilResult.error ?? "Perfil público indisponível.",
      };
    }

    const nivelTermicoGlobal = resolveNivelTermicoGlobal(
      calorPayload.indice_ignicao,
      calorPayload.calorRows,
    );

    return {
      data: {
        nivelTermicoGlobal,
        indiceIgnicao: calorPayload.indice_ignicao,
        calorPayload,
        perfilPublico: perfilResult.data,
      },
      error: null,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha ao carregar evolução.";
    return { data: null, error: message };
  }
}
