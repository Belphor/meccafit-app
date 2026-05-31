"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildCalorPayloadFingerprint,
  CALOR_LEVEL_LABELS,
  GLOBAL_THERMAL_RING_CLASS,
  PURITY_PENALTY_THRESHOLD,
  resolveNivelTermicoGlobal,
  type MuscleCalorLevel,
  type MuscleCalorRow,
} from "@/components/evolution/human-body-constants";
import {
  EVOLUTION_AVATAR_UPDATED_EVENT,
  getLocalAvatarPath,
} from "@/services/local-storage";

type PremiumAvatarProps = {
  indiceIgnicao: number;
  calorRows: MuscleCalorRow[];
  nivelTermicoGlobal?: MuscleCalorLevel | null;
  profileName?: string | null;
  /** URL remota opcional (ex.: auth provider); local storage tem prioridade. */
  profilePhotoUrl?: string | null;
  className?: string;
};

const FLASH_ANIMATION = "animate-[flash_1.4s_ease-in-out]";
const FLASH_DURATION_MS = 1400;

function resolveProfileInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "MF";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function PremiumAvatar({
  indiceIgnicao,
  calorRows,
  nivelTermicoGlobal,
  profileName,
  profilePhotoUrl,
  className = "",
}: PremiumAvatarProps) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const fingerprintRef = useRef("");

  const nivelGlobal = useMemo(
    () => nivelTermicoGlobal ?? resolveNivelTermicoGlobal(indiceIgnicao, calorRows),
    [calorRows, indiceIgnicao, nivelTermicoGlobal],
  );

  const isFrozen = useMemo(() => calorRows.some((row) => row.is_frozen), [calorRows]);
  const purityDegraded = indiceIgnicao < PURITY_PENALTY_THRESHOLD;
  const ringClass = GLOBAL_THERMAL_RING_CLASS[nivelGlobal];
  const initials = resolveProfileInitials(profileName);

  const refreshPhoto = useCallback(async () => {
    const localPath = await getLocalAvatarPath();
    setPhotoSrc(localPath ?? profilePhotoUrl ?? null);
  }, [profilePhotoUrl]);

  useEffect(() => {
    void refreshPhoto();
  }, [refreshPhoto]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => {
      void refreshPhoto();
    };

    window.addEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(EVOLUTION_AVATAR_UPDATED_EVENT, handleUpdate);
  }, [refreshPhoto]);

  useEffect(() => {
    const fingerprint = buildCalorPayloadFingerprint(calorRows, indiceIgnicao);
    if (!fingerprintRef.current) {
      fingerprintRef.current = fingerprint;
      return;
    }
    if (fingerprintRef.current === fingerprint) return;

    fingerprintRef.current = fingerprint;
    setFlashActive(true);
    const timer = window.setTimeout(() => setFlashActive(false), FLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [calorRows, indiceIgnicao]);

  return (
    <div
      className={`flex flex-col items-center sm:items-end ${className}`}
      aria-label="Foto de perfil com anel térmico"
    >
      <div
        className={`relative rounded-full p-1 transition-[filter,opacity] duration-300 ${ringClass} ${
          flashActive ? FLASH_ANIMATION : ""
        } ${isFrozen ? "opacity-75" : ""}`}
      >
        <div
          className={`relative h-20 w-20 overflow-hidden rounded-full bg-neutral-950 sm:h-24 sm:w-24 ${
            purityDegraded ? "saturate-[0.3] contrast-125" : ""
          } ${isFrozen ? "grayscale" : ""}`}
        >
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- src pode ser blob:// ou capacitor://
            <img
              src={photoSrc}
              alt={profileName?.trim() ? `Foto de ${profileName.trim()}` : "Foto de perfil"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-cyan-950/40">
              <span className="font-mono text-lg font-bold tracking-[0.12em] text-cyan-200/85 sm:text-xl">
                {initials}
              </span>
              <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-neutral-500">
                Perfil
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
      </div>

      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-amber-200/75 sm:text-right">
        Nível global · {CALOR_LEVEL_LABELS[nivelGlobal]}
      </p>

      {isFrozen ? (
        <p className="mt-1 text-center text-[9px] uppercase tracking-[0.14em] text-cyan-300/80 sm:text-right">
          Congelamento parcial
        </p>
      ) : null}

      {purityDegraded ? (
        <p className="mt-1 text-center text-[9px] uppercase tracking-[0.14em] text-amber-500/70 sm:text-right">
          Pureza da Fênix baixa
        </p>
      ) : null}
    </div>
  );
}
