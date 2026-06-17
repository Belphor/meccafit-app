import {
  DASHBOARD_META_CHIP,
  DASHBOARD_PANEL_HEADER,
  DASHBOARD_SECTION_CHIP,
  DASHBOARD_TAB_LABEL,
} from "@/lib/dashboard-config";

type DashboardPanelHeaderProps = {
  chip: string;
  meta: string;
  metaVariant?: "chip" | "label";
};

export function DashboardPanelHeader({
  chip,
  meta,
  metaVariant = "label",
}: DashboardPanelHeaderProps) {
  const metaClass = metaVariant === "chip" ? DASHBOARD_META_CHIP : DASHBOARD_TAB_LABEL;

  return (
    <div className={`${DASHBOARD_PANEL_HEADER} min-w-0 max-w-full`}>
      <span className={`${DASHBOARD_SECTION_CHIP} max-w-full break-words leading-tight`}>{chip}</span>
      <span
        className={`${metaClass} max-w-full break-words text-right leading-tight max-sm:tracking-[0.14em] sm:tracking-[0.32em]`}
      >
        {meta}
      </span>
    </div>
  );
}
