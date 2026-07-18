/** Tokens visuais — Painel da Forja (alinhado ao dashboard IRIS) */
export const FORJA_SHELL =
  "relative min-h-dvh overflow-x-hidden bg-black px-[max(1rem,env(safe-area-inset-left))] py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] text-white";

export const FORJA_AMBIENT =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.04),transparent_55%)]";

export const FORJA_LAYOUT =
  "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:gap-6 lg:items-start";

export const FORJA_ATHLETE_CARD_BASE =
  "w-full rounded-xl border bg-zinc-900/35 p-3 text-left transition-[background-color,border-color,box-shadow] duration-200";

export const FORJA_ATHLETE_CARD_IDLE = "hover:bg-zinc-900/55 hover:border-zinc-700/80";

export const FORJA_ATHLETE_CARD_SELECTED = "bg-zinc-900/75 border-zinc-600/70";

export const FORJA_ATHLETE_CARD_VIP =
  "border-emerald-900/45 bg-gradient-to-br from-emerald-950/35 via-zinc-950/40 to-amber-950/20 hover:border-emerald-700/50 hover:from-emerald-950/45";

export const FORJA_ATHLETE_CARD_VIP_SELECTED =
  "border-amber-600/45 bg-gradient-to-br from-emerald-950/55 via-zinc-900/70 to-amber-950/35 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]";

export const FORJA_VIP_BADGE =
  "rounded-md border border-amber-600/35 bg-amber-950/45 px-1.5 py-0.5 font-semibold uppercase tracking-[0.12em] text-amber-200/90";

export const FORJA_ATHLETE_CARD_COMUM =
  "border-zinc-800/90 bg-gradient-to-br from-zinc-950/70 via-zinc-900/35 to-slate-950/50 hover:border-zinc-600/70 hover:from-zinc-900/60";

export const FORJA_ATHLETE_CARD_COMUM_SELECTED =
  "border-zinc-500/55 bg-gradient-to-br from-zinc-900/80 via-zinc-800/45 to-slate-900/55 shadow-[0_0_0_1px_rgba(148,163,184,0.14)]";

export const FORJA_COMUM_BADGE =
  "rounded-md border border-slate-700/50 bg-slate-950/55 px-1.5 py-0.5 font-medium uppercase tracking-[0.1em] text-slate-400";

/** Badge compacto para células de tabela (ex.: ranking VTC). */
export const FORJA_TABLE_VIP_BADGE =
  "inline-block rounded border border-amber-700/40 bg-amber-950/35 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-200/85";

export const FORJA_TABLE_COMUM_BADGE =
  "inline-block rounded border border-slate-700/45 bg-slate-950/45 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-slate-500";

export const FORJA_COMMAND_PANEL =
  "relative min-h-0 rounded-2xl border border-zinc-800/90 bg-zinc-900/25 p-3 backdrop-blur-md sm:min-h-[min(72vh,720px)] sm:p-5 md:p-6 lg:p-8";

export const FORJA_COMMAND_INNER =
  "rounded-xl border border-zinc-800/80 bg-black/35 p-3 sm:p-5";

export const FORJA_SECTION_CHIP =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500";

export const FORJA_SECTION_TITLE = "font-serif text-xl tracking-wide text-zinc-50 sm:text-2xl";

export const FORJA_PAGE_TITLE = "font-serif text-2xl tracking-wide text-zinc-50 sm:text-3xl";

export const FORJA_META = "text-sm leading-relaxed text-zinc-400";

export const FORJA_LABEL =
  "mb-1.5 block text-xs font-medium text-zinc-400";

export const FORJA_INPUT =
  "w-full rounded-xl border border-zinc-800 bg-black/60 px-4 py-2.5 text-base text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export const FORJA_PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";

export const FORJA_GHOST_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-transparent px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900/50 disabled:cursor-not-allowed disabled:opacity-45";

export const FORJA_DANGER_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/60 bg-red-950/35 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-900/45 disabled:cursor-not-allowed disabled:opacity-45";

export const FORJA_TAB_ACTIVE = "border-zinc-500 bg-zinc-800/80 text-zinc-100";

export const FORJA_TAB_IDLE =
  "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300";

export const FORJA_SIDEBAR_SCROLL =
  "max-h-[min(72vh,720px)] space-y-2 overflow-y-auto pr-1 lg:pr-2";

export const FORJA_EMPTY_STATE =
  "flex min-h-0 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/90 bg-black/20 px-4 py-8 text-center md:min-h-[min(48vh,480px)] md:px-6 md:py-12";

export const FORJA_FEEDBACK_OK =
  "mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300";

export const FORJA_FEEDBACK_ERROR =
  "mt-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200/90";
