"use client";

import { DueloChallengePanel } from "@/components/comunidade/duelo-challenge-panel";
import {
  COMUNIDADE_BODY_TEXT,
  COMUNIDADE_CHIP,
  COMUNIDADE_EYEBROW,
  COMUNIDADE_HEADER,
  COMUNIDADE_HEADING,
  COMUNIDADE_INNER_CARD,
  COMUNIDADE_PANEL,
} from "@/components/comunidade/comunidade-layout";
import { PlutusAvatar } from "@/components/comunidade/plutus-avatar";
import type { ComunidadePhotoResolver } from "@/lib/comunidade-avatar";
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
  resolvePhotoUrl?: ComunidadePhotoResolver;
  loading?: boolean;
  onDueloCreated?: () => void;
};

function labelTipo(tipo: ComunidadeDueloAtivo["tipo_confronto"]): string {
  return tipo === "SUPERIORES" ? "Superiores (3 dias)" : "Inferiores (2 dias)";
}

function formatFim(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Indefinido";
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
  if (atletaId === userId) return "Você";
  const hit = rankings?.vtc_global.find((row) => row.atleta_id === atletaId);
  return hit?.atleta_nome ?? "Campeão da faixa";
}

function CampeaoCinturaoCard({
  tipo,
  campeaoId,
  userId,
  rankings,
  resolvePhotoUrl,
}: {
  tipo: ComunidadeDueloAtivo["tipo_confronto"];
  campeaoId: string | null;
  userId: string;
  rankings?: RankingsThoth | null;
  resolvePhotoUrl?: ComunidadePhotoResolver;
}) {
  const label = tipo === "SUPERIORES" ? "Superiores" : "Inferiores";
  if (!campeaoId) {
    return (
      <p className={`${COMUNIDADE_INNER_CARD} flex min-h-[3.75rem] items-center justify-center border-dashed border-[#FF007F]/20 px-3 py-3 text-center text-[11px] leading-relaxed text-neutral-500`}>
        Cinturão {label} vago
      </p>
    );
  }

  const nome = resolveNome(campeaoId, userId, rankings);

  return (
    <div className={`${COMUNIDADE_INNER_CARD} flex min-h-[3.75rem] min-w-0 items-center gap-3 border-[#FF007F]/25 bg-[#FF007F]/5 p-3`}>
      <PlutusAvatar
        temCinturaoDuelo
        size="sm"
        name={nome ?? label}
        photoUrl={campeaoId ? resolvePhotoUrl?.(campeaoId) : null}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.08em] text-[#FF007F] xs:tracking-[0.12em]">
          Cinturão {label}
        </p>
        <p className="break-words text-pretty text-[12px] font-medium leading-snug text-neutral-200">
          {campeaoId === userId ? "Você detém o cinturão" : nome}
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
  resolvePhotoUrl,
  loading = false,
  onDueloCreated,
}: DuelosArenaPanelProps) {
  const superioresId =
    campeoesCinturao.SUPERIORES ?? (campeaoCinturaoId && !campeoesCinturao.INFERIORES ? campeaoCinturaoId : null);
  const inferioresId = campeoesCinturao.INFERIORES ?? null;

  return (
    <section
      className={`${COMUNIDADE_PANEL} border-fuchsia-500/15 bg-gradient-to-br from-neutral-950/95 via-fuchsia-950/10 to-neutral-950/95`}
      aria-label="Arena de duelos de supergrupos"
    >
      <header className={COMUNIDADE_HEADER}>
        <p className={`${COMUNIDADE_EYEBROW} text-fuchsia-300/85`}>Duelos e cinturões</p>
        <h3 className={`${COMUNIDADE_HEADING} text-fuchsia-50/95`}>
          Desafie alguém pelo cinturão
        </h3>
        <p className={`mt-1 ${COMUNIDADE_BODY_TEXT}`}>
          Duelo rápido um contra um: quem somar mais pontos (peso vezes repetições) na faixa ganha.
          O cinturão fica com você até outra pessoa vencer em um novo duelo. Não expira no fim do
          mês.
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-2">
        <CampeaoCinturaoCard
          tipo="SUPERIORES"
          campeaoId={superioresId}
          userId={userId}
          rankings={rankings}
          resolvePhotoUrl={resolvePhotoUrl}
        />
        <CampeaoCinturaoCard
          tipo="INFERIORES"
          campeaoId={inferioresId}
          userId={userId}
          rankings={rankings}
          resolvePhotoUrl={resolvePhotoUrl}
        />
      </div>

      <DueloChallengePanel
        userId={userId}
        onDueloCreated={onDueloCreated}
        resolvePhotoUrl={resolvePhotoUrl}
      />

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-neutral-900/60" aria-hidden />
        ) : duelos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-800 p-4 text-center text-[11px] leading-relaxed text-neutral-500">
            Nenhum duelo a decorrer. Desafia um atleta da mesma faixa (superiores ou pernas) para
            disputar o cinturão.
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
                className={`${COMUNIDADE_INNER_CARD} min-w-0 p-3 sm:p-3.5 ${
                  isParticipant
                    ? "border-fuchsia-400/30 bg-fuchsia-950/15"
                    : "border-neutral-800/80 bg-neutral-950/40"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-2 xs:flex-row xs:flex-wrap xs:items-center xs:justify-between">
                  <span className={`${COMUNIDADE_CHIP} w-fit border-fuchsia-500/20 text-fuchsia-200/90`}>
                    {labelTipo(duelo.tipo_confronto)}
                  </span>
                  <time className="min-w-0 break-words text-[9px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]">
                    Fim: {formatFim(duelo.fim_em)}
                  </time>
                </div>

                <div className="mt-3 flex min-w-0 flex-col items-stretch gap-3 xs:grid xs:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xs:items-center xs:gap-2">
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <PlutusAvatar
                      size="sm"
                      name={nomeDesafiante ?? "?"}
                      photoUrl={resolvePhotoUrl?.(duelo.atleta_desafiante_id)}
                      temCinturaoDuelo={duelo.atleta_desafiante_id === campeaoTipoId}
                    />
                    <p className="w-full break-words text-pretty text-[10px] font-medium text-neutral-300">
                      {nomeDesafiante}
                    </p>
                  </div>
                  <span className="hidden text-center font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600 xs:block">
                    vs
                  </span>
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <PlutusAvatar
                      size="sm"
                      name={nomeDesafiado ?? "?"}
                      photoUrl={resolvePhotoUrl?.(duelo.atleta_desafiado_id)}
                      temCinturaoDuelo={duelo.atleta_desafiado_id === campeaoTipoId}
                    />
                    <p className="w-full break-words text-pretty text-[10px] font-medium text-neutral-300">
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
                    <span>{Math.round(duelo.vtc_desafiante)} pts</span>
                    <span>{Math.round(duelo.vtc_desafiado)} pts</span>
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
