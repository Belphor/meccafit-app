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
  tabsLocked?: boolean;
  onTabChange: (tab: DashboardTabId) => void;
};

export function DashboardTabNav({
  activeTab,
  muralCount,
  hasPersonalBond,
  tabsLocked = false,
  onTabChange,
}: DashboardTabNavProps) {
  const visibleTabs = filterDashboardTabs(hasPersonalBond);

  return (
    <nav
      className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-20 -mx-1 mt-4 hidden flex-wrap justify-center gap-1.5 bg-black/50 px-1 py-2 backdrop-blur-md sm:mx-0 sm:mt-6 sm:flex sm:gap-2 sm:bg-transparent sm:py-0 sm:backdrop-blur-none lg:mt-8"
      data-dashboard-tab-nav
      aria-label="Navegação do portal de brasa"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (tabsLocked) return;
              onTabChange(tab.id);
            }}
            disabled={tabsLocked && !isActive}
            aria-disabled={tabsLocked && !isActive ? true : undefined}
            className={`min-h-11 max-w-[calc(50%-0.375rem)] shrink sm:max-w-none ${
              tabsLocked && !isActive ? "cursor-not-allowed opacity-35" : ""
            } ${isActive ? DASHBOARD_TAB_BUTTON_ACTIVE : DASHBOARD_TAB_BUTTON_IDLE}`}
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
