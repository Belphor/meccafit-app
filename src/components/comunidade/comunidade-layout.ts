/** Classes partilhadas · Comunidade (mobile-first, 320px → desktop) */

/** Painel base — padding adaptativo */
export const COMUNIDADE_PANEL =
  "rounded-2xl border p-3.5 xs:p-4 sm:p-5";

/** Âncoras de scroll com header fixo do dashboard */
export const COMUNIDADE_SCROLL_MT = "scroll-mt-[4.25rem] sm:scroll-mt-24";

/** Navegação horizontal em ecrãs estreitos · grid centrado a partir de sm */
export const COMUNIDADE_NAV =
  "mt-4 -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1 snap-x snap-mandatory [scrollbar-width:none] xs:gap-2 sm:mx-auto sm:grid sm:max-w-xl sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden";

export const COMUNIDADE_NAV_LINK =
  "flex min-h-11 min-w-[4.25rem] shrink-0 snap-center items-center justify-center rounded-full border border-neutral-800/90 bg-neutral-950/70 px-2 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-neutral-400 transition-colors hover:border-orange-500/30 hover:text-amber-200/90 xs:min-w-[4.75rem] xs:text-[11px] sm:min-h-11 sm:min-w-0 sm:px-1.5 sm:text-[10px] md:text-[11px]";

/** Tabs de filtro (rankings) */
export const COMUNIDADE_TAB_LIST =
  "flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] xs:gap-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden";

export const COMUNIDADE_TAB_BUTTON =
  "min-h-11 min-w-[4.5rem] shrink-0 snap-center rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors xs:min-w-[5rem] sm:min-w-0 sm:px-2.5 sm:text-[9px] md:text-[10px]";

/** Lista com scroll interno em telemóveis */
export const COMUNIDADE_LIST_SCROLL =
  "max-h-[min(32rem,62dvh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5";
