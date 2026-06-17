"use client";

import { COMUNIDADE_BODY_TEXT, COMUNIDADE_PANEL } from "@/components/comunidade/comunidade-layout";
import { formatTonelagemKg, type ComunidadeMeta } from "@/lib/comunidade-data";

type MetaColetivaTermometroProps = {
  meta: ComunidadeMeta;
  mesReferencia?: string;
  loading?: boolean;
};

export function MetaColetivaTermometro({
  meta,
  mesReferencia,
  loading = false,
}: MetaColetivaTermometroProps) {
  const pct = Math.min(100, Math.max(0, meta.progresso_pct));

  return (
    <section
      className={`${COMUNIDADE_PANEL} border-amber-500/15 bg-gradient-to-br from-neutral-950/90 via-amber-950/10 to-neutral-950/90`}
      aria-label="Meta coletiva mensal da academia"
    >
      <header className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
            Termómetro coletivo
          </p>
          <h3 className="mt-1 text-balance text-sm font-semibold text-amber-50/95 sm:text-base">
            Quanto a linhagem levantou este mês
          </h3>
        </div>
        {mesReferencia ? (
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Ref. {mesReferencia.slice(0, 7)}
          </p>
        ) : null}
      </header>

      <div className="mt-4">
        <div
          className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-900/80 ring-1 ring-amber-500/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={loading ? 0 : pct}
          aria-label="Progresso da meta coletiva"
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-[width] duration-700 ease-out ${loading ? "w-0 animate-pulse" : ""
              }`}
            style={loading ? undefined : { width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-1 xs:flex-row xs:flex-wrap xs:items-baseline xs:justify-between xs:gap-2">
          <p className="font-mono text-base font-bold tabular-nums text-amber-200 xs:text-lg sm:text-xl">
            {loading ? "—" : formatTonelagemKg(meta.tonelagem_atual_acumulada)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 xs:text-[11px]">
            Meta · {loading ? "—" : formatTonelagemKg(meta.tonelagem_alvo_kg)}
          </p>
        </div>

        <p className={`mt-2 ${COMUNIDADE_BODY_TEXT}`}>
          Cada treino com peso soma para a meta comum da academia. Quanto mais treinamos, mais a
          barra enche. No fim do mês, os três atletas que mais contribuíram tornam-se{" "}
          <span className="font-medium text-neutral-300">Pilares cooperativos</span>.
        </p>
      </div>
    </section>
  );
}
