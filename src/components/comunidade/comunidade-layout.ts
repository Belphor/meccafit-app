/** Classes partilhadas · Comunidade (mobile-first, 320px → desktop) */

/** Painel base — contém overflow e respeita largura do card pai */
export const COMUNIDADE_PANEL =
  "box-border min-w-0 max-w-full overflow-hidden rounded-2xl border p-3 max-[359px]:p-2.5 xs:p-4 sm:p-5";

/** Âncoras de scroll com header fixo do dashboard */
export const COMUNIDADE_SCROLL_MT = "scroll-mt-[4.25rem] sm:scroll-mt-24";

/** Secção interna — evita overflow em grids aninhados */
export const COMUNIDADE_SECTION_INNER = "min-w-0 max-w-full";

/** Cabeçalho de painel — eyebrow + título */
export const COMUNIDADE_HEADER = "min-w-0 max-w-full overflow-hidden";

/** Eyebrow uppercase — letter-spacing reduzido em ecrãs estreitos */
export const COMUNIDADE_EYEBROW =
  "text-[10px] font-bold uppercase tracking-[0.1em] xs:tracking-[0.14em] sm:tracking-[0.18em]";

/** Título de secção dentro dos painéis */
export const COMUNIDADE_HEADING =
  "mt-1 text-balance break-words text-sm font-semibold leading-snug sm:text-base";

/** Navegação · 3+2 em mobile · 5 colunas centrado a partir de sm */
export const COMUNIDADE_NAV =
  "mt-4 grid w-full min-w-0 grid-cols-3 gap-1.5 xs:gap-2 sm:mx-auto sm:max-w-2xl sm:grid-cols-5";

export const COMUNIDADE_NAV_LINK =
  "flex min-h-11 w-full min-w-0 items-center justify-center rounded-full border border-neutral-800/90 bg-neutral-950/70 px-1 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.04em] text-neutral-400 transition-colors hover:border-orange-500/30 hover:text-amber-200/90 xs:text-[11px] sm:px-2";

/** Tabs de filtro · grelha 2→3→6 colunas (sem scroll horizontal) */
export const COMUNIDADE_TAB_LIST =
  "mt-4 grid w-full min-w-0 grid-cols-2 gap-1.5 xs:gap-2 sm:grid-cols-3 lg:grid-cols-6";

export const COMUNIDADE_TAB_BUTTON =
  "flex min-h-11 w-full min-w-0 items-center justify-center rounded-full border px-1.5 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.03em] transition-colors whitespace-normal xs:px-2 xs:text-[10px] lg:text-[10px]";

/** Card interno (linha de ranking, duelo, título) */
export const COMUNIDADE_INNER_CARD = "min-w-0 max-w-full overflow-hidden rounded-xl border";

/** Lista com scroll interno */
export const COMUNIDADE_LIST_SCROLL =
  "max-h-[min(32rem,62dvh)] min-w-0 space-y-2 overflow-y-auto overscroll-contain pr-0.5";

/** Rótulo de secção entre painéis */
export const COMUNIDADE_SECTION_LABEL =
  "break-words text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600 xs:tracking-[0.16em] sm:tracking-[0.18em]";

/** Texto de apoio / legenda */
export const COMUNIDADE_BODY_TEXT =
  "text-pretty break-words text-[10px] leading-relaxed text-neutral-500 xs:text-[11px] sm:text-[12px]";

/** Chip / badge compacto */
export const COMUNIDADE_CHIP =
  "inline-flex max-w-full flex-wrap items-center justify-center rounded-full border px-2.5 py-1 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.08em] xs:text-[10px] xs:tracking-[0.1em]";

/** Título da página Comunidade (fluido 320px+) */
export const COMUNIDADE_PAGE_TITLE =
  "font-serif text-[clamp(1.1rem,4.5vw+0.55rem,1.75rem)] font-semibold uppercase leading-tight tracking-[0.05em] text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.15)] sm:tracking-[0.08em]";
