"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FORJA_COMMAND_INNER,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_GHOST_BUTTON,
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

export function AcademiaConfigPanel({ isSovereign }: AcademiaConfigPanelProps) {
  const [config, setConfig] = useState<AcademiaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const [metaMesAlvo, setMetaMesAlvo] = useState("");
  const [metaPadrao, setMetaPadrao] = useState("");
  const [faisca, setFaisca] = useState("");
  const [brasa, setBrasa] = useState("");
  const [labareda, setLabareda] = useState("");
  const [fogoCosmico, setFogoCosmico] = useState("");

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
    setMetaPadrao(formatKgInput(cfg.meta_coletiva_alvo_kg));
    setFaisca(formatKgInput(cfg.phase_vtc_faisca));
    setBrasa(formatKgInput(cfg.phase_vtc_brasa));
    setLabareda(formatKgInput(cfg.phase_vtc_labareda));
    setFogoCosmico(formatKgInput(cfg.phase_vtc_fogo_cosmico));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const phasePreview = useMemo(() => buildPhaseLevelRows(config), [config]);

  const progressPct = config?.progresso_pct ?? 0;

  const handleSaveMeta = useCallback(async () => {
    if (!isSovereign) return;
    const alvo = Number(metaMesAlvo);
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
      meta_coletiva_alvo_kg: Number(metaPadrao),
      phase_vtc_faisca: Number(faisca),
      phase_vtc_brasa: Number(brasa),
      phase_vtc_labareda: Number(labareda),
      phase_vtc_fogo_cosmico: Number(fogoCosmico),
    };

    if (Object.values(patch).some((value) => !Number.isFinite(value) || value <= 0)) {
      setFeedback({ kind: "error", message: "Todos os limiares devem ser números positivos." });
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

    setFeedback({ kind: "ok", message: "Limiares de fase e meta padrão salvos." });
    void load();
  }, [isSovereign, metaPadrao, faisca, brasa, labareda, fogoCosmico, load]);

  return (
    <div className="space-y-6">
      <section className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Termômetro coletivo</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1 text-lg`}>Meta mensal da academia</h2>
        <p className={`${FORJA_META} mt-2`}>
          A barra da Comunidade enche conforme o peso registrado por todos os clientes no mês. Cada
          linha de carga no histórico soma automaticamente (sem polling). Referência:{" "}
          {config?.mes_referencia?.slice(0, 7) ?? "mês atual"}.
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
              <p className={`${FORJA_META} mt-1`}>{progressPct}% da meta</p>
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
                    value={metaMesAlvo}
                    onChange={(event) => setMetaMesAlvo(event.target.value)}
                    className={FORJA_INPUT}
                    disabled={busy}
                  />
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
                Apenas o Forjador Soberano pode alterar a meta mensal.
              </p>
            )}
          </>
        )}
      </section>

      <section className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>Manutenção de níveis</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1 text-lg`}>
          Chama Acumulada da Linhagem · limiares (volume mensal / 30d)
        </h2>
        <p className={`${FORJA_META} mt-2`}>
          Ajuste a dificuldade das fases da Linhagem com base no Volume de Carga Máxima(VTC) acumulado nos últimos 30 dias. Valores menores facilitam a progressão. Valores maiores exigem mais acúmulo. Não confundir com Brasas Musculares, VTC por grupo em 14 dias, nem com a Chama do Altar, VTC de hoje.
        </p>

        {isSovereign ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={FORJA_LABEL}>Meta padrão novos meses (kg)</label>
              <input type="number" min={1} value={metaPadrao} onChange={(e) => setMetaPadrao(e.target.value)} className={FORJA_INPUT} disabled={busy} />
            </div>
            <div>
              <label className={FORJA_LABEL}>Faísca (tier 2) mín. kg</label>
              <input type="number" min={1} value={faisca} onChange={(e) => setFaisca(e.target.value)} className={FORJA_INPUT} disabled={busy} />
            </div>
            <div>
              <label className={FORJA_LABEL}>Brasa (tier 3) mín. kg</label>
              <input type="number" min={1} value={brasa} onChange={(e) => setBrasa(e.target.value)} className={FORJA_INPUT} disabled={busy} />
            </div>
            <div>
              <label className={FORJA_LABEL}>Labareda (tier 4) mín. kg</label>
              <input type="number" min={1} value={labareda} onChange={(e) => setLabareda(e.target.value)} className={FORJA_INPUT} disabled={busy} />
            </div>
            <div>
              <label className={FORJA_LABEL}>Fogo Cósmico (tier 5) mín. kg</label>
              <input type="number" min={1} value={fogoCosmico} onChange={(e) => setFogoCosmico(e.target.value)} className={FORJA_INPUT} disabled={busy} />
            </div>
            <div className="sm:col-span-2">
              <button type="button" className={FORJA_PRIMARY_BUTTON} disabled={busy} onClick={() => void handleSaveThresholds()}>
                Salvar limiares de fase
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                <th className="px-2 py-2">Fase</th>
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Volume</th>
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
        <p className={feedback.kind === "ok" ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      ) : null}

      {!isSovereign ? (
        <p className={FORJA_META}>{FORJA_COPY.monitor.readOnly}</p>
      ) : null}
    </div>
  );
}
