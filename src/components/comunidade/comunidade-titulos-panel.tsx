"use client";

import { COMUNIDADE_BODY_TEXT, COMUNIDADE_PANEL } from "@/components/comunidade/comunidade-layout";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import {
  IRIS_BORDER_CINTURAO,
  IRIS_BORDER_PILAR_COOP,
  IRIS_BORDER_REI_CHAMAS,
} from "@/components/comunidade/plutus-avatar";
import type { RankingsThoth, ReisChamas } from "@/lib/comunidade-data";

type ComunidadeTitulosPanelProps = {
  reisChamas: ReisChamas;
  pilares: { atleta_id: string }[];
  rankings: RankingsThoth | null;
  userId: string;
  loading?: boolean;
};

function resolveNome(
  atletaId: string | null,
  userId: string,
  rankings: RankingsThoth | null,
): string {
  if (!atletaId) return "—";
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
  empty = false,
}: {
  label: string;
  nome: string;
  borderColor: string;
  flags?: {
    temCinturaoDuelo?: boolean;
    isReiDasChamas?: boolean;
    isPilarCooperativo?: boolean;
  };
  pulse?: boolean;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <li className="flex min-h-[4.5rem] items-center justify-center rounded-xl border border-dashed border-violet-500/20 px-3 py-3 text-center text-[10px] text-neutral-600">
        {label} · vago
      </li>
    );
  }

  return (
      <li
      className={`flex min-h-[4.25rem] items-center gap-2.5 rounded-xl border bg-neutral-950/50 px-2.5 py-2.5 xs:gap-3 xs:px-3 xs:py-3 sm:min-h-[4.5rem] sm:px-4 ${
        pulse ? "border-[#FFD700]/25" : "border-neutral-800/80"
      }`}
    >
      <PlutusAvatar name={nome} size="md" {...flags} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className="truncate text-[9px] font-bold uppercase tracking-[0.14em] xs:tracking-[0.18em]"
          style={{ color: borderColor }}
        >
          {label}
        </p>
        <p className="truncate text-[11px] font-medium text-neutral-200 xs:text-[12px]">{nome}</p>
      </div>
    </li>
  );
}

function IrisLegend() {
  const items = [
    { color: IRIS_BORDER_CINTURAO, label: "Cinturão duelo", detail: "1 por faixa · até perder" },
    {
      color: IRIS_BORDER_REI_CHAMAS,
      label: "Rei das Chamas",
      detail: "Superiores ou Inferiores · #1 VTC mensal no fecho",
    },
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
  reisChamas,
  pilares,
  rankings,
  userId,
  loading = false,
}: ComunidadeTitulosPanelProps) {
  const pilaresSlots = [0, 1, 2].map((index) => pilares[index] ?? null);

  return (
    <section
      className={`${COMUNIDADE_PANEL} border-white/10 bg-gradient-to-br from-neutral-950/95 via-neutral-900/20 to-neutral-950/95`}
      aria-label="Títulos mensais da arena"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
          Títulos mensais
        </p>
        <h3 className="mt-1 text-balance text-sm font-semibold text-amber-50/95 sm:text-base">
          Conquistas do mês na academia
        </h3>
        <p className={`mt-1 ${COMUNIDADE_BODY_TEXT}`}>
          Reis das Chamas vêm do ranking mensal: #1 Superiores e #1 Pernas no fecho. Pilares e
          cinturões seguem regras próprias.
        </p>
      </header>

      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300/85">
              Reis das Chamas · VTC mensal · 2 faixas
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TituloCard
                label="Rei · Superiores"
                nome={resolveNome(reisChamas.SUPERIORES, userId, rankings)}
                borderColor={IRIS_BORDER_REI_CHAMAS}
                flags={{ isReiDasChamas: Boolean(reisChamas.SUPERIORES) }}
                empty={!reisChamas.SUPERIORES}
              />
              <TituloCard
                label="Rei · Inferiores"
                nome={resolveNome(reisChamas.INFERIORES, userId, rankings)}
                borderColor={IRIS_BORDER_REI_CHAMAS}
                flags={{ isReiDasChamas: Boolean(reisChamas.INFERIORES) }}
                empty={!reisChamas.INFERIORES}
              />
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFD700]/90">
              Pilares cooperativos · Top 3
            </p>
            <ul className="grid grid-cols-1 gap-2 xs:grid-cols-2 lg:grid-cols-3">
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
                  <TituloCard
                    key={`pilar-vago-${index}`}
                    label={`Pilar ${index + 1}`}
                    nome=""
                    borderColor={IRIS_BORDER_PILAR_COOP}
                    empty
                  />
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
