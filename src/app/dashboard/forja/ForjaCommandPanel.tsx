"use client";

import { memo, useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { ForjaDietBlueprintForm } from "@/components/forjador/forja-diet-blueprint-form";
import {
  FORJA_COMMAND_INNER,
  FORJA_EMPTY_STATE,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import {
  EMPTY_PRESCRIPTION_DRAFT,
  type ForjaBondedAthlete,
  type ForjaPrescriptionDraft,
} from "@/lib/forja-dashboard";
import { syncForjaPersonalPrescription } from "@/lib/forja-prescription-sync";
import { resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import { CLIENT_TRAINING_MUSCLE_GROUPS } from "@/lib/training-week";

type ForjaCommandPanelProps = {
  athlete: ForjaBondedAthlete | null;
};

type CommandPhase = "idle" | "syncing" | "success" | "error";

function formatBondDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ForjaCommandPanelComponent({ athlete }: ForjaCommandPanelProps) {
  const [prescription, setPrescription] = useState<ForjaPrescriptionDraft>(EMPTY_PRESCRIPTION_DRAFT);
  const [phase, setPhase] = useState<CommandPhase>("idle");
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  const handleFieldChange = useCallback(
    (field: keyof ForjaPrescriptionDraft) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setPrescription((current) => ({ ...current, [field]: event.target.value }));
        setPhase("idle");
        setCommandMessage(null);
      },
    [],
  );

  const handlePrescribeSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!athlete) return;

      setPhase("syncing");
      setCommandMessage(null);

      const result = await syncForjaPersonalPrescription(athlete, prescription);

      if (!result.ok) {
        setPhase("error");
        setCommandMessage(result.message);
        return;
      }

      setPhase("success");
      setCommandMessage(
        FORJA_COPY.prescription.success(
          athlete.displayName,
          prescription.series || "3",
          prescription.repeticoes,
          prescription.peso,
          prescription.exercicio.trim(),
        ),
      );
      setPrescription((current) => ({
        ...EMPTY_PRESCRIPTION_DRAFT,
        grupoMuscular: current.grupoMuscular,
        descansoPadraoSeg: current.descansoPadraoSeg,
      }));
    },
    [athlete, prescription],
  );

  if (!athlete) {
    return (
      <div className={FORJA_EMPTY_STATE}>
        <p className={FORJA_SECTION_CHIP}>Prescrição</p>
        <p className={`${FORJA_META} mt-3 max-w-md`}>{FORJA_COPY.selectAthlete}</p>
      </div>
    );
  }

  const thermal = resolveForjaThermalStyle(athlete.phaseTier);
  const phaseLabel =
    PHASE_TIER_LABELS[athlete.phaseTier as keyof typeof PHASE_TIER_LABELS] ?? thermal.label;
  const isSyncing = phase === "syncing";

  return (
    <section aria-label={`Prescrição · ${athlete.displayName}`}>
      <header className="border-b border-zinc-800/80 pb-4">
        <p className={FORJA_SECTION_CHIP}>Atleta seleccionado</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{athlete.displayName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span
            className={`rounded-md border px-2 py-0.5 font-medium ${resolveForjaChipClass(athlete.phaseTier)}`}
          >
            {thermal.label}
          </span>
          <span>
            Fase {athlete.phaseTier} · {phaseLabel}
          </span>
          <span
            className={
              athlete.hasVipBond
                ? "rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-emerald-300"
                : "rounded border border-zinc-700/80 bg-zinc-900/60 px-2 py-0.5 text-zinc-400"
            }
          >
            {athlete.hasVipBond ? FORJA_COPY.athleteVipBadge : FORJA_COPY.athleteStandardBadge}
          </span>
          {athlete.hasVipBond ? (
            <span className="text-zinc-400">VIP desde {formatBondDate(athlete.bondedAt)}</span>
          ) : null}
        </div>
        {athlete.lineageName ? (
          <p className={`${FORJA_META} mt-2`}>Linhagem · {athlete.lineageName}</p>
        ) : null}
        {athlete.forgerName ? (
          <p className={`${FORJA_META} mt-1`}>Personal · {athlete.forgerName}</p>
        ) : null}
      </header>

      <form
        onSubmit={(event) => void handlePrescribeSubmit(event)}
        className={`${FORJA_COMMAND_INNER} mt-4`}
      >
        <p className={FORJA_SECTION_CHIP}>Treino · todos os atletas</p>
        <h3 className="text-base font-medium text-zinc-100">{FORJA_COPY.prescription.title}</h3>
        <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.prescription.hint}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="forja-exercicio" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.exercise}
            </label>
            <input
              id="forja-exercicio"
              type="text"
              value={prescription.exercicio}
              onChange={handleFieldChange("exercicio")}
              placeholder="Ex.: Supino reto"
              className={FORJA_INPUT}
              autoComplete="off"
              disabled={isSyncing}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="forja-grupo" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.muscleGroup}
            </label>
            <select
              id="forja-grupo"
              value={prescription.grupoMuscular}
              onChange={handleFieldChange("grupoMuscular")}
              className={FORJA_INPUT}
              disabled={isSyncing}
            >
              {CLIENT_TRAINING_MUSCLE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="forja-peso" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.weight}
            </label>
            <input
              id="forja-peso"
              type="number"
              inputMode="decimal"
              min={1}
              max={9999.99}
              step={0.5}
              value={prescription.peso}
              onChange={handleFieldChange("peso")}
              placeholder="60"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
          </div>

          <div>
            <label htmlFor="forja-repeticoes" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.reps}
            </label>
            <input
              id="forja-repeticoes"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={prescription.repeticoes}
              onChange={handleFieldChange("repeticoes")}
              placeholder="12"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
          </div>

          <div>
            <label htmlFor="forja-series" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.sets}
            </label>
            <input
              id="forja-series"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={prescription.series}
              onChange={handleFieldChange("series")}
              placeholder="3"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
          </div>

          <div>
            <label htmlFor="forja-descanso-ex" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.restExercise}
            </label>
            <input
              id="forja-descanso-ex"
              type="number"
              inputMode="numeric"
              min={15}
              max={600}
              value={prescription.descansoSegundos}
              onChange={handleFieldChange("descansoSegundos")}
              placeholder="90"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="forja-descanso-padrao" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.restDefault}
            </label>
            <input
              id="forja-descanso-padrao"
              type="number"
              inputMode="numeric"
              min={15}
              max={600}
              value={prescription.descansoPadraoSeg}
              onChange={handleFieldChange("descansoPadraoSeg")}
              placeholder="90"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
            <p className={`${FORJA_META} mt-1.5`}>{FORJA_COPY.prescription.restHint}</p>
          </div>
        </div>

        <div className="mt-5">
          <button type="submit" className={FORJA_PRIMARY_BUTTON} disabled={isSyncing}>
            {isSyncing ? FORJA_COPY.prescription.submitting : FORJA_COPY.prescription.submit}
          </button>
        </div>
      </form>

      {commandMessage ? (
        <p
          role={phase === "error" ? "alert" : "status"}
          className={phase === "error" ? FORJA_FEEDBACK_ERROR : FORJA_FEEDBACK_OK}
        >
          {commandMessage}
        </p>
      ) : null}

      {athlete.hasVipBond ? (
        <ForjaDietBlueprintForm athlete={athlete} />
      ) : (
        <div className={`${FORJA_COMMAND_INNER} mt-8 border-t border-zinc-800/80 pt-6`}>
          <p className={FORJA_SECTION_CHIP}>Dieta · exclusivo VIP</p>
          <h3 className="text-base font-medium text-zinc-400">{FORJA_COPY.diet.title}</h3>
          <p className={`${FORJA_META} mt-2`}>{FORJA_COPY.diet.lockedHint}</p>
        </div>
      )}
    </section>
  );
}

export const ForjaCommandPanel = memo(ForjaCommandPanelComponent);
