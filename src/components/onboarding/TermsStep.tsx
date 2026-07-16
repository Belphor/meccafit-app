"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import { ANYMA_BRAND, ANYMA_TERMS_VOLUME_SPEECH } from "@/lib/anyma-copy";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";
import { LoreEm } from "@/lib/lore-emphasis";

type TermsStepProps = {
  onAccept: () => void | Promise<void>;
  /**
   * Pula ritual + cerimônia de 1ª vez e entra como 2º login.
   * Registra o aceite das diretrizes sem exigir ouvir a voz.
   */
  onSkipPresentation: () => void | Promise<void>;
  /** Nome do perfil para a voz (vazio → Nova Chama). */
  profileName?: string;
  error?: string | null;
  isPending?: boolean;
};

const TERMS_SECTIONS = [
  {
    title: "Exclusividade do altar",
    body: (
      <>
        O MECCAFIT é um ambiente soberano da <LoreEm>FENYXIA</LoreEm>. Seu acesso é pessoal,
        intransferível e vinculado à sua linhagem. Compartilhar conta, credenciais ou sessões
        viola o contrato e pode resultar em banimento imediato.
      </>
    ),
  },
  {
    title: "Verdade no registro, o VTC",
    body: (
      <>
        O <LoreEm>Volume de Carga Máxima (VTC)</LoreEm> é a medida sagrada do braseiro. Registrar
        pesos, séries ou sessões falsas, ou manipular dados para simular progresso, é fraude. A
        Fênix não perdoa cinzas inventadas.
      </>
    ),
  },
  {
    title: "Conduta e comunidade",
    body: (
      <>
        No mural, no ranking e em qualquer superfície do produto, vale o rigor: respeito,
        honestidade e disciplina. Assédio, sabotagem ou tentativas de burlar os sistemas de
        pureza e anti-fraude são infrações graves.
      </>
    ),
  },
  {
    title: "Punições e banimento",
    body: (
      <>
        Infrações, trapaça de dados de VTC ou violação destas diretrizes resultam em punições
        severas, incluindo suspensão do altar e banimento permanente do produto.
      </>
    ),
  },
  {
    title: "Aceite único",
    body: (
      <>
        Ao avançar, você declara ter lido e compreendido estas diretrizes. Este aceite fica
        registrado na sua conta e <LoreEm>não será solicitado novamente</LoreEm>.
      </>
    ),
  },
] as const;

