"use client";

import {
  CALOR_LEVEL_LABELS,
  GLOBAL_THERMAL_RING_CLASS,
  MUSCLE_LABELS,
  type MuscleCalorLevel,
  type SovereignMuscleId,
} from "@/components/evolution/human-body-constants";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_CHIP,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADER,
  COMUNIDADE_PANEL,
  COMUNIDADE_SECTION_INNER,
} from "@/components/comunidade/comunidade-layout";
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
  const displayName = profileName?.trim() || "Membro da linhagem";

  return (
    <section
      className={[
        COMUNIDADE_PANEL,
        "backdrop-blur-md",
        thermalStyle.borderClass,
        thermalStyle.gradientClass,
        thermalStyle.glowClass,
      ].join(" ")}
      aria-label="Nível de evolução na comunidade"
    >
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-amber-200/80`}>Teu nível na comunidade</p>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Aqui vês a tua consistência de treino e os títulos que já conquistaste. O anel colorido
          no avatar indica se és Rei, Pilar ou detentor do cinturão.
        </p>
      </header>

      <div className="mt-4 flex w-full min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div className="flex min-w-0 shrink-0 flex-col items-center gap-2 md:items-start">
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
          <p className="max-w-full break-words text-pretty text-center text-[11px] font-medium text-amber-100/90 md:text-left">
            {displayName}
          </p>
        </div>

        <div className={`${COMUNIDADE_SECTION_INNER} flex-1 text-center md:text-left`}>
          <span className={[COMUNIDADE_CHIP, thermalStyle.chipClass].join(" ")}>
            {loading ? "A carregar…" : `Nível · ${CALOR_LEVEL_LABELS[nivel]}`}
          </span>

          <p className="mt-3 font-mono text-xl font-bold tabular-nums text-amber-50/95 xs:text-2xl sm:text-3xl">
            {loading ? "—" : `${Math.round(evolution?.indiceIgnicao ?? 0)}%`}
          </p>
          <p className="text-pretty break-words text-[10px] uppercase tracking-[0.1em] text-neutral-500 xs:tracking-[0.12em]">
            Índice de ignição · dias de treino neste mês
          </p>

          {!loading && evolution ? (
            <dl className="mt-4 grid w-full min-w-0 grid-cols-1 gap-2 text-[11px] xs:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 xs:px-3">
                <dt className="text-pretty break-words text-[9px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]">
                  Músculo mais forte · 14 dias
                </dt>
                <dd className="mt-1 break-words font-medium text-amber-100/90">
                  {resolveGrupoLabel(evolution.perfilPublico.grupo_supremo)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 xs:px-3">
                <dt className="text-pretty break-words text-[9px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]">
                  Duelos ganhos · cinturão
                </dt>
                <dd className="mt-1 font-medium text-amber-100/90">
                  {evolution.perfilPublico.duelos_vencidos}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
