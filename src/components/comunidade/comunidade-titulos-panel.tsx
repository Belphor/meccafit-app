"use client";

import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADER,
  COMUNIDADE_HEADING,
  COMUNIDADE_INNER_CARD,
  COMUNIDADE_PANEL,
} from "@/components/comunidade/comunidade-layout";
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
      className={`${COMUNIDADE_INNER_CARD} flex min-h-[4.25rem] min-w-0 items-center gap-2.5 bg-neutral-950/50 px-2.5 py-2.5 xs:gap-3 xs:px-3 xs:py-3 sm:min-h-[4.5rem] sm:px-4 ${
        pulse ? "border-[#FFD700]/25" : "border-neutral-800/80"
      }`}
    >
      <PlutusAvatar name={nome} size="md" {...flags} />
      <div className="min-w-0 flex-1">
        <p
          className="break-words text-[9px] font-bold uppercase tracking-[0.12em] xs:tracking-[0.16em]"
          style={{ color: borderColor }}
        >
          {label}
        </p>
        <p className="break-words text-pretty text-[11px] font-medium text-neutral-200 xs:text-[12px]">{nome}</p>
      </div>
    </li>
  );
}

function IrisLegend() {
  const items = [
    {
      color: IRIS_BORDER_CINTURAO,
      label: "Rosa · Cinturão",
      detail: "Ganhaste um duelo e manténs o título até perderes",
    },
    {
      color: IRIS_BORDER_REI_CHAMAS,
      label: "Violeta · Rei das Chamas",
      detail: "Foste #1 no ranking mensal da faixa (superiores ou pernas)",
    },
    {
      color: IRIS_BORDER_PILAR_COOP,
      label: "Dourado · Pilar",
      detail: "Estiveste entre os 3 que mais ajudaram o termómetro no mês",
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        Cores no avatar
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex min-w-0 items-start gap-2 text-[10px] text-neutral-400">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-neutral-950"
              style={{ boxShadow: `0 0 0 2px ${item.color}` }}
              aria-hidden
            />
            <span className="min-w-0 break-words text-pretty leading-relaxed">
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
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-amber-200/80`}>Títulos mensais</p>
        <h3 className={`${COMUNIDADE_HEADING} text-amber-50/95`}>
          Quem está em destaque este mês
        </h3>
        <p className={`mt-1 ${COMUNIDADE_BODY_TEXT}`}>
          Os <span className="font-medium text-neutral-300">Reis</span> vêm do ranking mensal
          fechado. Os <span className="font-medium text-neutral-300">Pilares</span> vêm do
          termómetro. O <span className="font-medium text-neutral-300">cinturão</span> é só por
          duelo — vês os campeões na arena acima.
        </p>
      </header>

      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-300/85 xs:tracking-[0.14em]">
              Reis das Chamas
            </p>
            <p className="mb-2 text-[10px] leading-relaxed text-neutral-500">
              Vencedores do último fecho mensal — um por faixa (superiores e pernas).
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
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#FFD700]/90 xs:tracking-[0.14em]">
              Pilares cooperativos
            </p>
            <p className="mb-2 text-[10px] leading-relaxed text-neutral-500">
              Top 3 que mais ajudaram a encher o termómetro no mês passado.
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
