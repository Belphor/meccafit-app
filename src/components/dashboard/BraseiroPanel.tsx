import type { ClientProfile } from "@/lib/mock-data";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { VtcMetricDisplay } from "@/components/dashboard/VtcMetricDisplay";
import {
  DASHBOARD_META_CHIP,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";

type BraseiroPanelProps = {
  profile: ClientProfile;
  isIncubating: boolean;
  formattedVtcTotal: string;
  hasBiologicalBalance: boolean;
  biologicalMultiplier: number;
  isChamaReativa: boolean;
  className?: string;
};

const PROFILE_ROWS = (profile: ClientProfile) =>
  [
    { label: "Cliente", value: profile.name },
    { label: "Linhagem", value: profile.lineage },
    { label: "Fase", value: profile.birth },
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
  hasBiologicalBalance,
  biologicalMultiplier,
  isChamaReativa,
  className = "",
}: BraseiroPanelProps) {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={`min-w-0 ${DASHBOARD_PANEL_FRAME} ${className}`}
      aria-labelledby="braseiro-title"
    >
      <DashboardPanelHeader chip="Braseiro" meta="Energético" />

      <h2 id="braseiro-title" className={`${DASHBOARD_SECTION_TITLE} mt-3 sm:mt-4`}>
        Chama do Altar
      </h2>

      <VtcMetricDisplay
        formattedValue={formattedVtcTotal}
        variant="panel"
        isIncubating={isIncubating}
        hasBiologicalBalance={hasBiologicalBalance}
        biologicalMultiplier={biologicalMultiplier}
        isChamaReativa={isChamaReativa}
        showBiologicalBalance
      />

      <BraseiroProfileDetails profile={profile} />
    </BrasaVivaCard>
  );
}
