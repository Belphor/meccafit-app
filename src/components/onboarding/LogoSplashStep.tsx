"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ONBOARDING_CEREMONY_FADE_MS,
  ONBOARDING_CEREMONY_HOLD_MS,
} from "@/lib/onboarding-ceremony";

export const FENYXIA_LOGO_SRC = "/assets/fenyxia-logo.webp";

type LogoSplashStepProps = {
  onComplete: () => void;
};

export function LogoSplashStep({ onComplete }: LogoSplashStepProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const holdTimer = window.setTimeout(() => {
      setPhase("exit");
    }, ONBOARDING_CEREMONY_HOLD_MS);

    return () => window.clearTimeout(holdTimer);
  }, []);

  useEffect(() => {
    if (phase !== "exit") return;

    const doneTimer = window.setTimeout(() => {
      onComplete();
    }, ONBOARDING_CEREMONY_FADE_MS);

    return () => window.clearTimeout(doneTimer);
  }, [phase, onComplete]);

  return (
    <motion.div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={
        phase === "exit"
          ? { duration: ONBOARDING_CEREMONY_FADE_MS / 1000, ease: [0.4, 0, 0.2, 1] }
          : { duration: 0.75, ease: [0.22, 1, 0.36, 1] }
      }
      onAnimationComplete={() => {
        if (phase === "enter") setPhase("hold");
      }}
      aria-live="polite"
      aria-label="FENYXIA"
    >
      <div className="pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.1),rgba(0,0,0,0.9)_48%,#000_86%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[-20%] bottom-[-28%] h-[52vh] bg-gradient-to-t from-sky-950/20 via-blue-900/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        className="relative z-[1] flex flex-col items-center gap-9 sm:gap-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative grid place-items-center">
          <div className="relative size-44 sm:size-56">
            <Image
              src={FENYXIA_LOGO_SRC}
              alt=""
              fill
              priority
              quality={100}
              sizes="(max-width: 640px) 176px, 224px"
              aria-hidden="true"
              className="fenyxia-logo-glow--soft object-contain"
            />
            <Image
              src={FENYXIA_LOGO_SRC}
              alt=""
              fill
              priority
              quality={100}
              sizes="(max-width: 640px) 176px, 224px"
              aria-hidden="true"
              className="fenyxia-logo-glow object-contain"
            />
            <Image
              src={FENYXIA_LOGO_SRC}
              alt="FENYXIA"
              fill
              priority
              quality={100}
              sizes="(max-width: 640px) 176px, 224px"
              className="fenyxia-logo-contour object-contain"
            />
          </div>
        </div>

        <motion.div
          className="flex flex-col items-center gap-3.5 sm:gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="bg-gradient-to-r from-sky-100 via-white to-orange-200 bg-clip-text text-4xl font-black uppercase tracking-[0.36em] text-transparent drop-shadow-[0_0_22px_rgba(125,211,252,0.45),0_0_48px_rgba(56,189,248,0.28)] sm:text-5xl sm:tracking-[0.4em]">
            FENYXIA
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-sky-300/70 sm:text-xs">
            Ecossistema soberano
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
