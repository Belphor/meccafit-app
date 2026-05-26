import type { ReactNode } from "react";
import { MeccafitCenterBrand } from "@/components/MeccafitCenterBrand";
import { MECCAFIT_CENTER_HEADER_SHELL } from "@/lib/dashboard-config";

type DashboardBrandHeaderProps = {
  altarEnergyPercent: number;
  signOutButton: ReactNode;
};

export function DashboardBrandHeader({
  altarEnergyPercent,
  signOutButton,
}: DashboardBrandHeaderProps) {
  return (
    <header className="mb-3 sm:mb-6">
      <div className="relative flex min-h-10 items-center justify-end sm:min-h-11">
        <div className={MECCAFIT_CENTER_HEADER_SHELL}>
          <MeccafitCenterBrand variant="dashboard" />
        </div>
        {signOutButton}
      </div>
      <p className="mt-1 text-center text-[10px] uppercase tracking-[0.2em] text-amber-600/50 sm:tracking-[0.22em]">
        Altar {altarEnergyPercent}%
      </p>
    </header>
  );
}
