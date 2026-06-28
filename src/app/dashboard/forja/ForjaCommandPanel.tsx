"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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
  FORJA_TAB_ACTIVE,
  FORJA_TAB_IDLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import {
  EMPTY_PRESCRIPTION_DRAFT,
  type ForjaBondedAthlete,
  type ForjaPrescriptionDraft,
} from "@/lib/forja-dashboard";
import { syncForjaPersonalPrescription, fetchPlanilhaMusclesForDay } from "@/lib/forja-prescription-sync";
import { fetchForjadorTreinoConfigClient } from "@/lib/forjador-prescriptions";
import { resolveForjaChipClass, resolveForjaThermalStyle } from "@/lib/forja-phase-styles";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";
import {
  formatRepsPerSet,
  normalizeRepsPerSetDraft,
  PRESCRIPTION_PROGRESSION_OPTIONS,
  type PrescriptionProgressionId,
} from "@/lib/prescription-progression";
import { MUSCLE_GROUP_LABELS, MAX_PLANILHA_GRUPOS_POR_DIA, TRAINING_MUSCLE_GROUPS, WEEKDAY_LABELS, type TrainingMuscleGroup, type WeekdayIndex } from "@/lib/training-week";

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

function resizeRepsPerSeries(current: string[], seriesCount: number): string[] {
  const safeSeries = Number.isFinite(seriesCount) && seriesCount >= 1 ? seriesCount : 1;
  const next = current.slice(0, safeSeries);
  while (next.length < safeSeries) {
    next.push(next[next.length - 1] ?? "12");
  }
  return next;
}

const PLANILHA_DAYS: WeekdayIndex[] = [1, 2, 3, 4, 5, 6];

