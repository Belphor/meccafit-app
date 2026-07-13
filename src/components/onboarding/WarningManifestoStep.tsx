"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ONBOARDING_CEREMONY_FADE_MS,
  ONBOARDING_CEREMONY_HOLD_MS,
} from "@/lib/onboarding-ceremony";

type WarningManifestoStepProps = {
  onComplete: () => void;
  error?: string | null;
};

const MANIFESTO_LINES = [
  "Este é um ambiente exclusivo.",
  "Infrações, trapaça com dados de VTC ou a violação dos nossos termos resultarão em punições severas e no banimento imediato do produto.",
] as const;

export function WarningManifestoStep({
  onComplete,
  error = null,
}: WarningManifestoStepProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    if (error) return;

    const holdTimer = window.setTimeout(() => {
      setPhase("exit");
    }, ONBOARDING_CEREMONY_HOLD_MS);

    return () => window.clearTimeout(holdTimer);
  }, [error]);

  useEffect(() => {
    if (phase !== "exit" || error) return;

    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, ONBOARDING_CEREMONY_FADE_MS);

    return () => window.clearTimeout(doneTimer);
  }, [phase, error, onComplete]);

  return (
    <motion.div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-5 py-12 sm:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exit" && !error ? 0 : 1 }}
      transition={
        phase === "exit" && !error
          ? { duration: ONBOARDING_CEREMONY_FADE_MS / 1000, ease: [0.4, 0, 0.2, 1] }
          : { duration: 0.75, ease: [0.22, 1, 0.36, 1] }
      }
      onAnimationComplete={() => {
        if (phase === "enter") setPhase("hold");
      }}
      aria-live="polite"
      aria-label="Manifesto de exclusividade"
    >
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(127,29,29,0.22),rgba(0,0,0,0.92)_42%,#000_78%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[-16%] top-[-18%] h-[42vh] bg-gradient-to-b from-red-950/28 via-transparent to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-[1] flex w-full max-w-2xl flex-col items-center gap-10 text-center sm:gap-12">
        <motion.h1
          className="bg-gradient-to-r from-red-300 via-rose-100 to-red-400 bg-clip-text text-3xl font-black uppercase leading-tight tracking-[0.14em] text-transparent sm:text-4xl sm:tracking-[0.18em] md:text-5xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Manifesto de exclusividade
        </motion.h1>

        <div className="flex flex-col gap-6 sm:gap-7">
          <motion.p
            className="text-balance text-xl font-black uppercase leading-[1.3] tracking-[0.08em] text-white sm:text-2xl md:text-[1.85rem] md:leading-[1.35]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {MANIFESTO_LINES[0]}
          </motion.p>

          <motion.p
            className="mx-auto max-w-xl text-balance text-base font-semibold uppercase leading-[1.55] tracking-[0.06em] text-neutral-300 sm:text-lg md:text-xl md:leading-[1.5]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {MANIFESTO_LINES[1]}
          </motion.p>
        </div>

        <motion.p
          className="max-w-md text-sm leading-relaxed text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42, duration: 0.5 }}
        >
          A Fênix guarda o braseiro. A linhagem responde pela verdade do registro.
        </motion.p>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
