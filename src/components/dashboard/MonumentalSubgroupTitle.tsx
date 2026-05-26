import { MONUMENTAL_BODY_REGION_SUBTITLE, PLASMA_TITLE } from "@/lib/dashboard-config";
import { resolveBodyRegionSubtitle, type MuscleSubgroup } from "@/lib/mock-data";

type MonumentalSubgroupTitleProps = {
  subgroup: MuscleSubgroup;
};

export function MonumentalSubgroupTitle({ subgroup }: MonumentalSubgroupTitleProps) {
  const bodyRegionSubtitle = resolveBodyRegionSubtitle(subgroup);

  return (
    <div className="mb-6 text-center" aria-labelledby="subgrupo-monumental-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-amber-500/90">
        Subgrupo muscular ativo
      </p>
      <h2
        id="subgrupo-monumental-title"
        className={`${PLASMA_TITLE} mt-3 text-4xl leading-[0.95] tracking-[0.08em] sm:text-5xl sm:tracking-[0.1em] lg:text-7xl`}
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