function ForjaCommandPanelComponent({ athlete }: ForjaCommandPanelProps) {
  const [prescription, setPrescription] = useState<ForjaPrescriptionDraft>(EMPTY_PRESCRIPTION_DRAFT);
  const [phase, setPhase] = useState<CommandPhase>("idle");
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  const seriesCount = useMemo(() => {
    const parsed = Number.parseInt(prescription.series.trim() || "3", 10);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 20) : 3;
  }, [prescription.series]);

  const repRows = useMemo(
    () => resizeRepsPerSeries(prescription.repeticoesPorSerie, seriesCount),
    [prescription.repeticoesPorSerie, seriesCount],
  );

  useEffect(() => {
    if (!athlete) {
      setPrescription(EMPTY_PRESCRIPTION_DRAFT);
      return;
    }

    void fetchForjadorTreinoConfigClient(athlete.clientId).then((config) => {
      setPrescription({
        ...EMPTY_PRESCRIPTION_DRAFT,
        descansoPadraoSeg: String(config.descansoPadraoSeg),
        cardioMetaMinutos: String(config.cardioMetaMinutos),
      });
    });
  }, [athlete?.clientId]);

  useEffect(() => {
    if (!athlete) return;

    void fetchPlanilhaMusclesForDay(athlete.clientId, prescription.diaSemana).then((muscles) => {
      setPrescription((current) => {
        if (current.diaSemana !== prescription.diaSemana) return current;
        return { ...current, musculosDoDia: muscles.length > 0 ? muscles : current.musculosDoDia };
      });
    });
  }, [athlete?.clientId, prescription.diaSemana]);

  const toggleDayMuscle = useCallback((muscle: TrainingMuscleGroup) => {
    setPrescription((current) => {
      const selected = new Set(current.musculosDoDia);
      if (selected.has(muscle)) {
        selected.delete(muscle);
      } else {
        if (selected.size >= MAX_PLANILHA_GRUPOS_POR_DIA) return current;
        selected.add(muscle);
      }
      return { ...current, musculosDoDia: [...selected] };
    });
    setPhase("idle");
    setCommandMessage(null);
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof ForjaPrescriptionDraft) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setPrescription((current) => {
          if (field === "series") {
            const nextSeries = Number.parseInt(value.trim() || "3", 10);
            return {
              ...current,
              series: value,
              repeticoesPorSerie: resizeRepsPerSeries(current.repeticoesPorSerie, nextSeries),
            };
          }
          if (field === "diaSemana") {
            const day = Number.parseInt(value, 10);
            if (!Number.isFinite(day) || day < 1 || day > 6) return current;
            return { ...current, diaSemana: day as WeekdayIndex, musculosDoDia: [] };
          }
          if (field === "grupoMuscular") {
            const grupo = value as TrainingMuscleGroup;
            const musculosDoDia = current.musculosDoDia.includes(grupo)
              ? current.musculosDoDia
              : current.musculosDoDia.length < MAX_PLANILHA_GRUPOS_POR_DIA
                ? [...current.musculosDoDia, grupo]
                : current.musculosDoDia;
            return { ...current, grupoMuscular: value, musculosDoDia };
          }
          return { ...current, [field]: value };
        });
        setPhase("idle");
        setCommandMessage(null);
      },
    [],
  );

  const handleRepPerSetChange = useCallback((index: number, rawValue: string) => {
    setPrescription((current) => {
      const next = resizeRepsPerSeries(current.repeticoesPorSerie, seriesCount);
      next[index] = rawValue;
      return { ...current, repeticoesPorSerie: next };
    });
    setPhase("idle");
    setCommandMessage(null);
  }, [seriesCount]);

  const toggleFailureForSet = useCallback((index: number) => {
    setPrescription((current) => {
      const next = resizeRepsPerSeries(current.repeticoesPorSerie, seriesCount);
      next[index] = next[index]?.toUpperCase() === "FALHA" ? "12" : "FALHA";
      return { ...current, repeticoesPorSerie: next };
    });
    setPhase("idle");
    setCommandMessage(null);
  }, [seriesCount]);

  const toggleProgression = useCallback((id: PrescriptionProgressionId) => {
    setPrescription((current) => {
      const selected = new Set(current.progressaoAlternativas);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return {
        ...current,
        progressaoAlternativas: PRESCRIPTION_PROGRESSION_OPTIONS.map((item) => item.id).filter((item) =>
          selected.has(item),
        ),
      };
    });
    setPhase("idle");
    setCommandMessage(null);
  }, []);

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

      const repsSummary = formatRepsPerSet(
        normalizeRepsPerSetDraft(prescription.repeticoesPorSerie, seriesCount),
      );

      setPhase("success");
      setCommandMessage(
        FORJA_COPY.prescription.success(
          athlete.displayName,
          WEEKDAY_LABELS[prescription.diaSemana],
          prescription.series || "3",
          repsSummary,
          prescription.exercicio.trim(),
        ),
      );
      setPrescription((current) => ({
        ...EMPTY_PRESCRIPTION_DRAFT,
        diaSemana: current.diaSemana,
        musculosDoDia: current.musculosDoDia,
        grupoMuscular: current.grupoMuscular,
        descansoPadraoSeg: current.descansoPadraoSeg,
      }));
    },
    [athlete, prescription, seriesCount],
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
        <p className={FORJA_SECTION_CHIP}>Cliente seleccionado</p>
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
        <p className={FORJA_SECTION_CHIP}>Treino</p>
        <h3 className="text-base font-medium text-zinc-100">{FORJA_COPY.prescription.title}</h3>
        <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.prescription.hint}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="forja-dia-semana" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.trainingDay}
            </label>
            <select
              id="forja-dia-semana"
              value={prescription.diaSemana}
              onChange={handleFieldChange("diaSemana")}
              className={FORJA_INPUT}
              disabled={isSyncing}
            >
              {PLANILHA_DAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
            <p className={`${FORJA_META} mt-1.5`}>{FORJA_COPY.prescription.trainingDayHint}</p>
          </div>

          <div className="sm:col-span-2">
            <p className={FORJA_LABEL}>{FORJA_COPY.prescription.dayMuscles}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRAINING_MUSCLE_GROUPS.map((group) => {
                const selected = prescription.musculosDoDia.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    disabled={isSyncing}
                    onClick={() => toggleDayMuscle(group)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      selected ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                    }`}
                    aria-pressed={selected}
                  >
                    {MUSCLE_GROUP_LABELS[group]}
                  </button>
                );
              })}
            </div>
            <p className={`${FORJA_META} mt-1.5`}>{FORJA_COPY.prescription.dayMusclesHint}</p>
          </div>

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
              {TRAINING_MUSCLE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {MUSCLE_GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <p className={FORJA_LABEL}>{FORJA_COPY.prescription.progression}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESCRIPTION_PROGRESSION_OPTIONS.map((option) => {
                const selected = prescription.progressaoAlternativas.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSyncing}
                    onClick={() => toggleProgression(option.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      selected ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                    }`}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
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

          <div className="sm:col-span-2">
            <p className={FORJA_LABEL}>{FORJA_COPY.prescription.repsPerSet}</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {repRows.map((value, index) => {
                const isFailure = value.trim().toUpperCase() === "FALHA";
                return (
                  <div
                    key={`serie-${index + 1}`}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                  >
                    <p className="text-xs font-medium text-zinc-500">Série {index + 1}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={isFailure ? "" : value}
                        onChange={(event) => handleRepPerSetChange(index, event.target.value)}
                        placeholder={isFailure ? "FALHA" : "12"}
                        className={`${FORJA_INPUT} min-h-10 flex-1`}
                        disabled={isSyncing || isFailure}
                        aria-label={`Repetições série ${index + 1}`}
                      />
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => toggleFailureForSet(index)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          isFailure ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
                        }`}
                        aria-pressed={isFailure}
                      >
                        {FORJA_COPY.prescription.repsFailure}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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

          <div className="sm:col-span-2">
            <label htmlFor="forja-cardio-meta" className={FORJA_LABEL}>
              {FORJA_COPY.prescription.cardioMeta}
            </label>
            <input
              id="forja-cardio-meta"
              type="number"
              inputMode="numeric"
              min={5}
              max={180}
              value={prescription.cardioMetaMinutos}
              onChange={handleFieldChange("cardioMetaMinutos")}
              placeholder="30"
              className={FORJA_INPUT}
              disabled={isSyncing}
            />
            <p className={`${FORJA_META} mt-1.5`}>{FORJA_COPY.prescription.cardioHint}</p>
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
    </section>
  );
}

export const ForjaCommandPanel = memo(ForjaCommandPanelComponent);
