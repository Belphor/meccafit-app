import { MONUMENTAL_BODY_REGION_SUBTITLE, PLASMA_TITLE } from "@/lib/dashboard-config";
import { resolveBodyRegionSubtitle, type MuscleSubgroup } from "@/lib/mock-data";

type MonumentalSubgroupTitleProps = {
  subgroup: MuscleSubgroup;
  compact?: boolean;
};

export function MonumentalSubgroupTitle({ subgroup, compact = false }: MonumentalSubgroupTitleProps) {
  const bodyRegionSubtitle = resolveBodyRegionSubtitle(subgroup);
  const isPlanilhaDay = subgroup.id.startsWith("planilha-dia-");

  return (
    <div className={`text-center ${compact ? "mb-2" : "mb-6"}`} aria-labelledby="subgrupo-monumental-title">
      {!compact ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500/90 xs:tracking-[0.28em] sm:tracking-[0.38em]">
          {isPlanilhaDay ? "Treino do dia" : "Subgrupo muscular ativo"}
        </p>
      ) : null}
      <h2
        id="subgrupo-monumental-title"
        className={`${PLASMA_TITLE} ${compact ? "mt-0" : "mt-3"} overflow-x-clip py-1 text-balance text-[clamp(1.5rem,7vw,3rem)] leading-[1.15] tracking-[0.06em] sm:text-4xl sm:leading-[1.12] sm:tracking-[0.1em] lg:text-5xl lg:leading-[1.1]`}
      >
        {subgroup.monumentalTitle}
      </h2>
      <p
        className={`${MONUMENTAL_BODY_REGION_SUBTITLE} ${compact ? "mt-2" : "mt-4"}`}
        aria-label={`Região corporal: ${bodyRegionSubtitle}`}
      >
        {bodyRegionSubtitle}
      </p>
    </div>
  );
}
