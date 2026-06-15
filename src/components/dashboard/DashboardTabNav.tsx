import {
  DASHBOARD_TAB_BUTTON_ACTIVE,
  DASHBOARD_TAB_BUTTON_IDLE,
  PLASMA_TITLE,
} from "@/lib/dashboard-config";
import {
  filterDashboardTabs,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";

export type { DashboardTabId };

type DashboardTabNavProps = {
  activeTab: DashboardTabId;
  muralCount: number;
  hasPersonalBond: boolean;
  onTabChange: (tab: DashboardTabId) => void;
};

export function DashboardTabNav({
  activeTab,
  muralCount,
  hasPersonalBond,
  onTabChange,
}: DashboardTabNavProps) {
  const visibleTabs = filterDashboardTabs(hasPersonalBond);

  return (
    <nav
      className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-20 -mx-1 mt-4 flex flex-wrap justify-center gap-1.5 bg-black/50 px-1 py-2 backdrop-blur-md sm:mx-0 sm:mt-6 sm:gap-2 sm:bg-transparent sm:py-0 sm:backdrop-blur-none lg:mt-8"
      aria-label="Navegação do portal de brasa"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange(tab.id)}
            className={`min-h-11 shrink-0 ${isActive ? DASHBOARD_TAB_BUTTON_ACTIVE : DASHBOARD_TAB_BUTTON_IDLE}`}
          >
            <span className={`relative z-[1] ${isActive ? PLASMA_TITLE : ""}`}>
              {tab.label}
            </span>
            {tab.id === "comunidade" && muralCount > 0 ? (
              <span className="relative z-[1] ml-1.5 text-amber-300 sm:ml-2">({muralCount})</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
