"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCalorPayloadFingerprint,
  CALOR_LEVEL_LABELS,
  phaseTierToThermalLevel,
  PURITY_PENALTY_THRESHOLD,
  type MuscleCalorRow,
} from "@/components/evolution/human-body-constants";
import {
  EVOLUTION_AVATAR_UPDATED_EVENT,
  getLocalAvatarPath,
  type EvolutionAvatarUpdatedDetail,
} from "@/services/local-storage";
import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";

/** Cores das camadas do anel da Evolução (individual, tons cinza a dourado) */
export const EVOLUTION_TIER_RING_COLORS: Record<PhaseTier, string> = {
  1: "#6b7280",
  2: "#fb923c",
  3: "#f97316",
  4: "#ef4444",
  5: "#FFD700",
};

import {
  buildEvolutionAvatarRing,
  resolveEvolutionRingGlow,
} from "@/components/evolution/evolution-avatar-rings";

type FenixEvolutionAvatarProps = {
  userId: string;
  indiceIgnicao: number;
  calorRows: MuscleCalorRow[];
  phaseTier?: PhaseTier;
  vtc30dKg?: number;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
  className?: string;
  /** Destaque de celebração ao subir de fase na Chama Acumulada */
  tierLevelUpActive?: boolean;
  purityPenaltyActive?: boolean;
};

const FLASH_ANIMATION = "animate-[flash_1.4s_ease-in-out]";
const TIER_UP_ANIMATION = "animate-[evolution-tier-up_2.2s_ease-out]";
const FLASH_DURATION_MS = 1400;
const TIER_UP_DURATION_MS = 2200;

function resolveProfileInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "MF";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function FenixEvolutionAvatar({
  userId,
  indiceIgnicao,
  calorRows,
  phaseTier = 1,
  vtc30dKg = 0,
  profileName,
  profilePhotoUrl,
  className = "",
  tierLevelUpActive = false,
  purityPenaltyActive,
}: FenixEvolutionAvatarProps) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [tierUpActive, setTierUpActive] = useState(false);
  const fingerprintRef = useRef("");
  const prevTierRef = useRef<PhaseTier | null>(null);

  const tier = Math.min(5, Math.max(1, Math.round(phaseTier))) as PhaseTier;
  const thermalFromPhase = phaseTierToThermalLevel(tier);
  const ringGlow = resolveEvolutionRingGlow(tier);

  const isFrozen = useMemo(() => calorRows.some((row) => row.is_frozen), [calorRows]);
  const purityDegraded =
    purityPenaltyActive ?? indiceIgnicao < PURITY_PENALTY_THRESHOLD;
  const initials = resolveProfileInitials(profileName);
  const hasCosmicPulse = tier >= 5;

  const refreshPhoto = useCallback(async () => {
    const localPath = await getLocalAvatarPath(userId);
    setPhotoSrc(localPath ?? profilePhotoUrl ?? null);
  }, [profilePhotoUrl, userId]);

  useEffect(() => {
    let cancelled = false;

    void getLocalAvatarPath(userId).then((localPath) => {
      if (!cancelled) {
        setPhotoSrc(localPath ?? profilePhotoUrl ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profilePhotoUrl, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<EvolutionAvatarUpdatedDetail>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      void refreshPhoto();
    };

    window.addEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, handleUpdate);
  }, [refreshPhoto, userId]);

  useEffect(() => {
    if (prevTierRef.current !== null && tier > prevTierRef.current) {
      const startTimer = window.setTimeout(() => setTierUpActive(true), 0);
      const endTimer = window.setTimeout(() => setTierUpActive(false), TIER_UP_DURATION_MS);
      prevTierRef.current = tier;
      return () => {
        window.clearTimeout(startTimer);
        window.clearTimeout(endTimer);
      };
    }
    prevTierRef.current = tier;
    return undefined;
  }, [tier]);

  useEffect(() => {
    const fingerprint = buildCalorPayloadFingerprint(calorRows, indiceIgnicao, tier, vtc30dKg);
    if (!fingerprintRef.current) {
      fingerprintRef.current = fingerprint;
      return;
    }
    if (fingerprintRef.current === fingerprint) return;

    fingerprintRef.current = fingerprint;
    const startTimer = window.setTimeout(() => setFlashActive(true), 0);
    const endTimer = window.setTimeout(() => setFlashActive(false), FLASH_DURATION_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [calorRows, indiceIgnicao, tier, vtc30dKg]);

  const ringAnimation = tierUpActive || tierLevelUpActive ? TIER_UP_ANIMATION : flashActive ? FLASH_ANIMATION : "";

  const avatarInner = (
    <div
      className={`relative h-20 w-20 overflow-hidden rounded-full bg-neutral-950 ring-1 ring-orange-500/10 sm:h-24 sm:w-24 ${
        purityDegraded ? "saturate-[0.45] contrast-110" : ""
      } ${isFrozen ? "grayscale" : ""}`}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={profileName?.trim() ? `Foto de ${profileName.trim()}` : "Foto de perfil"}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-orange-950/35">
          <span className="font-mono text-lg font-bold tracking-[0.12em] text-amber-200/85 sm:text-xl">
            {initials}
          </span>
          <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-neutral-500">
            Linhagem
          </span>
        </div>
      )}

      {isFrozen ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-cyan-400/25 bg-cyan-950/25 backdrop-blur-[1px]"
          aria-hidden
        />
      ) : null}
    </div>
  );

  return (
    <div
      className={`flex flex-col items-center sm:items-end ${className}`}
      aria-label="Avatar de evolução com anéis da linhagem"
    >
      <div
        className={`relative inline-flex rounded-full transition-[filter,opacity] duration-300 ${ringAnimation} ${
          isFrozen ? "opacity-75" : ""
        } ${hasCosmicPulse ? "animate-[plutus-gold-pulse_2.4s_ease-in-out_infinite]" : ""}`}
  style={ringGlow ? { boxShadow: ringGlow } : undefined}
      >
        {buildEvolutionAvatarRing(tier, avatarInner)}
      </div>

      <p className="mt-2 flex max-w-[14rem] flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100 sm:max-w-none sm:justify-end sm:text-right">
        {profileName?.trim() ? (
          <>
            <span className="max-w-[9rem] truncate normal-case tracking-normal text-amber-50/95">
              {profileName.trim()}
            </span>
            <span className="font-normal text-neutral-600" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span>{PHASE_TIER_LABELS[tier]}</span>
      </p>
      <p className="mt-0.5 text-center font-mono text-[10px] tabular-nums text-neutral-300 sm:text-right">
        {Math.round(vtc30dKg).toLocaleString("pt-BR")} kg · últimos 30 dias
      </p>
      <p className="mt-0.5 text-center text-[9px] uppercase tracking-[0.1em] text-neutral-500 sm:text-right">
        {tier} {tier === 1 ? "camada" : "camadas"} · {CALOR_LEVEL_LABELS[thermalFromPhase]}
      </p>

      {isFrozen ? (
        <p className="mt-1 text-center text-[9px] uppercase tracking-[0.14em] text-cyan-300/80 sm:text-right">
          Congelamento parcial
        </p>
      ) : null}

      {purityDegraded ? (
        <p className="mt-1 text-center text-[9px] uppercase tracking-[0.14em] text-amber-500/70 sm:text-right">
          Ritmo da Fênix abaixo de 50%
        </p>
      ) : null}
    </div>
  );
}
