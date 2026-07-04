"use client";

import { useMemo } from "react";
import {
  IRIS_BORDER_CINTURAO,
  IRIS_BORDER_PILAR_COOP,
  IRIS_BORDER_REI_CHAMAS,
  PlutusAvatar,
  resolvePlutusProfileCardAccent,
} from "@/components/comunidade/plutus-avatar";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_CHIP,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADER,
  COMUNIDADE_PANEL,
  COMUNIDADE_SECTION_INNER,
} from "@/components/comunidade/comunidade-layout";
import { MUSCLE_LABELS, type SovereignMuscleId } from "@/components/evolution/human-body-constants";
import type { ComunidadeClienteEvolution } from "@/lib/comunidade-evolution";
import { LoreEm } from "@/lib/lore-emphasis";

type ComunidadeEvolutionStatusProps = {
  evolution: ComunidadeClienteEvolution | null;
  loading?: boolean;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
};

const THERMAL_LEVEL_KEYS = new Set(["CINZAS", "FAISCA", "BRASA", "LABAREDA", "FOGO CÓSMICO"]);

function resolveGrupoLabel(grupo: string | null | undefined): string {
  const key = grupo?.trim().toUpperCase() ?? "";
  if (!key || THERMAL_LEVEL_KEYS.has(key)) {
    return "Ainda sem destaque no mês";
  }
  if (key in MUSCLE_LABELS) {
    return MUSCLE_LABELS[key as SovereignMuscleId];
  }
  return grupo?.trim() || "Ainda sem destaque no mês";
}

type TituloBadge = {
  label: string;
  color: string;
};

function resolveTitulosConquistados(
  perfil: ComunidadeClienteEvolution["perfilPublico"] | undefined,
): TituloBadge[] {
  if (!perfil) return [];

  const titulos: TituloBadge[] = [];

  if (perfil.tem_cinturao_duelo) {
    titulos.push({ label: "Cinturão do duelo", color: IRIS_BORDER_CINTURAO });
  }
  if (perfil.is_rei_chamas_superiores) {
    titulos.push({ label: "Rei das Chamas · Superiores", color: IRIS_BORDER_REI_CHAMAS });
  }
  if (perfil.is_rei_chamas_inferiores) {
    titulos.push({ label: "Rei das Chamas · Inferiores", color: IRIS_BORDER_REI_CHAMAS });
  } else if (perfil.is_rei_das_chamas) {
    titulos.push({ label: "Rei das Chamas", color: IRIS_BORDER_REI_CHAMAS });
  }
  if (perfil.is_pilar_cooperativo) {
    titulos.push({ label: "Pilar cooperativo", color: IRIS_BORDER_PILAR_COOP });
  }

  return titulos;
}

export function ComunidadeEvolutionStatus({
  evolution,
  loading = false,
  profileName,
  profilePhotoUrl,
}: ComunidadeEvolutionStatusProps) {
  const perfil = evolution?.perfilPublico;
  const displayName = profileName?.trim() || "Membro da academia";
  const titulos = resolveTitulosConquistados(perfil);
  const cardAccent = useMemo(
    () =>
      resolvePlutusProfileCardAccent({
        temCinturaoDuelo: perfil?.tem_cinturao_duelo,
        isReiDasChamas: perfil?.is_rei_das_chamas,
        isReiChamasSuperiores: perfil?.is_rei_chamas_superiores,
        isReiChamasInferiores: perfil?.is_rei_chamas_inferiores,
        isPilarCooperativo: perfil?.is_pilar_cooperativo,
      }),
    [perfil],
  );

  return (
    <section
      className={[COMUNIDADE_PANEL, "backdrop-blur-md transition-[border-color,box-shadow] duration-500"].join(" ")}
      style={{
        borderColor: cardAccent.borderColor,
        boxShadow: cardAccent.boxShadow,
        backgroundImage: cardAccent.backgroundImage,
        backgroundColor: cardAccent.backgroundImage ? undefined : "rgba(10, 10, 10, 0.6)",
      }}
      aria-label="Seu perfil na comunidade"
    >
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-amber-200/80`}>Seu perfil na comunidade</p>
        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Aqui você vê o <LoreEm>músculo em que mais carregou</LoreEm> no ranking mensal e os{" "}
          <LoreEm>títulos conquistados</LoreEm> na arena. Sua foto, definida no Perfil, aparece no
          mural, nos duelos e nos rankings quando a <LoreEm>miniatura da comunidade</LoreEm> é
          sincronizada.
        </p>
      </header>

      <div className="mt-4 flex w-full min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div className="flex min-w-0 shrink-0 flex-col items-center gap-2 md:items-start">
          <PlutusAvatar
            name={profileName}
            photoUrl={profilePhotoUrl}
            temCinturaoDuelo={perfil?.tem_cinturao_duelo}
            isReiDasChamas={perfil?.is_rei_das_chamas}
            isPilarCooperativo={perfil?.is_pilar_cooperativo}
            size="lg"
          />
          <p className="max-w-full break-words text-pretty text-center text-[11px] font-medium text-amber-100/90 md:text-left">
            {displayName}
          </p>
        </div>

        <div className={`${COMUNIDADE_SECTION_INNER} flex-1 text-center md:text-left`}>
          {!loading && evolution ? (
            <dl className="grid w-full min-w-0 grid-cols-1 gap-2 text-[11px] xs:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 xs:px-3">
                <dt className="text-pretty break-words text-[9px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]">
                  Músculo mais forte (ranking mensal)
                </dt>
                <dd className="mt-1 break-words font-medium text-amber-100/90">
                  {resolveGrupoLabel(evolution.perfilPublico.grupo_supremo)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 xs:px-3">
                <dt className="text-pretty break-words text-[9px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]">
                  Duelos ganhos no cinturão
                </dt>
                <dd className="mt-1 font-medium text-amber-100/90">
                  {evolution.perfilPublico.duelos_vencidos}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-neutral-500">{loading ? "Carregando…" : "Sem dados ainda."}</p>
          )}

          <div className="mt-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              Títulos conquistados
            </p>
            {!loading && titulos.length > 0 ? (
              <ul className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                {titulos.map((titulo) => (
                  <li key={titulo.label}>
                    <span
                      className={[COMUNIDADE_CHIP, "border-white/10 bg-black/30"].join(" ")}
                      style={{ color: titulo.color, borderColor: `${titulo.color}44` }}
                    >
                      {titulo.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                {loading
                  ? "Verificando títulos…"
                  : "Nenhum título ainda. Participe dos duelos e suba no ranking mensal."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
