import type { CSSProperties } from "react";

export type PortalTone = "cliente" | "forja";

export type PortalAtmosphere = {
  accent: string;
  card: string;
  aura: string;
  particlePrimary: string;
  particleSecondary: string;
};

export const PORTAL_SHELL =
  "relative flex min-h-dvh overflow-hidden bg-black px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-white";

/** Brasão IRIS — pulso cardíaco 1s */
export const PORTAL_BRASAO_PULSE =
  "motion-safe:animate-[fenyxia-pulse_1s_ease-in-out_infinite] motion-safe:will-change-transform";

export const PORTAL_LOGIN_CARD =
  "w-full rounded-[2.25rem] border border-orange-500/15 bg-neutral-950/60 p-7 text-center shadow-[0_0_30px_rgba(245,158,11,0.04)] backdrop-blur-md sm:p-11";

export const PORTAL_INPUT =
  "w-full rounded-2xl border border-neutral-900 bg-black px-5 py-4 text-base text-neutral-200 outline-none transition-all placeholder:text-neutral-700 focus:border-orange-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

/**
 * Reduz prompts do navegador (salvar senha / gerenciadores).
 * O app usa "Lembrar usuário e senha" próprio — não o Chrome/Safari.
 */
export const PORTAL_PASSWORD_MANAGER_ATTRS = {
  autoComplete: "off",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

export const PORTAL_FORM_ATTRS = {
  autoComplete: "off",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-bwignore": "true",
} as const;

export const PORTAL_LABEL =
  "mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-amber-500";

/** Respiro entre MECCAFIT CENTER e o card de login */
export const PORTAL_BRAND_HEADER =
  "shrink-0 pt-1 pb-2 text-center sm:pb-3";

export const PORTAL_BRAND_TO_CARD_GAP = "mt-4 sm:mt-5";

export const PORTAL_FORJA_LABEL =
  "mb-2 block text-left text-[10px] uppercase tracking-[0.3em] text-blue-100";

export const modeAtmosphere: Record<PortalTone, PortalAtmosphere> = {
  cliente: {
    accent: "text-amber-500",
    card: "border-orange-500/15 shadow-[0_0_30px_rgba(245,158,11,0.04)]",
    aura: "from-orange-950/10 via-orange-600/20 to-amber-400/10",
    particlePrimary: "bg-orange-500/20",
    particleSecondary: "bg-amber-400/30",
  },
  forja: {
    accent: "text-blue-100",
    card: "border-blue-100/15 shadow-[0_0_30px_rgba(147,197,253,0.06)]",
    aura: "from-blue-950/10 via-slate-200/16 to-cyan-300/10",
    particlePrimary: "bg-white/20",
    particleSecondary: "bg-blue-300/25",
  },
};

export type EmberParticle = {
  id: number;
  left: string;
  size: string;
  delay: string;
  duration: string;
  opacity: string;
  drift: string;
};

export type EmberParticleStyle = CSSProperties & {
  "--duration": string;
  "--drift": string;
};

export const emberParticles: readonly EmberParticle[] = [
  { id: 1, left: "6%", size: "h-1 w-1", delay: "0s", duration: "14s", opacity: "opacity-35", drift: "18px" },
  { id: 2, left: "13%", size: "h-1.5 w-1.5", delay: "1.7s", duration: "18s", opacity: "opacity-20", drift: "-24px" },
  { id: 3, left: "21%", size: "h-1.5 w-1.5", delay: "0.9s", duration: "20s", opacity: "opacity-30", drift: "34px" },
  { id: 4, left: "29%", size: "h-1 w-2", delay: "3.1s", duration: "15s", opacity: "opacity-20", drift: "-14px" },
  { id: 5, left: "37%", size: "h-1 w-1", delay: "2.2s", duration: "19s", opacity: "opacity-35", drift: "28px" },
  { id: 6, left: "45%", size: "h-1.5 w-1", delay: "0.4s", duration: "17s", opacity: "opacity-25", drift: "-32px" },
  { id: 7, left: "53%", size: "h-1 w-1", delay: "4s", duration: "22s", opacity: "opacity-30", drift: "12px" },
  { id: 8, left: "61%", size: "h-1.5 w-1.5", delay: "1.2s", duration: "16s", opacity: "opacity-20", drift: "-20px" },
  { id: 9, left: "70%", size: "h-1 w-2", delay: "2.8s", duration: "21s", opacity: "opacity-30", drift: "30px" },
  { id: 10, left: "78%", size: "h-1 w-1", delay: "0.2s", duration: "15.5s", opacity: "opacity-35", drift: "-18px" },
  { id: 11, left: "86%", size: "h-1.5 w-1", delay: "3.7s", duration: "23s", opacity: "opacity-20", drift: "22px" },
  { id: 12, left: "94%", size: "h-1 w-1", delay: "1.9s", duration: "18.5s", opacity: "opacity-30", drift: "-26px" },
];
