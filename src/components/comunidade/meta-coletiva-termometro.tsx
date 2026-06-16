"use client";

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
      className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-neutral-950/90 via-amber-950/10 to-neutral-950/90 p-4 sm:p-5"
      aria-label="Meta colectiva mensal da academia"
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
            Termómetro Colectivo
          </p>
          <h3 className="mt-1 text-sm font-semibold text-amber-50/95 sm:text-base">
            Tonelagem global do mês
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
          aria-label="Progresso da meta colectiva"
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-[width] duration-700 ease-out ${
              loading ? "w-0 animate-pulse" : ""
            }`}
            style={loading ? undefined : { width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-lg font-bold tabular-nums text-amber-200 sm:text-xl">
            {loading ? "—" : formatTonelagemKg(meta.tonelagem_atual_acumulada)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            Meta · {loading ? "—" : formatTonelagemKg(meta.tonelagem_alvo_kg)}
          </p>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Soma dos picos de carga de todos os treinos do mês — fórmula de força (sem repetições).
          Pilares cooperativos saem do Top 3 no fecho mensal.
        </p>
      </div>
    </section>
  );
}
