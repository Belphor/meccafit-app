"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { PhoenixDisplayTitle } from "@/components/PhoenixDisplayTitle";
import { usePhoenixVoice } from "@/hooks/usePhoenixVoice";
import {
  ALQUIMIA_MANIFESTO_CLOSING,
  ALQUIMIA_MANIFESTO_SECTIONS,
  ALQUIMIA_MANIFESTO_TITLE,
  ANYMA_SPEECH_ALQUIMIA_MANIFESTO,
} from "@/lib/alquimia-manifesto";
import {
  ALQUIMIA_MANIFESTO_OPEN_EVENT,
  type AlquimiaManifestoOpenDetail,
} from "@/lib/alquimia-manifesto-events";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

type AlquimiaManifestoOverlayProps = {
  profileName: string;
};

function useManifestoBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const previous = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width,
      overflow: bodyStyle.overflow,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";

    return () => {
      bodyStyle.position = previous.position;
      bodyStyle.top = previous.top;
      bodyStyle.left = previous.left;
      bodyStyle.right = previous.right;
      bodyStyle.width = previous.width;
      bodyStyle.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AlquimiaManifestoOverlay({ profileName }: AlquimiaManifestoOverlayProps) {
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const { igniteVoice, cancelVoice, isSpeaking, isPriming, isSupported } = usePhoenixVoice();

  useManifestoBodyLock(open);

  const close = useCallback(() => {
    cancelVoice();
    setOpen(false);
  }, [cancelVoice]);

  const startNarration = useCallback(() => {
    if (!isSupported) return;
    igniteVoice({
      text: ANYMA_SPEECH_ALQUIMIA_MANIFESTO,
      fullName: profileName,
      allowIntroFallback: false,
    });
  }, [igniteVoice, isSupported, profileName]);

  useEffect(() => {
    let narrateTimer: number | undefined;

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<AlquimiaManifestoOpenDetail>).detail;
      setOpen(true);
      if (detail?.narrate === false) return;

      window.clearTimeout(narrateTimer);
      narrateTimer = window.setTimeout(() => {
        startNarration();
      }, 420);
    };

    window.addEventListener(ALQUIMIA_MANIFESTO_OPEN_EVENT, onOpen);
    return () => {
      window.clearTimeout(narrateTimer);
      window.removeEventListener(ALQUIMIA_MANIFESTO_OPEN_EVENT, onOpen);
    };
  }, [startNarration]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  if (!mounted || !open) return null;

  const voiceBusy = isSpeaking || isPriming;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[150] flex min-h-dvh w-full flex-col bg-black px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alquimia-manifesto-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,69,0,0.12),transparent_42%),radial-gradient(ellipse_at_50%_88%,rgba(255,184,0,0.06),transparent_48%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,transparent_18%,transparent_78%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden="true"
      />

      <header className="relative z-[1] flex shrink-0 items-center justify-between gap-3 py-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
          Manifesto Primordial
        </span>
        <div className="flex items-center gap-2">
          {isSupported ? (
            <button
              type="button"
              onClick={() => (voiceBusy ? cancelVoice() : startNarration())}
              className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/20 bg-neutral-950/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/90 transition hover:border-amber-500/35 hover:text-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
            >
              {voiceBusy ? "Silenciar ANYMA" : "Ouvir ANYMA"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            className={`${DASHBOARD_TAP_TARGET} rounded-full border border-orange-500/15 bg-neutral-950/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-300 transition hover:border-amber-500/30 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
          >
            Fechar · Esc
          </button>
        </div>
      </header>

      <main className="relative z-[1] mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto overscroll-contain py-6 sm:py-10">
        <motion.div
          className="space-y-10 sm:space-y-12"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
          }}
        >
          <motion.div
            className="space-y-4 text-center"
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <PhoenixDisplayTitle
              id="alquimia-manifesto-title"
              as="h1"
              className="text-[clamp(1.55rem,5.5vw,2.35rem)] font-semibold leading-[1.2] tracking-[0.1em] !text-amber-100 drop-shadow-[0_0_28px_rgba(255,184,0,0.22)]"
            >
              {ALQUIMIA_MANIFESTO_TITLE}
            </PhoenixDisplayTitle>
            <div
              className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-amber-500/45 to-transparent"
              aria-hidden="true"
            />
          </motion.div>

          {ALQUIMIA_MANIFESTO_SECTIONS.map((section) => (
            <motion.section
              key={section.roman}
              className="space-y-4"
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <h2 className="font-serif text-base font-semibold uppercase tracking-[0.12em] text-amber-200/95 sm:text-lg">
                <span className="mr-2 font-mono text-amber-500/80">{section.roman}.</span>
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-pretty text-[15px] leading-[1.75] text-neutral-300/95 sm:text-base sm:leading-[1.8]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.section>
          ))}

          <motion.p
            className="pb-8 text-center font-serif text-lg font-semibold leading-snug tracking-[0.04em] text-amber-100 sm:text-xl sm:leading-relaxed"
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            <span className="bg-gradient-to-r from-amber-200 via-[#FFB800] to-orange-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,184,0,0.22)]">
              {ALQUIMIA_MANIFESTO_CLOSING}
            </span>
          </motion.p>
        </motion.div>
      </main>
    </motion.div>,
    document.body,
  );
}
