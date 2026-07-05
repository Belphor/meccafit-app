"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { FenixEvolutionAvatar } from "@/components/evolution/fenix-evolution-avatar";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_TAP_TARGET,
  EVOLUTION_HINT,
} from "@/lib/dashboard-config";
import type { PhaseTier } from "@/lib/dashboard-config";
import { LoreEm } from "@/lib/lore-emphasis";
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import {
  notifyProfileDisplayNameUpdated,
  PROFILE_DISPLAY_NAME_UPDATED_EVENT,
  readLocalProfileDisplayName,
  writeLocalProfileDisplayName,
} from "@/lib/profile-display-name";
import {
  confirmProfileIdentity,
  parseProfileSexo,
  type ProfileSexo,
} from "@/lib/profile-identity";
import { saveLocalAvatar } from "@/services/local-storage";
import { syncComunidadeAvatarFromFile } from "@/lib/comunidade-avatar";

type ProfileLinhagemIdentityProps = {
  userId: string;
  serverName?: string | null;
  serverSexo?: ProfileSexo | null;
  identidadeConfirmada?: boolean;
  onIdentityConfirmed?: () => void;
  initialCalorRows?: MuscleCalorRow[];
  initialIgnicao?: number;
};

const SEXO_OPTIONS: { value: ProfileSexo; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];

