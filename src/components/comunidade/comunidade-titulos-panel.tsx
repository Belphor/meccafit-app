"use client";

import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import {
  IRIS_BORDER_CINTURAO,
  IRIS_BORDER_PILAR_COOP,
  IRIS_BORDER_REI_CHAMAS,
} from "@/components/comunidade/plutus-avatar";
import type { ComunidadeAtletaRef, RankingsThoth } from "@/lib/comunidade-data";

type ComunidadeTitulosPanelProps = {
  reis: ComunidadeAtletaRef[];
  pilares: ComunidadeAtletaRef[];
  rankings: RankingsThoth | null;
  userId: string;
  loading?: boolean;
};

function resolveNome(
  atletaId: string,
  userId: string,
  rankings: RankingsThoth | null,
): string {
  if (atletaId === userId) return "Tu";
  const hit = rankings?.vtc_global.find((row) => row.atleta_id === atletaId);
  return hit?.atleta_nome ?? `${atletaId.slice(0, 8)}…`;
}

function TituloCard({
  label,
  nome,
  borderColor,
  flags,
  pulse = false,
}: {
  label: string;
  nome: string;
  borderColor: string;
  flags: {
    temCinturaoDuelo?: boolean;
    isReiDasChamas?: boolean;
    isPilarCooperativo?: boolean;
  };
  pulse?: boolean;
}) {
  return (
    <li
      className={`flex min-h-[4.5rem] items-center gap-3 rounded-xl border bg-neutral-950/50 px-3 py-3 sm:px-4 ${
        pulse ? "border-[#FFD700]/25" : "border-neutral-800/80"
      }`}
    >
      <PlutusAvatar name={nome} size="md" {...flags} />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: borderColor }}>
          {label}
        </p>
        <p className="truncate text-[12px] font-medium text-neutral-200">{nome}</p>
      </div>
    </li>
  );
}

function IrisLegend() {
  const items = [
    { color: IRIS_BORDER_CINTURAO, label: "Cinturão duelo", detail: "até perder na faixa" },
    { color: IRIS_BORDER_REI_CHAMAS, label: "Rei das Chamas", detail: "Top 1 pico mensal" },
    { color: IRIS_BORDER_PILAR_COOP, label: "Pilar cooperativo", detail: "Top 3 no termómetro" },
  ];

  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        Bordas IRIS no avatar
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-[10px] text-neutral-400">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-neutral-950"
              style={{ boxShadow: `0 0 0 2px ${item.color}` }}
              aria-hidden
            />
            <span>
              <span className="font-medium text-neutral-300">{item.label}</span>
              <span className="text-neutral-500"> · {item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComunidadeTitulosPanel({
  reis,
  pilares,
  rankings,
  userId,
  loading = false,
}: ComunidadeTitulosPanelProps) {
  const pilaresSlots = [0, 1, 2].map((index) => pilares[index] ?? null);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-950/95 via-neutral-900/20 to-neutral-950/95 p-4 sm:p-5"
      aria-label="Títulos mensais da arena"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
          Títulos · PLUTUS
        </p>
        <h3 className="mt-1 text-sm font-semibold text-amber-50/95 sm:text-base">
          Conquistas do mês na academia
        </h3>
        <p className="mt-1 text-[11px] text-neutral-500">
          1 Rei das Chamas · até 3 Pilares cooperativos · cinturões de duelo em paralelo.
        </p>
      </header>

      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300/85">
              Rei das Chamas
            </p>
            {reis.length === 0 ? (
              <p className="rounded-xl border border-dashed border-violet-500/20 p-3 text-center text-[10px] text-neutral-500">
                Ainda sem rei este mês — maior pico de força no fecho.
              </p>
            ) : (
              <ul className="space-y-2">
                {reis.map((rei) => (
                  <TituloCard
                    key={rei.atleta_id}
                    label="Rei das Chamas"
                    nome={resolveNome(rei.atleta_id, userId, rankings)}
                    borderColor={IRIS_BORDER_REI_CHAMAS}
                    flags={{ isReiDasChamas: true }}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFD700]/90">
              Pilares cooperativos · Top 3
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {pilaresSlots.map((pilar, index) =>
                pilar ? (
                  <TituloCard
                    key={pilar.atleta_id}
                    label={`Pilar ${index + 1}`}
                    nome={resolveNome(pilar.atleta_id, userId, rankings)}
                    borderColor={IRIS_BORDER_PILAR_COOP}
                    flags={{ isPilarCooperativo: true }}
                    pulse
                  />
                ) : (
                  <li
                    key={`pilar-vago-${index}`}
                    className="flex min-h-[4.5rem] items-center justify-center rounded-xl border border-dashed border-[#FFD700]/15 px-3 py-3 text-center text-[10px] text-neutral-600"
                  >
                    Pilar {index + 1} · vago
                  </li>
                ),
              )}
            </ul>
          </div>

          <IrisLegend />
        </div>
      )}
    </section>
  );
}
