"use client";

import type { PortalTone } from "@/lib/portal-theme";

export const PORTAL_BURN_DURATION_MS = 2800;
export const PORTAL_BURN_DURATION_REDUCED_MS = 400;

type PortalBurnSubmitButtonProps = {
  tone: PortalTone;
  label: string;
  burning: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const TONE_CLASS: Record<PortalTone, string> = {
  cliente:
    "portal-burn-btn--cliente bg-gradient-to-r from-orange-600 to-amber-500 text-black hover:-translate-y-0.5 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)]",
  forja:
    "portal-burn-btn--forja bg-gradient-to-r from-white via-blue-100 to-slate-300 text-black hover:-translate-y-0.5 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.38),0_0_52px_rgba(147,197,253,0.28)]",
};

export function resolvePortalBurnDurationMs(): number {
  if (typeof window === "undefined") return PORTAL_BURN_DURATION_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? PORTAL_BURN_DURATION_REDUCED_MS
    : PORTAL_BURN_DURATION_MS;
}

export function waitPortalBurn(durationMs = resolvePortalBurnDurationMs()): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function PortalBurnSubmitButton({
  tone,
  label,
  burning,
  disabled = false,
  onClick,
}: PortalBurnSubmitButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || burning}
      onClick={onClick}
      aria-busy={burning}
      className={`portal-burn-btn mt-4 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${
        TONE_CLASS[tone]
      }${burning ? " is-burning" : ""}`}
    >
      <span className="portal-burn-btn__label relative z-[2]">{label}</span>
      <span aria-hidden="true" className="portal-burn-btn__char" />
      <span aria-hidden="true" className="portal-burn-btn__flame" />
      <span aria-hidden="true" className="portal-burn-btn__light" />
      <span aria-hidden="true" className="portal-burn-btn__embers">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
