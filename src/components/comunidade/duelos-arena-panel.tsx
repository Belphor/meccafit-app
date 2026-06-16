"use client";

import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type {
  CampeoesCinturao,
  ComunidadeDueloAtivo,
  RankingsThoth,
} from "@/lib/comunidade-data";
import { resolveCampeaoCinturaoPorTipo } from "@/lib/comunidade-data";

type DuelosArenaPanelProps = {
  duelos: ComunidadeDueloAtivo[];
  campeoesCinturao: CampeoesCinturao;
  /** legado */
  campeaoCinturaoId?: string | null;
  rankings?: RankingsThoth | null;
  userId: string;
  loading?: boolean;
};

function labelTipo(tipo: ComunidadeDueloAtivo["tipo_confronto"]): string {
  return tipo === "SUPERIORES" ? "Superiores · 3 dias" : "Inferiores · 2 dias";
}

function formatFim(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveNome(
  atletaId: string | null,
  userId: string,
  rankings: RankingsThoth | null | undefined,
): string | null {
  if (!atletaId) return null;
  if (atletaId === userId) return "Tu";
  const hit = rankings?.vtc_global.find((row) => row.atleta_id === atletaId);
  return hit?.atleta_nome ?? "Campeão da faixa";
}

function CampeaoCinturaoCard({
  tipo,
  campeaoId,
  userId,
  rankings,
}: {
  tipo: ComunidadeDueloAtivo["tipo_confronto"];
  campeaoId: string | null;
  userId: string;
  rankings?: RankingsThoth | null;
}) {
  const label = tipo === "SUPERIORES" ? "Superiores" : "Inferiores";
  if (!campeaoId) {
    return (
      <p className="flex min-h-[3.75rem] items-center justify-center rounded-xl border border-dashed border-[#FF007F]/20 px-3 py-3 text-center text-[11px] text-neutral-500">
        Cinturão {label} · vago
      </p>
    );
  }

  const nome = resolveNome(campeaoId, userId, rankings);

  return (
    <div className="flex min-h-[3.75rem] items-center gap-3 rounded-xl border border-[#FF007F]/25 bg-[#FF007F]/5 p-3">
      <PlutusAvatar temCinturaoDuelo size="sm" name={nome ?? label} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#FF007F]">
          Cinturão · {label}
        </p>
        <p className="truncate text-[12px] font-medium text-neutral-200">
          {campeaoId === userId ? "És tu — defende o trono" : nome}
        </p>
      </div>
    </div>
  );
}

export function DuelosArenaPanel({
  duelos,
  campeoesCinturao,
  campeaoCinturaoId,
  rankings,
  userId,
  loading = false,
}: DuelosArenaPanelProps) {
  const superioresId =
    campeoesCinturao.SUPERIORES ?? (campeaoCinturaoId && !campeoesCinturao.INFERIORES ? campeaoCinturaoId : null);
  const inferioresId = campeoesCinturao.INFERIORES ?? null;

  return (
    <section
      className="rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-neutral-950/95 via-fuchsia-950/10 to-neutral-950/95 p-4 sm:p-5"
      aria-label="Arena de duelos de supergrupos"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/85">
          Duelos · Cinturões
        </p>
        <h3 className="mt-1 text-sm font-semibold text-fuchsia-50/95 sm:text-base">
          Até dois campeões em paralelo
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
          Um cinturão por faixa — superiores e inferiores não se anulam.
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampeaoCinturaoCard
          tipo="SUPERIORES"
          campeaoId={superioresId}
          userId={userId}
          rankings={rankings}
        />
        <CampeaoCinturaoCard
          tipo="INFERIORES"
          campeaoId={inferioresId}
          userId={userId}
          rankings={rankings}
        />
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
        ) : duelos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-[11px] leading-relaxed text-neutral-500">
            Sem duelos activos — desafia um atleta para disputar o cinturão da faixa.
          </p>
        ) : (
          duelos.map((duelo) => {
            const isParticipant =
              duelo.atleta_desafiante_id === userId || duelo.atleta_desafiado_id === userId;
            const total = duelo.vtc_desafiante + duelo.vtc_desafiado;
            const pctDesafiante =
              total > 0 ? Math.round((duelo.vtc_desafiante / total) * 100) : 50;
            const campeaoTipoId = resolveCampeaoCinturaoPorTipo(campeoesCinturao, duelo.tipo_confronto);
            const nomeDesafiante = resolveNome(duelo.atleta_desafiante_id, userId, rankings);
            const nomeDesafiado = resolveNome(duelo.atleta_desafiado_id, userId, rankings);

            return (
              <article
                key={duelo.id}
                className={`rounded-xl border p-3 sm:p-3.5 ${
                  isParticipant
                    ? "border-fuchsia-400/30 bg-fuchsia-950/15"
                    : "border-neutral-800/80 bg-neutral-950/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-fuchsia-500/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-fuchsia-200/90">
                    {labelTipo(duelo.tipo_confronto)}
                  </span>
                  <time className="text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                    Fim · {formatFim(duelo.fim_em)}
                  </time>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <PlutusAvatar
                      size="sm"
                      name={nomeDesafiante ?? "?"}
                      temCinturaoDuelo={duelo.atleta_desafiante_id === campeaoTipoId}
                    />
                    <p className="w-full truncate text-[10px] font-medium text-neutral-300">
                      {nomeDesafiante}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                    vs
                  </span>
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <PlutusAvatar
                      size="sm"
                      name={nomeDesafiado ?? "?"}
                      temCinturaoDuelo={duelo.atleta_desafiado_id === campeaoTipoId}
                    />
                    <p className="w-full truncate text-[10px] font-medium text-neutral-300">
                      {nomeDesafiado}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex h-2 overflow-hidden rounded-full bg-neutral-900">
                    <div
                      className="bg-[#FF007F]/70 transition-[width] duration-500"
                      style={{ width: `${pctDesafiante}%` }}
                    />
                    <div
                      className="bg-amber-500/50 transition-[width] duration-500"
                      style={{ width: `${100 - pctDesafiante}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-neutral-500">
                    <span>{Math.round(duelo.vtc_desafiante)} kg</span>
                    <span>{Math.round(duelo.vtc_desafiado)} kg</span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