export function TermsStep({
  onAccept,
  onSkipPresentation,
  profileName = "",
  error = null,
  isPending = false,
}: TermsStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [heardComplete, setHeardComplete] = useState(false);
  const [volumeConfirmed, setVolumeConfirmed] = useState(false);
  const { igniteVoice, prepareVoice, cancelVoice, isSupported, isSpeaking, isPriming } =
    usePhoenixVoice();

  const busy = isPending || submitting || skipping;
  const voiceBusy = isSpeaking || isPriming;
  const wasVoiceBusyRef = useRef(false);
  const cancelRequestedRef = useRef(false);

  const canConfirmVolume = heardComplete || !isSupported;
  const canAccept = canConfirmVolume && volumeConfirmed && !busy;

  useEffect(() => {
    if (!isSupported) {
      // Sem síntese de voz no dispositivo, libera o checkbox de imediato (intencional).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeardComplete(true);
      return;
    }
    prepareVoice({
      text: ANYMA_TERMS_VOLUME_SPEECH,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [isSupported, prepareVoice, profileName]);

  useEffect(() => {
    if (voiceBusy) {
      wasVoiceBusyRef.current = true;
      return;
    }

    // Conclusão natural ou falha de síntese → libera o checkbox.
    // Silenciar no meio (cancel) não conta como ouvido.
    if (wasVoiceBusyRef.current && !cancelRequestedRef.current) {
      setHeardComplete(true);
    }

    wasVoiceBusyRef.current = false;
    cancelRequestedRef.current = false;
  }, [voiceBusy]);

  const startVoiceRitual = useCallback(() => {
    if (!isSupported || voiceBusy) return;
    cancelRequestedRef.current = false;
    igniteVoice({
      text: ANYMA_TERMS_VOLUME_SPEECH,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [igniteVoice, isSupported, profileName, voiceBusy]);

  const stopVoiceRitual = useCallback(() => {
    cancelRequestedRef.current = true;
    cancelVoice();
  }, [cancelVoice]);

  return (
    <motion.div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-4 py-10 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(245,158,11,0.09),rgba(0,0,0,0.88)_46%,#000_82%)]" />
      <div className="pointer-events-none absolute inset-x-[-18%] bottom-[-30%] h-[46vh] bg-gradient-to-t from-orange-950/25 via-orange-600/10 to-transparent blur-3xl" />

      <div className="relative z-[1] flex w-full max-w-lg flex-col gap-5">
        <header className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/70">
            Contrato da linhagem
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-black uppercase tracking-[0.12em] text-transparent sm:text-4xl">
            Diretrizes FENYXIA
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Leia com atenção. O aceite é único e fica registrado na sua conta.
          </p>
        </header>

        <div
          className="max-h-[min(52vh,440px)] overflow-y-auto rounded-3xl border border-orange-500/20 bg-neutral-950/55 p-5 shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_0_48px_rgba(249,115,22,0.1)] backdrop-blur-xl sm:p-6"
          role="region"
          aria-label="Políticas e contrato FENYXIA"
        >
          <ul className="flex flex-col gap-5">
            {TERMS_SECTIONS.map((section) => (
              <li
                key={section.title}
                className="border-b border-orange-500/10 pb-5 last:border-b-0 last:pb-0"
              >
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">{section.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-orange-500/12 bg-neutral-950/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/70">
              Ritual da voz · {ANYMA_BRAND}
            </p>
            {heardComplete && isSupported ? (
              <p className="text-[10px] text-amber-200/75" role="status">
                Voz ouvida
              </p>
            ) : null}
          </div>

          <p className="text-xs leading-snug text-neutral-500">
            Volume ≥ <LoreEm>70%</LoreEm>, ouça a mensagem e confirme.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {isSupported ? (
              <button
                type="button"
                onClick={() => (voiceBusy ? stopVoiceRitual() : startVoiceRitual())}
                disabled={busy}
                className={`${DASHBOARD_TAP_TARGET} shrink-0 rounded-lg border border-orange-500/25 bg-neutral-950/70 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100/90 transition hover:border-amber-500/40 hover:text-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[9.5rem]`}
              >
                {isPriming
                  ? "Preparando…"
                  : isSpeaking
                    ? "Silenciar"
                    : heardComplete
                      ? "Ouvir de novo"
                      : "Ouvir ANYMA"}
              </button>
            ) : (
              <p className="text-[11px] leading-snug text-amber-200/70" role="status">
                Sem voz neste aparelho. Confirme o volume e avance.
              </p>
            )}

            <label
              className={`flex min-h-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                canConfirmVolume
                  ? "border-orange-500/25 bg-black/30"
                  : "cursor-not-allowed border-neutral-800 bg-black/20 opacity-55"
              }`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 shrink-0 rounded border-orange-500/40 bg-neutral-950 text-orange-500 focus:ring-amber-400/50 disabled:cursor-not-allowed"
                checked={volumeConfirmed}
                disabled={!canConfirmVolume || busy}
                onChange={(event) => setVolumeConfirmed(event.target.checked)}
              />
              <span className="text-xs leading-snug text-neutral-300">
                Ouvi a <LoreEm>ANYMA</LoreEm> com volume alto.
              </span>
            </label>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              cancelVoice();
              cancelRequestedRef.current = true;
              setSkipping(true);
              void Promise.resolve(onSkipPresentation()).finally(() => {
                setSkipping(false);
              });
            }}
            className={`${DASHBOARD_TAP_TARGET} w-full rounded-lg border border-neutral-700/70 bg-transparent px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {skipping ? "Seguindo…" : "Pular apresentação"}
          </button>
          <p className="text-[10px] leading-snug text-neutral-600">
            Segue logo FENYXIA, manifesto e Juramento das Cinzas; depois perfil (nome, gênero, foto e
            selar) e a meta de treino. Sem o tour completo do Portal.
          </p>
        </div>

        {error ? (
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!canAccept}
          onClick={() => {
            if (!canAccept) return;
            cancelVoice();
            setSubmitting(true);
            void Promise.resolve(onAccept()).finally(() => {
              setSubmitting(false);
            });
          }}
          className={`${DASHBOARD_TAP_TARGET} w-full rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:text-sm`}
        >
          {busy
            ? "Registrando aceite…"
            : !heardComplete && isSupported
              ? "Ouça a ANYMA para continuar"
              : !volumeConfirmed
                ? "Confirme o volume para continuar"
                : "Li e concordo com as diretrizes da FENYXIA"}
        </button>
      </div>
    </motion.div>
  );
}
