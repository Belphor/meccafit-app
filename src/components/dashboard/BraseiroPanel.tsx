import type { ClientProfile } from "@/lib/mock-data";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { VtcMetricDisplay } from "@/components/dashboard/VtcMetricDisplay";
import {
  buildChamaAltarCardStyle,
  CHAMA_ALTAR_TIER_LABELS,
  resolveChamaAltarIntensity,
  resolveChamaAltarTier,
} from "@/lib/chama-altar-visual";
import {
  CHAMA_ALTAR_CLIENT_EXPLANATION,
  DASHBOARD_META_CHIP,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

type BraseiroPanelProps = {
  profile: ClientProfile;
  isIncubating: boolean;
  formattedVtcTotal: string;
  vtcTotal: number;
  hasBiologicalBalance: boolean;
  biologicalMultiplier: number;
  isChamaReativa: boolean;
  className?: string;
};

const PROFILE_ROWS = (profile: ClientProfile) =>
  [
    { label: "Cliente", value: profile.name },
    { label: "Linhagem", value: profile.lineage },
    { label: "Status", value: profile.status },
  ] as const;

function BraseiroProfileDetails({ profile }: { profile: ClientProfile }) {
  const rows = PROFILE_ROWS(profile);

  return (
    <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-6 lg:grid-cols-1">
      {rows.map((row, index, allRows) => (
        <div
          key={row.label}
          className={`min-w-0 ${
            index < allRows.length - 1 ? "border-b border-neutral-800/50 pb-3 lg:pb-3" : ""
          } lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-4`}
        >
          <dt className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-neutral-500 sm:tracking-[0.18em]">
            {row.label}
          </dt>
          <dd className="mt-1 min-w-0 lg:mt-0 lg:text-right">
            <span className={`${DASHBOARD_META_CHIP} whitespace-normal break-words text-pretty`}>
              {row.value}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BraseiroPanel({
  profile,
  isIncubating,
  formattedVtcTotal,
  vtcTotal,
  hasBiologicalBalance,
  biologicalMultiplier,
  isChamaReativa,
  className = "",
}: BraseiroPanelProps) {
  const chamaTier = resolveChamaAltarTier(vtcTotal);
  const chamaTierLabel = CHAMA_ALTAR_TIER_LABELS[chamaTier];
  const chamaIntensity = String(Math.min(1, resolveChamaAltarIntensity(vtcTotal)));
  const cardStyle = buildChamaAltarCardStyle(vtcTotal);

  return (
    <BrasaVivaCard
      as="section"
      variant={chamaTier >= 2 ? "brasao" : "treino"}
      className={`chama-altar-card chama-altar-tier-${chamaTier} min-w-0 ${DASHBOARD_PANEL_FRAME} ${className}`}
      style={cardStyle}
      overlay={chamaTier >= 1 ? <div className="chama-altar-ambient" aria-hidden /> : undefined}
      aria-labelledby="braseiro-title"
    >
      <DashboardPanelHeader chip="Braseiro" meta="Energético" />

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
        <h2 id="braseiro-title" className={DASHBOARD_SECTION_TITLE}>
          Chama do Altar
        </h2>
        {chamaTier > 0 ? (
          <span className="rounded-full border border-amber-500/25 bg-amber-950/35 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-200/90">
            {chamaTierLabel}
          </span>
        ) : null}
      </div>

      <DashboardClientInfoBlock className="mt-3">
        {CHAMA_ALTAR_CLIENT_EXPLANATION}
      </DashboardClientInfoBlock>

      <VtcMetricDisplay
        formattedValue={formattedVtcTotal}
        variant="panel"
        isIncubating={isIncubating}
        hasBiologicalBalance={hasBiologicalBalance}
        biologicalMultiplier={biologicalMultiplier}
        isChamaReativa={isChamaReativa}
        chamaIntensity={chamaIntensity}
        showBiologicalBalance
      />

      <BraseiroProfileDetails profile={profile} />
    </BrasaVivaCard>
  );
}
