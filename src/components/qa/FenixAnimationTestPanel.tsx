"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import { ThermalGravityRestorationFlash } from "@/components/dashboard/ThermalGravityRestorationFlash";
import {
  PlutusAvatar,
  IRIS_BORDER_CINTURAO,
  IRIS_BORDER_PILAR_COOP,
  IRIS_BORDER_REI_CHAMAS,
} from "@/components/comunidade/plutus-avatar";
import { FenixEvolutionAvatar } from "@/components/evolution/fenix-evolution-avatar";
import type { MuscleCalorRow } from "@/components/evolution/human-body-constants";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_TAP_TARGET,
  EVOLUTION_HINT,
} from "@/lib/dashboard-config";
import {
  dispatchFenixQaAnimation,
  FENIX_QA_ANIMATIONS,
  type FenixQaAnimationKind,
} from "@/lib/qa-animation-events";
import {
  applyLinhagemInactivityQaPreset,
  LINHAGEM_INACTIVITY_QA_PRESETS,
  describeLinhagemInactivityQaResult,
} from "@/lib/linhagem-inactivity-qa";
import {
  applyThermalGravityQaPreset,
  describeThermalGravityQaState,
  readThermalGravityQaOverride,
  THERMAL_GRAVITY_QA_PRESETS,
  THERMAL_GRAVITY_QA_UPDATED_EVENT,
} from "@/lib/thermal-gravity-qa";

const QA_MODE_KEY = "meccafit:qa-lab";

const PREVIEW_CALOR_ROWS: MuscleCalorRow[] = [
  {
    membro_principal: "PEITO",
    nivel_calculado: "BRASA",
    is_frozen: false,
    metrica_bruta: 72,
  },
];

function readQaModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(QA_MODE_KEY) === "on";
  } catch {
    return false;
  }
}

function writeQaModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(QA_MODE_KEY, "on");
    else window.localStorage.removeItem(QA_MODE_KEY);
  } catch {
    // quota / private mode
  }
}

export function isFenixQaLabEnabled(): boolean {
  return readQaModeEnabled();
}

type FenixAnimationTestPanelProps = {
  userId: string;
  profileName?: string | null;
  profilePhotoUrl?: string | null;
};

