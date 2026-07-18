"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FORJA_COMMAND_INNER,
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
  fetchAcademiaConfig,
  sovereignSetMetaColetivaAlvo,
  sovereignUpdateAcademiaConfig,
} from "@/lib/academia-actions";
import type { AcademiaConfig } from "@/lib/academia-config";
import { buildPhaseLevelRows } from "@/lib/evolution-levels-reference";
import { formatTonelagemKg } from "@/lib/comunidade-data";

type AcademiaConfigPanelProps = {
  isSovereign: boolean;
};

function formatKgInput(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "";
}

function parseKgInput(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function AcademiaConfigPanel({ isSovereign }: AcademiaConfigPanelProps) {
  const [config, setConfig] = useState<AcademiaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const [metaMesAlvo, setMetaMesAlvo] = useState("");
  const [faiscaMin, setFaiscaMin] = useState("");
  const [faiscaMax, setFaiscaMax] = useState("");
  const [brasaMin, setBrasaMin] = useState("");
  const [brasaMax, setBrasaMax] = useState("");
  const [labaredaMin, setLabaredaMin] = useState("");
  const [labaredaMax, setLabaredaMax] = useState("");
  const [fogoCosmicoMin, setFogoCosmicoMin] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAcademiaConfig();
    setLoading(false);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    const cfg = result.config;
    setConfig(cfg);
    setMetaMesAlvo(formatKgInput(cfg.tonelagem_alvo_mes ?? cfg.meta_coletiva_alvo_kg));
    setFaiscaMin(formatKgInput(cfg.phase_vtc_faisca));
    setFaiscaMax(formatKgInput(cfg.phase_vtc_brasa - 1));
    setBrasaMin(formatKgInput(cfg.phase_vtc_brasa));
    setBrasaMax(formatKgInput(cfg.phase_vtc_labareda - 1));
    setLabaredaMin(formatKgInput(cfg.phase_vtc_labareda));
    setLabaredaMax(formatKgInput(cfg.phase_vtc_fogo_cosmico - 1));
    setFogoCosmicoMin(formatKgInput(cfg.phase_vtc_fogo_cosmico));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  const phasePreview = useMemo(() => buildPhaseLevelRows(config), [config]);

  const progressPct = config?.progresso_pct ?? 0;

  const handleSaveMeta = useCallback(async () => {
    if (!isSovereign) return;
    const alvo = parseKgInput(metaMesAlvo);
    if (!Number.isFinite(alvo) || alvo <= 0) {
      setFeedback({ kind: "error", message: "Informe uma meta mensal válida em kg." });
      return;
    }

    setBusy(true);
    setFeedback(null);
    const result = await sovereignSetMetaColetivaAlvo(alvo);
    setBusy(false);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    setFeedback({ kind: "ok", message: "Meta do termômetro coletivo atualizada." });
    void load();
  }, [isSovereign, metaMesAlvo, load]);

  const handleSaveThresholds = useCallback(async () => {
    if (!isSovereign) return;

    const patch = {
      phase_vtc_faisca: parseKgInput(faiscaMin),
      phase_vtc_brasa: parseKgInput(brasaMin),
      phase_vtc_labareda: parseKgInput(labaredaMin),
      phase_vtc_fogo_cosmico: parseKgInput(fogoCosmicoMin),
    };

    const ranges = [
      { label: "Faísca", min: parseKgInput(faiscaMin), max: parseKgInput(faiscaMax) },
      { label: "Brasa", min: parseKgInput(brasaMin), max: parseKgInput(brasaMax) },
      { label: "Labareda", min: parseKgInput(labaredaMin), max: parseKgInput(labaredaMax) },
      { label: "Fogo Cósmico", min: parseKgInput(fogoCosmicoMin), max: Number.POSITIVE_INFINITY },
    ];

    if (ranges.some((range) => !Number.isFinite(range.min) || range.min <= 0)) {
      setFeedback({
        kind: "error",
        message: "Todos os valores mínimos devem ser números positivos em kg.",
      });
      return;
    }

    if (ranges.slice(0, 3).some((range) => !Number.isFinite(range.max) || range.max <= range.min)) {
      setFeedback({
        kind: "error",
        message: "Cada fase precisa de um máximo maior que o mínimo (exceto Fogo Cósmico).",
      });
      return;
    }

    if (
      patch.phase_vtc_brasa !== parseKgInput(faiscaMax) + 1
      || patch.phase_vtc_labareda !== parseKgInput(brasaMax) + 1
      || patch.phase_vtc_fogo_cosmico !== parseKgInput(labaredaMax) + 1
    ) {
      setFeedback({
        kind: "error",
        message:
          "Os intervalos devem ser contínuos: o mínimo de cada fase é o máximo da anterior + 1 kg.",
      });
      return;
    }

    if (
      !(patch.phase_vtc_faisca < patch.phase_vtc_brasa
        && patch.phase_vtc_brasa < patch.phase_vtc_labareda
        && patch.phase_vtc_labareda < patch.phase_vtc_fogo_cosmico)
    ) {
      setFeedback({
        kind: "error",
        message: "Os limiares de fase devem crescer: Faísca < Brasa < Labareda < Fogo Cósmico.",
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    const result = await sovereignUpdateAcademiaConfig(patch);
    setBusy(false);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    setFeedback({ kind: "ok", message: "Limiares de fase salvos com sucesso." });
    void load();
  }, [
    isSovereign,
    faiscaMin,
    faiscaMax,
    brasaMin,
    brasaMax,
    labaredaMin,
    labaredaMax,
    fogoCosmicoMin,
    load,
  ]);

  return (
    <div className="space-y-6">
      <section className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Termômetro coletivo</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1 text-lg`}>Meta mensal da academia</h2>
        <p className={`${FORJA_META} mt-2`}>
          A barra da <strong className="font-medium text-zinc-200">Comunidade</strong> enche conforme
          o peso registrado por todos os clientes no mês. Cada linha de carga no histórico soma
          automaticamente, sem necessidade de atualização manual. Referência:{" "}
          <strong className="font-medium text-zinc-300">
            {config?.mes_referencia?.slice(0, 7) ?? "mês atual"}
          </strong>
          .
        </p>

        {loading ? (
          <p className={`${FORJA_META} mt-4`}>Carregando…</p>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
              <p className="text-sm font-medium text-zinc-100">
                {formatTonelagemKg(config?.tonelagem_atual_mes ?? 0)} de{" "}
                {formatTonelagemKg(config?.tonelagem_alvo_mes ?? 0)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-[width]"
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
              <p className={`${FORJA_META} mt-1`}>
                <strong className="font-medium text-zinc-300">{progressPct}%</strong> da meta
              </p>
            </div>

            {isSovereign ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="meta-mes-alvo" className={FORJA_LABEL}>
                    Meta deste mês (kg)
                  </label>
                  <input
                    id="meta-mes-alvo"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={metaMesAlvo}
                    onChange={(event) => setMetaMesAlvo(event.target.value)}
                    className={FORJA_INPUT}
                    disabled={busy}
                  />
                  <p className={`${FORJA_META} mt-1.5 text-zinc-500`}>
                    Define o alvo do termômetro coletivo apenas para o mês em curso.
                  </p>
                </div>
                <button
                  type="button"
                  className={FORJA_PRIMARY_BUTTON}
                  disabled={busy}
                  onClick={() => void handleSaveMeta()}
                >
                  Salvar meta do mês
                </button>
              </div>
            ) : (
              <p className={`${FORJA_META} mt-3 text-zinc-500`}>
                Apenas o <strong className="font-medium text-zinc-400">Forjador Soberano</strong>{" "}
                pode alterar a meta mensal.
              </p>
            )}
          </>
        )}
      </section>

      <section className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Manutenção de níveis</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1 text-lg`}>
          Chama Acumulada da Linhagem
        </h2>
        <p className={`${FORJA_META} mt-2`}>
          Ajuste a dificuldade das fases com base no{" "}
          <strong className="font-medium text-zinc-200">Volume de Carga Máxima (VTC)</strong>{" "}
          acumulado nos últimos 30 dias. Valores menores facilitam a progressão; valores maiores
          exigem mais acúmulo. Não confundir com{" "}
          <strong className="font-medium text-zinc-300">Brasas Musculares</strong> (VTC por grupo em
          14 dias) nem com a <strong className="font-medium text-zinc-300">Chama do Altar</strong>{" "}
          (VTC de hoje).
        </p>

        {isSovereign ? (
          <div className="mt-4 space-y-4">
            {[
              {
                title: "Faísca (fase 2)",
                minId: "phase-faisca-min",
                maxId: "phase-faisca-max",
                min: faiscaMin,
                max: faiscaMax,
                onMinChange: setFaiscaMin,
                onMaxChange: (value: string) => {
                  setFaiscaMax(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setBrasaMin(formatKgInput(parsed + 1));
                },
                showMax: true,
              },
              {
                title: "Brasa (fase 3)",
                minId: "phase-brasa-min",
                maxId: "phase-brasa-max",
                min: brasaMin,
                max: brasaMax,
                onMinChange: (value: string) => {
                  setBrasaMin(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setFaiscaMax(formatKgInput(parsed - 1));
                },
                onMaxChange: (value: string) => {
                  setBrasaMax(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setLabaredaMin(formatKgInput(parsed + 1));
                },
                showMax: true,
              },
              {
                title: "Labareda (fase 4)",
                minId: "phase-labareda-min",
                maxId: "phase-labareda-max",
                min: labaredaMin,
                max: labaredaMax,
                onMinChange: (value: string) => {
                  setLabaredaMin(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setBrasaMax(formatKgInput(parsed - 1));
                },
                onMaxChange: (value: string) => {
                  setLabaredaMax(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setFogoCosmicoMin(formatKgInput(parsed + 1));
                },
                showMax: true,
              },
              {
                title: "Fogo Cósmico (fase 5)",
                minId: "phase-fogo-cosmico-min",
                maxId: "phase-fogo-cosmico-max",
                min: fogoCosmicoMin,
                max: "",
                onMinChange: (value: string) => {
                  setFogoCosmicoMin(value);
                  const parsed = parseKgInput(value);
                  if (Number.isFinite(parsed)) setLabaredaMax(formatKgInput(parsed - 1));
                },
                onMaxChange: () => undefined,
                showMax: false,
              },
            ].map((tier) => (
              <div
                key={tier.title}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4"
              >
                <p className="text-sm font-medium text-zinc-100">{tier.title}</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={tier.minId} className={FORJA_LABEL}>
                      Mínimo (kg)
                    </label>
                    <input
                      id={tier.minId}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={tier.min}
                      onChange={(event) => tier.onMinChange(event.target.value)}
                      className={FORJA_INPUT}
                      disabled={busy}
                    />
                  </div>
                  {tier.showMax ? (
                    <div>
                      <label htmlFor={tier.maxId} className={FORJA_LABEL}>
                        Máximo (kg)
                      </label>
                      <input
                        id={tier.maxId}
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={tier.max}
                        onChange={(event) => tier.onMaxChange(event.target.value)}
                        className={FORJA_INPUT}
                        disabled={busy}
                      />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <p className={`${FORJA_META} pb-2 text-zinc-500`}>
                        Sem limite superior; a partir do mínimo, o cliente permanece na fase máxima.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className={FORJA_PRIMARY_BUTTON}
              disabled={busy}
              onClick={() => void handleSaveThresholds()}
            >
              Salvar limiares de fase
            </button>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <ul className="space-y-2 md:hidden">
            {phasePreview.map((row) => (
              <li
                key={row.tier}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
              >
                <p className="text-[11px] text-zinc-400">Fase {row.tier}</p>
                <p className="font-medium text-zinc-100">{row.label}</p>
                <p className="mt-1 break-words text-[12px] text-zinc-400">{row.vtcRangeLabel}</p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full min-w-[520px] border-collapse text-left text-sm md:table">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                <th className="px-2 py-2">Fase</th>
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Volume (30 dias)</th>
              </tr>
            </thead>
            <tbody>
              {phasePreview.map((row) => (
                <tr key={row.tier} className="border-b border-zinc-900/80">
                  <td className="px-2 py-2.5 text-zinc-200">{row.tier}</td>
                  <td className="px-2 py-2.5 font-medium text-zinc-100">{row.label}</td>
                  <td className="px-2 py-2.5 text-zinc-400">{row.vtcRangeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {feedback ? (
        <p
          className={feedback.kind === "ok" ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      {!isSovereign ? (
        <p className={FORJA_META}>{FORJA_COPY.monitor.readOnly}</p>
      ) : null}
    </div>
  );
}
