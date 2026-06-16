/** Classes partilhadas · Comunidade (mobile-first, 320px → desktop) */

/** Painel base — largura total, padding adaptativo */
export const COMUNIDADE_PANEL =
  "min-w-0 w-full rounded-2xl border p-3 max-[359px]:p-3 xs:p-4 sm:p-5";

/** Âncoras de scroll com header fixo do dashboard */
export const COMUNIDADE_SCROLL_MT = "scroll-mt-[4.25rem] sm:scroll-mt-24";

/** Secção interna — evita overflow em grids aninhados */
export const COMUNIDADE_SECTION_INNER = "min-w-0 w-full";

/** Navegação · 3+2 em mobile · 5 colunas centrado a partir de sm */
export const COMUNIDADE_NAV =
  "mt-4 grid w-full grid-cols-3 gap-1.5 xs:gap-2 sm:mx-auto sm:max-w-2xl sm:grid-cols-5";

export const COMUNIDADE_NAV_LINK =
  "flex min-h-11 w-full items-center justify-center rounded-full border border-neutral-800/90 bg-neutral-950/70 px-1 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.05em] text-neutral-400 transition-colors hover:border-orange-500/30 hover:text-amber-200/90 xs:text-[11px] sm:px-2";

/** Tabs de filtro · scroll em mobile estreito · grid igual a partir de md */
export const COMUNIDADE_TAB_LIST =
  "mt-4 flex w-full min-w-0 gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory [scrollbar-width:none] xs:gap-2 md:grid md:grid-cols-5 md:gap-2 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden";

export const COMUNIDADE_TAB_BUTTON =
  "flex min-h-11 min-w-[5.25rem] shrink-0 snap-center items-center justify-center rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors md:min-w-0 md:w-full md:px-2 md:text-[9px] lg:text-[10px]";

/** Lista com scroll interno */
export const COMUNIDADE_LIST_SCROLL =
  "max-h-[min(32rem,62dvh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5";

/** Rótulo de secção entre painéis */
export const COMUNIDADE_SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-600 xs:tracking-[0.18em] sm:tracking-[0.2em]";

/** Texto de apoio / legenda */
export const COMUNIDADE_BODY_TEXT =
  "text-[10px] leading-relaxed text-neutral-500 xs:text-[11px] sm:text-[12px]";
