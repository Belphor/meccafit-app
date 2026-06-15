"use client";

import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { ComunidadeDueloAtivo } from "@/lib/comunidade-data";

type DuelosArenaPanelProps = {
  duelos: ComunidadeDueloAtivo[];
  campeaoCinturaoId: string | null;
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

export function DuelosArenaPanel({
  duelos,
  campeaoCinturaoId,
  userId,
  loading = false,
}: DuelosArenaPanelProps) {
  return (
    <section
      className="rounded-2xl border border-fuchsia-500/15 bg-gradient-to-br from-neutral-950/95 via-fuchsia-950/10 to-neutral-950/95 p-4 sm:p-5"
      aria-label="Arena de duelos de supergrupos"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/85">
          Duelos · King of the Hill
        </p>
        <h3 className="mt-1 text-sm font-semibold text-fuchsia-50/95 sm:text-base">
          Cinturão de supergrupos
        </h3>
      </header>

      {campeaoCinturaoId ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#FF007F]/25 bg-[#FF007F]/5 p-3">
          <PlutusAvatar
            detemCinturaoDuelo
            size="sm"
            name="Campeão"
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#FF007F]">
              Detém o cinturão
            </p>
            <p className="truncate font-mono text-[11px] text-neutral-400">
              {campeaoCinturaoId === userId ? "És tu — defende o trono" : campeaoCinturaoId.slice(0, 8)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-neutral-500">
          Ninguém detém o cinturão — desafia um atleta para conquistar o trono.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
        ) : duelos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-[11px] text-neutral-500">
            Sem duelos activos neste momento.
          </p>
        ) : (
          duelos.map((duelo) => {
            const isParticipant =
              duelo.atleta_desafiante_id === userId || duelo.atleta_desafiado_id === userId;
            const total = duelo.vtc_desafiante + duelo.vtc_desafiado;
            const pctDesafiante =
              total > 0 ? Math.round((duelo.vtc_desafiante / total) * 100) : 50;

            return (
              <article
                key={duelo.id}
                className={`rounded-xl border p-3 ${
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

                <div className="mt-3 flex items-center justify-between gap-2">
                  <PlutusAvatar
                    size="sm"
                    detemCinturaoDuelo={duelo.atleta_desafiante_id === campeaoCinturaoId}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                    vs
                  </span>
                  <PlutusAvatar
                    size="sm"
                    detemCinturaoDuelo={duelo.atleta_desafiado_id === campeaoCinturaoId}
                  />
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
