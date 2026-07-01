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
import { fetchMuscularEvolutionPayload } from "@/lib/muscular-evolution";
import {
  notifyProfileDisplayNameUpdated,
  PROFILE_DISPLAY_NAME_UPDATED_EVENT,
  readLocalProfileDisplayName,
  syncProfileDisplayNameToServer,
  writeLocalProfileDisplayName,
} from "@/lib/profile-display-name";
import { saveLocalAvatar } from "@/services/local-storage";
import { syncComunidadeAvatarFromFile } from "@/lib/comunidade-avatar";

type ProfileLinhagemIdentityProps = {
  userId: string;
  serverName?: string | null;
  initialCalorRows?: MuscleCalorRow[];
  initialIgnicao?: number;
};

export function ProfileLinhagemIdentity({
  userId,
  serverName,
  initialCalorRows = [],
  initialIgnicao = 0,
}: ProfileLinhagemIdentityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [calorRows, setCalorRows] = useState<MuscleCalorRow[]>(initialCalorRows);
  const [indiceIgnicao, setIndiceIgnicao] = useState(initialIgnicao);
  const [phaseTier, setPhaseTier] = useState<PhaseTier>(1);
  const [vtc30dKg, setVtc30dKg] = useState(0);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(readLocalProfileDisplayName(userId) ?? serverName?.trim() ?? "");
  }, [serverName, userId]);

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

  const persistName = useCallback(
    (value: string) => {
      setDisplayName(value);
      writeLocalProfileDisplayName(userId, value);
      notifyProfileDisplayNameUpdated();
    },
    [userId],
  );

  useEffect(() => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) return;

    const timer = window.setTimeout(() => {
      void syncProfileDisplayNameToServer(trimmed)
        .then(() => {
          setNameFeedback("Nome atualizado na comunidade e nos duelos.");
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Não foi possível sincronizar o nome.";
          setNameFeedback(message);
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [displayName]);

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
      <DashboardPanelHeader chip="Identidade" meta="Avatar · nome · miniatura comunidade" />

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
          <p className={EVOLUTION_HINT}>
            Nome e foto ficam no seu dispositivo. O nome e uma miniatura vão ao servidor para duelos,
            rankings e mural. O anel reflete a fase da Chama Acumulada.
          </p>

          <label className="block">
            <span className="text-xs font-medium text-neutral-400">Nome exibido</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => persistName(event.target.value)}
              placeholder={serverName?.trim() || "Seu nome na linhagem"}
              className="mt-2 w-full rounded-xl border border-orange-500/20 bg-black/50 px-3 py-2.5 text-sm text-amber-50 outline-none transition focus:border-amber-500/35"
              maxLength={48}
            />
            {nameFeedback ? (
              <p className="mt-2 text-[11px] text-emerald-200/85">{nameFeedback}</p>
            ) : null}
          </label>

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