export function FenixAnimationTestPanel({
  userId,
  profileName,
  profilePhotoUrl,
}: FenixAnimationTestPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [showRestorationPreview, setShowRestorationPreview] = useState(false);
  const [avatarPreviewTier, setAvatarPreviewTier] = useState<4 | 3>(4);
  const [thermalQaSummary, setThermalQaSummary] = useState<string | null>(null);
  const [inactivityQaSummary, setInactivityQaSummary] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(readQaModeEnabled());
  }, []);

  useEffect(() => {
    const refreshThermal = () => {
      const override = readThermalGravityQaOverride();
      setThermalQaSummary(override ? describeThermalGravityQaState(override) : null);
    };
    refreshThermal();
    window.addEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, refreshThermal);
    return () => window.removeEventListener(THERMAL_GRAVITY_QA_UPDATED_EVENT, refreshThermal);
  }, []);

  const toggleLab = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      writeQaModeEnabled(next);
      return next;
    });
  }, []);

  const triggerThermalPreset = useCallback((presetId: string) => {
    const override = applyThermalGravityQaPreset(presetId);
    setThermalQaSummary(override ? describeThermalGravityQaState(override) : null);
  }, []);

  const triggerInactivityPreset = useCallback((presetId: string) => {
    const result = applyLinhagemInactivityQaPreset(presetId);
    if (result) setInactivityQaSummary(describeLinhagemInactivityQaResult(result));
  }, []);

  const trigger = useCallback((kind: FenixQaAnimationKind) => {
    if (kind === "restoration-flash") {
      setShowRestorationPreview(true);
    }
    dispatchFenixQaAnimation({ kind, tier: kind === "linhagem-level-up" ? 3 : avatarPreviewTier });
  }, [avatarPreviewTier]);

  const treinoAnimations = useMemo(
    () => FENIX_QA_ANIMATIONS.filter((item) => item.tab === "treino"),
    [],
  );
  const evolucaoAnimations = useMemo(
    () => FENIX_QA_ANIMATIONS.filter((item) => item.tab === "evolucao"),
    [],
  );

  return (
    <BrasaVivaCard as="section" variant="treino" className={DASHBOARD_PANEL_FRAME}>
      <DashboardPanelHeader chip="Laboratório QA" meta="Animações · sistemas · testes" />

      <ThermalGravityRestorationFlash
        active={showRestorationPreview}
        prominent
        onComplete={() => setShowRestorationPreview(false)}
      />

      <div className={`${DASHBOARD_INNER_FRAME} mt-4 space-y-5 p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={EVOLUTION_HINT}>
            Ative o laboratório para ver botões de teste nas abas Treino, Evolução e Comunidade.
            Não inclui a Anima FENYXIA (IA).
          </p>
          <button
            type="button"
            onClick={toggleLab}
            className={`${DASHBOARD_TAP_TARGET} shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${
              enabled
                ? "border-emerald-500/35 bg-emerald-950/30 text-emerald-100"
                : "border-amber-500/25 bg-neutral-950/70 text-amber-100"
            }`}
          >
            {enabled ? "Laboratório ativo" : "Ativar laboratório"}
          </button>
        </div>

        {enabled ? (
          <>
            <section
              aria-labelledby="qa-avatar-preview-title"
              className="rounded-xl border border-orange-500/15 bg-black/30 px-4 py-4"
            >
              <p id="qa-avatar-preview-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                Prévia · avatar da linhagem
              </p>
              <p className={`mt-2 ${EVOLUTION_HINT}`}>
                Flash = pulso laranja no anel quando o mapa muda. Subida de camada = brilho ao ganhar
                nova cor (Faísca → Brasa → Labareda → Fogo Cósmico).
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <FenixEvolutionAvatar
                  userId={userId}
                  indiceIgnicao={68}
                  calorRows={PREVIEW_CALOR_ROWS}
                  phaseTier={avatarPreviewTier}
                  vtc30dKg={8500}
                  profileName={profileName}
                  profilePhotoUrl={profilePhotoUrl}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => trigger("avatar-flash")}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100`}
                  >
                    Testar flash
                  </button>
                  <button
                    type="button"
                    onClick={() => trigger("avatar-tier-up")}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100`}
                  >
                    Testar subida de camada
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarPreviewTier((value) => (value === 4 ? 3 : 4))}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border border-neutral-700 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-neutral-400`}
                  >
                    Alternar fase ({avatarPreviewTier === 4 ? "Labareda" : "Brasa"})
                  </button>
                </div>
              </div>
            </section>

            <section aria-labelledby="qa-thermal-title">
              <p
                id="qa-thermal-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90"
              >
                Gravidade Térmica
              </p>
              <p className={`mt-2 ${EVOLUTION_HINT}`}>
                Cenários fictícios para o card da aba Evolução. Não alteram sua fase real no servidor.
                É um sistema diferente da inatividade de 30 dias.
              </p>
              {thermalQaSummary ? (
                <p className="mt-2 rounded-lg border border-orange-500/20 bg-orange-950/20 px-3 py-2 text-[11px] text-amber-100/90">
                  Ativo: {thermalQaSummary}
                </p>
              ) : null}
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {THERMAL_GRAVITY_QA_PRESETS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => triggerThermalPreset(item.id)}
                      className={`${DASHBOARD_TAP_TARGET} w-full rounded-xl border border-orange-500/15 bg-black/35 px-3 py-3 text-left hover:border-amber-500/30`}
                    >
                      <span className="text-sm font-medium text-amber-50">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">
                        {item.hint}
                      </span>
                      <span className="mt-2 block text-[10px] leading-relaxed text-amber-200/70">
                        {item.howTo}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="qa-inactivity-title">
              <p
                id="qa-inactivity-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90"
              >
                Inatividade da Linhagem
              </p>
              <p className={`mt-2 ${EVOLUTION_HINT}`}>
                Cenários fictícios do aviso ao ficar 30 dias sem abrir o app. &quot;Volta após 30
                dias&quot; anuncia a degradação por 8 segundos, ativa o aviso persistente e a
                degradação visual na aba Treino até concluir uma série.
              </p>
              {inactivityQaSummary ? (
                <p className="mt-2 rounded-lg border border-sky-500/20 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-100/90">
                  Último disparo: {inactivityQaSummary}
                </p>
              ) : null}
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {LINHAGEM_INACTIVITY_QA_PRESETS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => triggerInactivityPreset(item.id)}
                      className={`${DASHBOARD_TAP_TARGET} w-full rounded-xl border border-sky-500/15 bg-black/35 px-3 py-3 text-left hover:border-sky-400/30`}
                    >
                      <span className="text-sm font-medium text-amber-50">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">
                        {item.hint}
                      </span>
                      <span className="mt-2 block text-[10px] leading-relaxed text-amber-200/70">
                        {item.howTo}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="qa-treino-title">
              <p id="qa-treino-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                Aba Treino
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {treinoAnimations.map((item) => (
                  <li key={item.kind}>
                    <button
                      type="button"
                      onClick={() => trigger(item.kind)}
                      className={`${DASHBOARD_TAP_TARGET} w-full rounded-xl border border-orange-500/15 bg-black/35 px-3 py-3 text-left hover:border-amber-500/30`}
                    >
                      <span className="text-sm font-medium text-amber-50">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{item.hint}</span>
                      <span className="mt-2 block text-[10px] leading-relaxed text-amber-200/70">{item.howTo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="qa-evolucao-title">
              <p
                id="qa-evolucao-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90"
              >
                Aba Evolução
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {evolucaoAnimations.map((item) => (
                  <li key={item.kind}>
                    <button
                      type="button"
                      onClick={() => trigger(item.kind)}
                      className={`${DASHBOARD_TAP_TARGET} w-full rounded-xl border border-orange-500/15 bg-black/35 px-3 py-3 text-left hover:border-amber-500/30`}
                    >
                      <span className="text-sm font-medium text-amber-50">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{item.hint}</span>
                      <span className="mt-2 block text-[10px] leading-relaxed text-amber-200/70">{item.howTo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="qa-titulos-title"
              className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 px-4 py-4"
            >
              <p id="qa-titulos-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                Prévia · três anéis da comunidade
              </p>
              <p className={`mt-2 ${EVOLUTION_HINT}`}>
                Cinturão (rosa) · Rei das Chamas (roxo) · Pilar (dourado). Script de teste:{" "}
                <code className="text-amber-200/80">node scripts/set-test-comunidade-titles.mjs</code>
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <PlutusAvatar
                  name={profileName}
                  photoUrl={profilePhotoUrl}
                  temCinturaoDuelo
                  isReiDasChamas
                  isPilarCooperativo
                  size="lg"
                />
                <ul className={`space-y-1 ${EVOLUTION_HINT}`}>
                  <li style={{ color: IRIS_BORDER_CINTURAO }}>Camada 1 · Cinturão do duelo</li>
                  <li style={{ color: IRIS_BORDER_REI_CHAMAS }}>Camada 2 · Rei das Chamas</li>
                  <li style={{ color: IRIS_BORDER_PILAR_COOP }}>Camada 3 · Pilar cooperativo</li>
                </ul>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </BrasaVivaCard>
  );
}
