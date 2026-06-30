"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/dashboard-config";
import { FENIX_EVOLUTION_SYSTEMS } from "@/lib/fenix-evolution-glossary";
import { VTC_DISPLAY_NAME } from "@/lib/vtc-labels";
import { fetchAcademiaConfig } from "@/lib/academia-actions";
import type { AcademiaConfig } from "@/lib/academia-config";
import {
  buildMuscleThermalRows,
  buildPhaseLevelRows,
  buildRitmoLevelRows,
  IGNICAO_LEVELS_TABLE_INTRO,
  MUSCLE_LEVELS_TABLE_INTRO,
  PHASE_LEVELS_TABLE_INTRO,
  THERMAL_GRAVITY_LEVELS_INTRO,
} from "@/lib/evolution-levels-reference";

type EvolutionLevelsTableProps = {
  initialConfig?: AcademiaConfig | null;
};

/** Ordem alinhada à aba Evolução: Ritmo → Brasas → Chama + Gravidade Térmica. */
export function EvolutionLevelsTable({ initialConfig = null }: EvolutionLevelsTableProps) {
  const [config, setConfig] = useState<AcademiaConfig | null>(initialConfig);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialConfig) return;
    void fetchAcademiaConfig().then((result) => {
      if (result.ok) setConfig(result.config);
    });
  }, [initialConfig]);

  const phaseRows = useMemo(() => buildPhaseLevelRows(config), [config]);
  const muscleRows = useMemo(() => buildMuscleThermalRows(), []);
  const ritmoRows = useMemo(() => buildRitmoLevelRows(), []);

  const ritmo = FENIX_EVOLUTION_SYSTEMS.ritmo_fenix;
  const brasas = FENIX_EVOLUTION_SYSTEMS.brasas_musculares;
  const chama = FENIX_EVOLUTION_SYSTEMS.chama_acumulada;

  return (
    <div className={`${DASHBOARD_INNER_FRAME} mt-6 p-4 sm:p-5`}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
        aria-controls="evolucao-reguas-panel"
      >
        <div className="min-w-0">
          <h3 className={DASHBOARD_SECTION_TITLE}>Réguas da Fênix</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            Referência na ordem da aba Evolução: Ritmo, Brasas Musculares e Chama Acumulada (com
            Gravidade Térmica). Inatividade e Ascensão estão na aba Perfil.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-400/80">
          {expanded ? "Recolher" : "Expandir"}
        </span>
      </button>

      {expanded ? (
        <div id="evolucao-reguas-panel" className="mt-5 space-y-5 border-t border-neutral-800/80 pt-5">
          {/* 1 · Ritmo da Fênix — bloco Consistência */}
          <section
            aria-labelledby="evolucao-ritmo-title"
            className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3.5 py-4"
          >
            <p
              id="evolucao-ritmo-title"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/90"
            >
              {ritmo.loreName}
            </p>
            <p className="mt-1 text-[11px] font-medium text-neutral-200">
              {ritmo.metricName} · {ritmo.unit} · {ritmo.period}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{IGNICAO_LEVELS_TABLE_INTRO}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-2 py-2">Nível</th>
                    <th className="px-2 py-2">Faixa do Ritmo</th>
                  </tr>
                </thead>
                <tbody>
                  {ritmoRows.map((row) => (
                    <tr key={row.level} className="border-b border-neutral-900/70">
                      <td className="px-2 py-2.5 font-medium text-neutral-100">{row.label}</td>
                      <td className="px-2 py-2.5 text-neutral-400">{row.rangeLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2 · Brasas Musculares — mapa corporal */}
          <section
            aria-labelledby="evolucao-brasas-title"
            className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 px-3.5 py-4"
          >
            <p
              id="evolucao-brasas-title"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/85"
            >
              {brasas.loreName}
            </p>
            <p className="mt-1 text-[11px] font-medium text-neutral-200">
              {brasas.metricName} · {brasas.unit} · {brasas.period}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{MUSCLE_LEVELS_TABLE_INTRO}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-2 py-2">Grupo</th>
                    <th className="px-2 py-2">Cinzas</th>
                    <th className="px-2 py-2">Faísca</th>
                    <th className="px-2 py-2">Brasa</th>
                    <th className="px-2 py-2">Labareda</th>
                    <th className="px-2 py-2">Fogo Cósmico</th>
                  </tr>
                </thead>
                <tbody>
                  {muscleRows.map((row) => (
                    <tr key={row.muscle} className="border-b border-neutral-900/70">
                      <td className="px-2 py-2.5 font-medium text-neutral-100">{row.label}</td>
                      <td className="px-2 py-2.5 tabular-nums text-neutral-500">{row.cinzas}</td>
                      <td className="px-2 py-2.5 tabular-nums text-neutral-400">{row.faisca}</td>
                      <td className="px-2 py-2.5 tabular-nums text-neutral-300">{row.brasa}</td>
                      <td className="px-2 py-2.5 tabular-nums text-neutral-300">{row.labareda}</td>
                      <td className="px-2 py-2.5 tabular-nums text-amber-100/90">{row.fogoCosmico}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 · Chama Acumulada + Gravidade Térmica */}
          <section
            aria-labelledby="evolucao-chama-title"
            className="rounded-xl border border-amber-500/25 bg-amber-950/15 px-3.5 py-4"
          >
            <p
              id="evolucao-chama-title"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200/90"
            >
              {chama.loreName}
            </p>
            <p className="mt-1 text-[11px] font-medium text-neutral-200">
              {chama.metricName} · {chama.unit} · {chama.period}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{PHASE_LEVELS_TABLE_INTRO}</p>

            <div className="mt-4 rounded-lg border border-orange-500/20 bg-black/30 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-300/90">
                Gravidade Térmica
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
                {THERMAL_GRAVITY_LEVELS_INTRO}
              </p>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-2 py-2">Fase</th>
                    <th className="px-2 py-2">Nome (linhagem)</th>
                    <th className="px-2 py-2">{VTC_DISPLAY_NAME} · patamar</th>
                    <th className="px-2 py-2">Significado</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseRows.map((row) => (
                    <tr key={row.tier} className="border-b border-neutral-900/70">
                      <td className="px-2 py-2.5 font-mono text-amber-200/85">{row.tier}</td>
                      <td className="px-2 py-2.5 font-medium text-neutral-100">{row.label}</td>
                      <td className="px-2 py-2.5 tabular-nums text-neutral-300">{row.vtcRangeLabel}</td>
                      <td className="px-2 py-2.5 text-neutral-400">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
