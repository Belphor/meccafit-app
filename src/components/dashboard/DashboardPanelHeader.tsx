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
    <div className={DASHBOARD_PANEL_HEADER}>
      <span className={DASHBOARD_SECTION_CHIP}>{chip}</span>
      <span className={metaClass}>{meta}</span>
    </div>
  );
}
