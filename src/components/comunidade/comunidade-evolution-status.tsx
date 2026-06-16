"use client";

import {
  CALOR_LEVEL_LABELS,
  GLOBAL_THERMAL_RING_CLASS,
  MUSCLE_LABELS,
  type MuscleCalorLevel,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { ComunidadeClienteEvolution } from "@/lib/comunidade-evolution";
import { resolveEvolutionThermalStyleByLevel } from "@/lib/evolution-thermal-styles";

type ComunidadeEvolutionStatusProps = {
  evolution: ComunidadeClienteEvolution | null;
  loading?: boolean;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
};

function resolveGrupoLabel(grupo: string): string {
  const key = grupo.trim().toUpperCase() as SovereignMuscleId;
  return MUSCLE_LABELS[key] ?? grupo;
}

export function ComunidadeEvolutionStatus({
  evolution,
  loading = false,
  profileName,
  profilePhotoUrl,
}: ComunidadeEvolutionStatusProps) {
  const nivel: MuscleCalorLevel = evolution?.nivelTermicoGlobal ?? "CINZAS";
  const thermalStyle = resolveEvolutionThermalStyleByLevel(nivel);
  const ringClass = GLOBAL_THERMAL_RING_CLASS[nivel];
  const perfil = evolution?.perfilPublico;

  return (
    <section
      className={[
        "rounded-2xl border p-4 sm:p-5 backdrop-blur-md",
        thermalStyle.borderClass,
        thermalStyle.gradientClass,
        thermalStyle.glowClass,
      ].join(" ")}
      aria-label="Nível de evolução na comunidade"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
        Teu nível · Evolução MIDAS
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className={`shrink-0 rounded-full p-1 ${ringClass}`}>
          <PlutusAvatar
            name={profileName}
            photoUrl={profilePhotoUrl}
            temCinturaoDuelo={perfil?.tem_cinturao_duelo}
            isReiDasChamas={perfil?.is_rei_das_chamas}
            isPilarCooperativo={perfil?.is_pilar_cooperativo}
            size="lg"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span
            className={[
              "inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
              thermalStyle.chipClass,
            ].join(" ")}
          >
            {loading ? "A carregar…" : `Nível · ${CALOR_LEVEL_LABELS[nivel]}`}
          </span>

          <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-amber-50/95 sm:text-3xl">
            {loading ? "—" : `${Math.round(evolution?.indiceIgnicao ?? 0)}%`}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Índice de ignição (consistência mensal)
          </p>

          {!loading && evolution ? (
            <dl className="mt-4 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                  Grupo supremo
                </dt>
                <dd className="mt-1 font-medium text-amber-100/90">
                  {resolveGrupoLabel(evolution.perfilPublico.grupo_supremo)}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                  Duelos vencidos
                </dt>
                <dd className="mt-1 font-medium text-amber-100/90">
                  {evolution.perfilPublico.duelos_vencidos}
                </dd>
              </div>
            </dl>
          ) : null}

          <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
            Mesmo nível da aba Evolução — VTC muscular (14d) + ignição mensal. Cinturão rosa,
            rei violeta e pilar ouro vêm da arena cooperativa.
          </p>
        </div>
      </div>
    </section>
  );
}
