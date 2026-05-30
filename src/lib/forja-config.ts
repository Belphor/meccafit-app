/** Tokens visuais — Painel da Forja (IRIS · vidro fumê · preto absoluto) */
export const FORJA_SHELL =
  "relative min-h-dvh overflow-x-hidden bg-black px-[max(1rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] text-white";

export const FORJA_LAYOUT =
  "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:gap-6 lg:items-start";

export const FORJA_ATHLETE_CARD_BASE =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left backdrop-blur-md transition-[background-color,box-shadow,transform] duration-200";

export const FORJA_ATHLETE_CARD_IDLE =
  "hover:bg-zinc-900/55 hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]";

export const FORJA_ATHLETE_CARD_SELECTED = "bg-zinc-900/70 shadow-[0_0_28px_rgba(255,255,255,0.06)]";

export const FORJA_COMMAND_PANEL =
  "min-h-[min(72vh,720px)] rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-5 backdrop-blur-md sm:p-6 lg:p-8";

export const FORJA_COMMAND_INNER =
  "rounded-xl border border-zinc-800/80 bg-black/40 p-4 backdrop-blur-sm sm:p-5";

export const FORJA_SECTION_CHIP =
  "text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500";

export const FORJA_SECTION_TITLE = "font-serif text-2xl tracking-wide text-zinc-50 sm:text-3xl";

export const FORJA_META = "text-xs leading-relaxed text-zinc-400";

export const FORJA_LABEL =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500";

export const FORJA_INPUT =
  "w-full rounded-xl border border-zinc-800 bg-black/60 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/40 disabled:cursor-not-allowed disabled:opacity-50";

export const FORJA_PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-100 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";

export const FORJA_GHOST_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-transparent px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900/50 disabled:cursor-not-allowed disabled:opacity-45";

export const FORJA_SIDEBAR_SCROLL =
  "max-h-[min(72vh,720px)] space-y-2 overflow-y-auto pr-1 lg:pr-2";