export function ProfileLinhagemIdentity({
  userId,
  serverName,
  serverSexo = null,
  identidadeConfirmada = false,
  onIdentityConfirmed,
  initialCalorRows = [],
  initialIgnicao = 0,
}: ProfileLinhagemIdentityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(
    () => readLocalProfileDisplayName(userId) ?? serverName?.trim() ?? "",
  );
  const [sexo, setSexo] = useState<ProfileSexo | null>(serverSexo);
  const [confirmed, setConfirmed] = useState(identidadeConfirmada);
  const [calorRows, setCalorRows] = useState<MuscleCalorRow[]>(initialCalorRows);
  const [indiceIgnicao, setIndiceIgnicao] = useState(initialIgnicao);
  const [phaseTier, setPhaseTier] = useState<PhaseTier>(1);
  const [vtc30dKg, setVtc30dKg] = useState(0);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [identityFeedback, setIdentityFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setConfirmed(identidadeConfirmada);
  }, [identidadeConfirmada]);

  useEffect(() => {
    if (serverSexo) setSexo(serverSexo);
  }, [serverSexo]);

  useEffect(() => {
    const onNameUpdate = () => {
      setDisplayName(readLocalProfileDisplayName(userId) ?? serverName?.trim() ?? "");
    };
    window.addEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, onNameUpdate);
    return () => window.removeEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, onNameUpdate);
  }, [serverName, userId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await fetchMuscularEvolutionPayload();
        if (cancelled) return;
        setCalorRows(payload.calorRows);
        setIndiceIgnicao(payload.indice_ignicao);
        setVtc30dKg(payload.vtc_30d_kg ?? 0);
        setPhaseTier(
          Math.min(5, Math.max(1, Math.round(payload.phase_tier ?? 1))) as PhaseTier,
        );
      } catch {
        if (initialCalorRows.length > 0) {
          setCalorRows(initialCalorRows);
          setIndiceIgnicao(initialIgnicao);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCalorRows, initialIgnicao]);

  const resolvedName = useMemo(
    () => displayName.trim() || serverName?.trim() || "Membro da Linhagem",
    [displayName, serverName],
  );

  const canConfirm =
    !confirmed &&
    displayName.trim().length >= 2 &&
    Boolean(sexo) &&
    !isSubmitting;

  const handleConfirmIdentity = useCallback(async () => {
    if (!sexo || confirmed) return;

    setIsSubmitting(true);
    setIdentityFeedback(null);

    try {
      await confirmProfileIdentity(userId, displayName, sexo);
      writeLocalProfileDisplayName(userId, displayName.trim());
      notifyProfileDisplayNameUpdated();
      setConfirmed(true);
      setIdentityFeedback({
        message:
          "Identidade selada. Seu nome é único na linhagem e o ranking mensal passa a considerar seu gênero.",
        tone: "success",
      });
      onIdentityConfirmed?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível confirmar a identidade.";
      setIdentityFeedback({ message, tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmed, displayName, onIdentityConfirmed, sexo, userId]);

  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setPhotoFeedback(null);
      try {
        await saveLocalAvatar(userId, file);
        const sync = await syncComunidadeAvatarFromFile(userId, file);
        if (sync.error) {
          setPhotoFeedback(
            "Foto salva neste dispositivo. A miniatura da comunidade será sincronizada quando o servidor estiver atualizado.",
          );
          return;
        }
        setPhotoFeedback("Foto salva no dispositivo e miniatura enviada para a comunidade.");
      } catch {
        setPhotoFeedback("Não foi possível salvar a foto.");
      }
    },
    [userId],
  );

  return (
    <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
      <DashboardPanelHeader chip="Identidade" meta="Perfil" />

      <div className={`${DASHBOARD_INNER_FRAME} mt-4 flex flex-col items-center gap-5 p-4 sm:flex-row sm:items-start sm:p-5`}>
        <FenixEvolutionAvatar
          userId={userId}
          indiceIgnicao={indiceIgnicao}
          calorRows={calorRows}
          phaseTier={phaseTier}
          vtc30dKg={vtc30dKg}
          profileName={resolvedName}
          className="mx-auto sm:mx-0"
        />

        <div className="w-full min-w-0 flex-1 space-y-4">
          {!confirmed ? (
            <p className={EVOLUTION_HINT}>
              Antes de forjar nos duelos e nos rankings, declare quem você é. O{" "}
              <LoreEm>nome deve ser único</LoreEm> na linhagem, e o{" "}
              <LoreEm>gênero</LoreEm> define em qual arena mensal você compete: masculina ou
              feminina.
            </p>
          ) : (
            <p className={EVOLUTION_HINT}>
              Nome e foto ficam no seu dispositivo. O nome e uma miniatura vão ao servidor para
              duelos, rankings e mural. O anel reflete a fase da{" "}
              <LoreEm>Chama Acumulada</LoreEm>.
            </p>
          )}

          <label className="block">
            <span className="text-xs font-medium text-neutral-400">Nome exibido</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={serverName?.trim() || "Seu nome na linhagem"}
              className="mt-2 w-full rounded-xl border border-orange-500/20 bg-black/50 px-3 py-2.5 text-sm text-amber-50 outline-none transition focus:border-amber-500/35"
              maxLength={48}
              disabled={confirmed}
            />
          </label>

          <fieldset className="block">
            <legend className="text-xs font-medium text-neutral-400">Gênero na arena</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SEXO_OPTIONS.map((option) => {
                const selected = sexo === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={confirmed}
                    onClick={() => setSexo(option.value)}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      selected
                        ? "border-amber-400/45 bg-amber-950/40 text-amber-100"
                        : "border-orange-500/20 bg-neutral-950/70 text-neutral-400 hover:border-amber-500/30"
                    } ${confirmed ? "cursor-default opacity-70" : ""}`}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {!confirmed ? (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void handleConfirmIdentity()}
              className={`${DASHBOARD_TAP_TARGET} w-full rounded-full border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition ${
                canConfirm
                  ? "anima-acender-linhagem-cta"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-500"
              }`}
            >
              {isSubmitting ? "Selando identidade…" : "Confirmar nome e gênero"}
            </button>
          ) : null}

          {identityFeedback ? (
            <p
              className={`text-[11px] leading-relaxed ${
                identityFeedback.tone === "success" ? "text-emerald-200/85" : "text-red-300/90"
              }`}
            >
              {identityFeedback.message}
            </p>
          ) : null}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={(event) => void handlePhotoChange(event)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/25 bg-neutral-950/70 px-4 py-2 text-xs font-semibold text-amber-100`}
            >
              Inserir foto do dispositivo
            </button>
            {photoFeedback ? (
              <p className="mt-2 text-[11px] text-emerald-200/85">{photoFeedback}</p>
            ) : null}
          </div>
        </div>
      </div>
    </BrasaVivaCard>
  );
}

export { parseProfileSexo };
