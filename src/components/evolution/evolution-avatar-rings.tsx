"use client";

import { type ReactNode } from "react";
import { EVOLUTION_TIER_RING_COLORS } from "@/components/evolution/fenix-evolution-avatar";
import type { PhaseTier } from "@/lib/dashboard-config";

function wrapEvolutionRingLayers(content: ReactNode, tier: PhaseTier): ReactNode {
  if (tier <= 1) return content;

  const colors: string[] = [];
  for (let layer = 2; layer <= tier; layer += 1) {
    colors.push(EVOLUTION_TIER_RING_COLORS[layer as PhaseTier]);
  }

  return colors.reduce<ReactNode>((node, color) => {
    return (
      <div
        className="rounded-full p-[3px] transition-shadow duration-500"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 16px ${color}66, 0 0 28px ${color}33`,
        }}
      >
        {node}
      </div>
    );
  }, content);
}

export function buildEvolutionAvatarRing(tier: PhaseTier, inner: ReactNode): ReactNode {
  return wrapEvolutionRingLayers(inner, tier);
}

export function resolveEvolutionRingGlow(tier: PhaseTier): string | undefined {
  if (tier <= 1) return undefined;
  const color = EVOLUTION_TIER_RING_COLORS[tier];
  return `0 0 24px ${color}55, 0 0 40px ${color}28`;
}
