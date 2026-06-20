import { MAGMA_SPECTRUM, MECCAFIT_CENTER_BRAND } from "@/lib/dashboard-config";
import { PORTAL_COPY } from "@/lib/portal-copy";

type MeccafitCenterBrandProps = {
  variant?: "portal" | "dashboard";
  className?: string;
};

export function MeccafitCenterBrand({
  variant = "portal",
  className = "",
}: MeccafitCenterBrandProps) {
  const isDashboard = variant === "dashboard";

  return (
    <p
      role="banner"
      aria-label={PORTAL_COPY.brandName}
      className={`${MECCAFIT_CENTER_BRAND} max-[359px]:text-[0.65rem] sm:whitespace-nowrap ${
        isDashboard ? "" : "text-amber-500"
      } ${className}`.trim()}
      style={isDashboard ? { color: MAGMA_SPECTRUM.solarGold } : undefined}
    >
      {PORTAL_COPY.brandName}
    </p>
  );
}
