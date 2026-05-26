import {
  DEFAULT_COSMETIC_THEME,
  DEFAULT_LAYOUT_SCALE,
  type PhaseTier,
} from "@/lib/dashboard-config";

export type VerifiedCustomPreferences = {
  theme: {
    magmaCore: string;
    solarGold: string;
    ambientGlowOpacity: number;
    panelBlurPx: number;
  };
  layout: {
    portalPaddingScale: number;
  };
};

export type PhaseOneProgress = {
  tier: 1;
  days_elapsed: number;
  days_required: number;
  hours_elapsed: number;
  hours_required: number;
  sessions: number;
  sessions_required: number;
  vtc_cumulative: number;
  vtc_required: number;
  eligible: boolean;
};

export type BundlePhasePayload = {
  phase_tier: PhaseTier;
  phase_setup_at?: string;
  phase_progress?: PhaseOneProgress | null;
  custom_preferences: VerifiedCustomPreferences;
  phase_reached?: string;
  active_phase_layout?: string;
  thermal_gravity?: import("@/lib/thermal-gravity").ThermalGravityState;
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

function sanitizeUnit(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** PLUTUS — only server-sourced JSON; rejects client injection shapes. */
export function parseVerifiedCustomPreferences(raw: unknown): VerifiedCustomPreferences {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const themeRaw =
    source.theme && typeof source.theme === "object" && !Array.isArray(source.theme)
      ? (source.theme as Record<string, unknown>)
      : {};

  const layoutRaw =
    source.layout && typeof source.layout === "object" && !Array.isArray(source.layout)
      ? (source.layout as Record<string, unknown>)
      : {};

  return {
    theme: {
      magmaCore: sanitizeHex(themeRaw.magmaCore, DEFAULT_COSMETIC_THEME.magmaCore),
      solarGold: sanitizeHex(themeRaw.solarGold, DEFAULT_COSMETIC_THEME.solarGold),
      ambientGlowOpacity: sanitizeUnit(
        themeRaw.ambientGlowOpacity,
        0,
        1,
        DEFAULT_COSMETIC_THEME.ambientGlowOpacity,
      ),
      panelBlurPx: sanitizeUnit(
        themeRaw.panelBlurPx,
        0,
        24,
        DEFAULT_COSMETIC_THEME.panelBlurPx,
      ),
    },
    layout: {
      portalPaddingScale: sanitizeUnit(
        layoutRaw.portalPaddingScale,
        0.75,
        1.25,
        DEFAULT_LAYOUT_SCALE,
      ),
    },
  };
}

export function parsePhaseOneProgress(raw: unknown): PhaseOneProgress | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  return {
    tier: 1,
    days_elapsed: sanitizeUnit(row.days_elapsed, 0, 3650, 0),
    days_required: sanitizeUnit(row.days_required, 1, 30, 7),
    hours_elapsed: sanitizeUnit(row.hours_elapsed, 0, 87600, 0),
    hours_required: sanitizeUnit(row.hours_required, 1, 720, 168),
    sessions: sanitizeUnit(row.sessions, 0, 100000, 0),
    sessions_required: sanitizeUnit(row.sessions_required, 1, 100, 4),
    vtc_cumulative: sanitizeUnit(row.vtc_cumulative, 0, 1_000_000, 0),
    vtc_required: sanitizeUnit(row.vtc_required, 1, 1_000_000, 2000),
    eligible: row.eligible === true,
  };
}

export function resolvePhaseTier(value: unknown): PhaseTier {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const tier = Math.trunc(parsed);
  if (tier < 1) return 1;
  if (tier > 5) return 5;
  return tier as PhaseTier;
}

export function cosmeticPreferencesToCssVars(
  prefs: VerifiedCustomPreferences,
): Record<string, string> {
  const { theme, layout } = prefs;
  const glow = theme.ambientGlowOpacity;

  return {
    "--meccafit-magma-core": theme.magmaCore,
    "--meccafit-solar-gold": theme.solarGold,
    "--meccafit-ambient-glow": String(glow),
    "--meccafit-panel-blur": `${theme.panelBlurPx}px`,
    "--meccafit-portal-padding-scale": String(layout.portalPaddingScale),
    "--meccafit-ambient-gradient": `radial-gradient(circle at 50% 38%, rgba(245,158,11,${glow}), rgba(0,0,0,0.82) 48%, #000 82%)`,
  };
}
