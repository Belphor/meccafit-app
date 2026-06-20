import type { CSSProperties } from "react";
import { ALTAR_VTC_SESSION_TARGET_KG } from "@/lib/mock-data";

export type ChamaAltarTier = 0 | 1 | 2 | 3 | 4;

export const CHAMA_ALTAR_TIER_LABELS: Record<ChamaAltarTier, string> = {
  0: "Cinzas",
  1: "Faísca",
  2: "Brasa",
  3: "Labareda",
  4: "Incandescência",
};

/** Intensidade contínua 0–1+ para efeitos visuais graduais no card. */
export function resolveChamaAltarIntensity(vtcTotal: number): number {
  if (vtcTotal <= 0) return 0;
  return Math.min(1.25, vtcTotal / ALTAR_VTC_SESSION_TARGET_KG);
}

export function resolveChamaAltarTier(vtcTotal: number): ChamaAltarTier {
  const ratio = vtcTotal / ALTAR_VTC_SESSION_TARGET_KG;
  if (ratio <= 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.55) return 2;
  if (ratio < 0.9) return 3;
  return 4;
}

export function buildChamaAltarCardStyle(vtcTotal: number): CSSProperties {
  const intensity = resolveChamaAltarIntensity(vtcTotal);
  return {
    ["--chama-intensity" as string]: String(Math.min(1, intensity)),
  };
}
