import { MONUMENTAL_BODY_REGION_SUBTITLE, PLASMA_TITLE } from "@/lib/dashboard-config";
import { resolveBodyRegionSubtitle, type MuscleSubgroup } from "@/lib/mock-data";

type MonumentalSubgroupTitleProps = {
  subgroup: MuscleSubgroup;
};

export function MonumentalSubgroupTitle({ subgroup }: MonumentalSubgroupTitleProps) {
  const bodyRegionSubtitle = resolveBodyRegionSubtitle(subgroup);
  const isPlanilhaDay = subgroup.id.startsWith("planilha-dia-");

  return (
    <div className="mb-6 text-center" aria-labelledby="subgrupo-monumental-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-amber-500/90">
        {isPlanilhaDay ? "Treino do dia" : "Subgrupo muscular ativo"}
      </p>
      <h2
        id="subgrupo-monumental-title"
        className={`${PLASMA_TITLE} mt-3 overflow-visible py-1 text-4xl leading-[1.15] tracking-[0.08em] sm:text-5xl sm:leading-[1.12] sm:tracking-[0.1em] lg:text-7xl lg:leading-[1.1]`}
      >
        {subgroup.monumentalTitle}
      </h2>
      <p
        className={`${MONUMENTAL_BODY_REGION_SUBTITLE} mt-4`}
        aria-label={`Região corporal: ${bodyRegionSubtitle}`}
      >
        {bodyRegionSubtitle}
      </p>
    </div>
  );
}
