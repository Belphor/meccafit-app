import {
  buildDashboardHref,
  normalizeDashboardTabParam,
  type DashboardTabId,
} from "@/lib/dashboard-tabs";

/** Evento interno · sincroniza abas sem remount do dashboard */
export const DASHBOARD_TAB_CHANGE_EVENT = "meccafit:dashboard-tab-change";

/** Foca o mural da comunidade após SUPERAÇÃO (scroll + destaque). */
export const COMUNIDADE_MURAL_FOCUS_EVENT = "meccafit:focus-comunidade-mural";

export type ComunidadeMuralFocusDetail = {
  exerciseName?: string;
};

export type DashboardTabChangeDetail = {
  tab: DashboardTabId;
};

export function readDashboardTabFromLocation(): DashboardTabId | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeDashboardTabParam(params.get("tab"));
}

/** Atualiza URL sem navegação Next.js (evita refetch e remount) */
export function syncDashboardTabToUrl(
  tab: DashboardTabId,
  options?: { subgrupo?: string | null; dispatch?: boolean },
): void {
  if (typeof window === "undefined") return;

  const href = buildDashboardHref({
    subgrupo: options?.subgrupo ?? null,
    tab,
  });

  window.history.replaceState(window.history.state, "", href);

  if (options?.dispatch !== false) {
    window.dispatchEvent(
      new CustomEvent<DashboardTabChangeDetail>(DASHBOARD_TAB_CHANGE_EVENT, {
        detail: { tab },
      }),
    );
  }
}
