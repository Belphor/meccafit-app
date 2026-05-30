"use client";

import { memo, useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_GHOST_BUTTON,
  FORJA_INPUT,
  FORJA_LABEL,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import {
  EMPTY_PRESCRIPTION_DRAFT,
  type ForjaBondedAthlete,
  type ForjaPrescriptionDraft,
} from "@/lib/forja-dashboard";
import { resolveForjaThermalStyle } from "@/lib/forja-phase-styles";
import { PHASE_TIER_LABELS } from "@/lib/dashboard-config";

type ForjaCommandPanelProps = {
  athlete: ForjaBondedAthlete | null;
};

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
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  const handleFieldChange = useCallback(
    (field: keyof ForjaPrescriptionDraft) => (event: ChangeEvent<HTMLInputElement>) => {
      setPrescription((current) => ({ ...current, [field]: event.target.value }));
      setCommandMessage(null);
    },
    [],
  );

  const handlePrescribeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!athlete) return;

      const exercicio = prescription.exercicio.trim();
      const peso = prescription.peso.trim();
      const repeticoes = prescription.repeticoes.trim();
      const series = prescription.series.trim() || "3";

      if (!exercicio || !peso || !repeticoes) {
        setCommandMessage("Preencha exercício, peso e repetições antes de forjar o decreto.");
        return;
      }

      setCommandMessage(
        `Decreto termogénico preparado para ${athlete.displayName}: ${series}×${repeticoes} @ ${peso} kg · ${exercicio}. Integração RPC em breve.`,
      );
    },
    [athlete, prescription],
  );

  const handleInjectDietDecree = useCallback(() => {
    if (!athlete) return;
    setCommandMessage(
      `Preset Dieta VIP aberto para ${athlete.displayName}. Blueprint termogénico será injectado via diet_blueprints.`,
    );
  }, [athlete]);

  if (!athlete) {
    return (
      <section className={`${FORJA_COMMAND_INNER} flex min-h-[min(52vh,560px)] items-center justify-center text-center`}>
        <div className="max-w-sm">
          <p className={FORJA_SECTION_CHIP}>Área de Comando</p>
          <p className={`${FORJA_META} mt-3`}>
            Seleccione um atleta vinculado na coluna esquerda para prescrever treino ou injectar
            decreto termogénico de dieta VIP.
          </p>
        </div>
      </section>
    );
  }

  const thermal = resolveForjaThermalStyle(athlete.phaseTier);
  const phaseLabel =
    PHASE_TIER_LABELS[athlete.phaseTier as keyof typeof PHASE_TIER_LABELS] ?? thermal.label;

  return (
    <section aria-label={`Comando · ${athlete.displayName}`}>
      <header className="border-b border-zinc-800/80 pb-5">
        <p className={FORJA_SECTION_CHIP}>Área de Comando</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-2`}>{athlete.displayName}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${thermal.chipClass}`}
          >
            {thermal.label}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Tier {athlete.phaseTier} · {phaseLabel}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            VIP desde {formatBondDate(athlete.bondedAt)}
          </span>
        </div>
        {athlete.lineageName ? (
          <p className={`${FORJA_META} mt-2`}>Linhagem · {athlete.lineageName}</p>
        ) : null}
      </header>

      <form onSubmit={handlePrescribeSubmit} className={`${FORJA_COMMAND_INNER} mt-5`}>
        <h3 className="font-serif text-lg text-zinc-100">Prescrever Treino</h3>
        <p className={`${FORJA_META} mt-1`}>
          Via personal · registo futuro em{" "}
          <code className="text-zinc-300">historico_treinos_personais</code>
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="forja-exercicio" className={FORJA_LABEL}>
              Exercício
            </label>
            <input
              id="forja-exercicio"
              type="text"
              value={prescription.exercicio}
              onChange={handleFieldChange("exercicio")}
              placeholder="Ex: Supino reto"
              className={FORJA_INPUT}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="forja-peso" className={FORJA_LABEL}>
              Peso (kg)
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
            />
          </div>

          <div>
            <label htmlFor="forja-repeticoes" className={FORJA_LABEL}>
              Repetições
            </label>
            <input
              id="forja-repeticoes"
              type="number"
              inputMode="numeric"
              min={1}
              value={prescription.repeticoes}
              onChange={handleFieldChange("repeticoes")}
              placeholder="12"
              className={FORJA_INPUT}
            />
          </div>

          <div>
            <label htmlFor="forja-series" className={FORJA_LABEL}>
              Séries
            </label>
            <input
              id="forja-series"
              type="number"
              inputMode="numeric"
              min={1}
              value={prescription.series}
              onChange={handleFieldChange("series")}
              placeholder="3"
              className={FORJA_INPUT}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className={FORJA_PRIMARY_BUTTON}>
            Forjar Prescrição
          </button>
          <button
            type="button"
            onClick={handleInjectDietDecree}
            className={FORJA_GHOST_BUTTON}
          >
            Injetar Decreto Termogénico
          </button>
        </div>
      </form>

      {commandMessage ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm leading-relaxed text-zinc-300"
        >
          {commandMessage}
        </p>
      ) : null}
    </section>
  );
}

export const ForjaCommandPanel = memo(ForjaCommandPanelComponent);
