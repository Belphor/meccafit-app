/** Tokens Portal de Brasa — Magma Core + Solar Gold */
export const MAGMA_SPECTRUM = {
  magmaCore: "#FF4500",
  solarGold: "#FFB800",
} as const;

export const BIOLOGICAL_BALANCE_MIN_AGE = 40;
export const BIOLOGICAL_BALANCE_MULTIPLIER = 1.5;

/** Limites ARGOS — alinhados à RPC/trigger Supabase */
export const ARGOS_WEIGHT_MIN = 1;
export const ARGOS_WEIGHT_MAX = 9999.99;
export const ARGOS_WEIGHT_STEP = 0.1;
export const SUPERACAO_FLAME_MS = 8000;
export const SUPERACAO_OVERLAY_MS = 8000;
export const SUPERACAO_MURAL_DELAY_MS = 100;
export const SUPERACAO_MURAL_MS = SUPERACAO_OVERLAY_MS + SUPERACAO_MURAL_DELAY_MS;

/** Shell IRIS — Absolute Black + brasa ambiente + safe-area */
export const DASHBOARD_SHELL =
  "relative min-h-dvh overflow-x-hidden bg-black px-[max(1.25rem,env(safe-area-inset-left))] py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] pr-[max(1.25rem,env(safe-area-inset-right))] text-white";

/** Listas com scroll interno apenas em telas grandes */
export const DASHBOARD_SCROLL_LIST =
  "grid grid-cols-1 gap-4 lg:max-h-[min(68vh,720px)] lg:overflow-y-auto lg:pr-1";

export const DASHBOARD_MURAL_LIST =
  "grid grid-cols-1 gap-3 lg:max-h-[min(68vh,640px)] lg:overflow-y-auto lg:pr-1";

/** Alvo mínimo de toque — 44px (WCAG) */
export const DASHBOARD_TAP_TARGET = "inline-flex min-h-11 items-center justify-center";

export const DASHBOARD_AMBIENT_GLOW =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(245,158,11,0.07),rgba(0,0,0,0.82)_48%,#000_82%)]";

/** Glow ambiente estático — brasa residual */
export const BRASA_AMBIENT_GLOW = "shadow-[0_0_30px_rgba(245,158,11,0.04)]";

/** Painéis estáticos — vidro fumê + borda cirúrgica orange-500/15 */
export const BRASA_PANEL =
  `border border-orange-500/15 bg-neutral-950/60 backdrop-blur-md ${BRASA_AMBIENT_GLOW}`;

/** Painéis com borda plasma viscosa — mesmo efeito do título PEITO */
export const PLASMA_PANEL =
  `plasma-viscous-border bg-neutral-950/60 backdrop-blur-md ${BRASA_AMBIENT_GLOW}`;

/** Painéis com borda brasão — glow estático só na moldura */
export const BRASAO_LIGHT_PANEL =
  "brasao-light-border bg-neutral-950/60 backdrop-blur-md";

/** Halo e borda — quadros portal (dashboard, aba treino) */
export const PORTAL_FRAME_HALO =
  "border border-orange-500/15 shadow-[0_0_80px_rgba(249,115,22,0.12)]";

/** Superfície vidro fumê compartilhada */
export const PORTAL_FRAME_SURFACE = "bg-neutral-950/60 backdrop-blur-md";

/** Quadro principal do dashboard — halo login + fundo alinhado à aba treino */
export const PORTAL_FRAME_PANEL = `${PORTAL_FRAME_HALO} ${PORTAL_FRAME_SURFACE}`;

/** Aba Treino — mesmo halo e fundo do dashboard */
export const TREINO_FRAME_PANEL = `${PORTAL_FRAME_HALO} ${PORTAL_FRAME_SURFACE}`;

/** IRIS — fusão latente: inativo sem borda visível (só o activo brilha) */
export const IRIS_IDLE_BORDER = "border-transparent";
export const IRIS_IDLE_SURFACE = "bg-neutral-950/45 backdrop-blur-sm";
export const IRIS_IDLE_INSET =
  "shadow-[inset_0_1px_0_rgba(251,191,36,0.04)]";
export const IRIS_IDLE_HOVER =
  "transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-orange-500/14 hover:bg-neutral-950/58";

/** Coluna treino / painéis internos — vidro fumê IRIS */
export const TREINO_INNER_PANEL =
  `border ${IRIS_IDLE_BORDER} bg-neutral-950/40 backdrop-blur-sm ${IRIS_IDLE_INSET}`;

/** Voo de Cinzas — repouso (pré-voo), sem halo brasão */
export const CARDIO_VOO_PANEL_IDLE =
  `border ${IRIS_IDLE_BORDER} bg-neutral-950/45 backdrop-blur-sm ${IRIS_IDLE_INSET} ${IRIS_IDLE_HOVER}`;

/** Voo de Cinzas — sessão ativa (running · check-in · estase) — halo + classe .cardio-voo-active no painel */
export const CARDIO_VOO_PANEL_ACTIVE =
  "shadow-[0_0_40px_rgba(249,115,22,0.22)] bg-neutral-950/68";

/** Voo de Cinzas — meta concluída · incandescência — classe .cardio-voo-elite no painel */
export const CARDIO_VOO_PANEL_ELITE =
  "shadow-[0_0_44px_rgba(255,215,0,0.28)] bg-neutral-950/70";

/** Item selecionável inativo — moldura cirúrgica, sem glow brasão */
export const SELECTABLE_IDLE_PANEL =
  `rounded-[1.75rem] border ${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} ${IRIS_IDLE_INSET} ${IRIS_IDLE_HOVER}`;

/** Abas inativas — mesma linguagem do portal de brasa */
export const DASHBOARD_TAB_BUTTON_IDLE =
  `${DASHBOARD_TAP_TARGET} min-h-11 rounded-full border ${IRIS_IDLE_BORDER} ${IRIS_IDLE_SURFACE} px-5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 ${IRIS_IDLE_INSET} ${IRIS_IDLE_HOVER} hover:text-amber-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`;

/** Cápsulas inativas — cinzas em brasa residual */
export const EXERCISE_CAPSULE_IDLE =
  "shrink-0 rounded-full border border-orange-500/[0.06] bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500";

/** Botão vídeo inativo */
export const EXERCISE_VIDEO_BUTTON_IDLE =
  `${DASHBOARD_TAP_TARGET} relative z-[1] shrink-0 gap-2 rounded-full border border-orange-500/[0.06] bg-neutral-950/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 ${IRIS_IDLE_HOVER} hover:text-amber-200/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`;

export const BRASAO_LIGHT_TAB =
  "brasao-light-border rounded-full bg-neutral-950/60 backdrop-blur-sm";

export const BRASAO_LIGHT_CAPSULE =
  "brasao-light-border shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-200/90";

/** Divisor interno do card de exercício */
export const EXERCISE_DIVIDER_IDLE = "border-t border-orange-500/[0.06]";
export const EXERCISE_DIVIDER_ACTIVE = "border-t border-orange-500/12";
export const EXERCISE_DIVIDER_COMPLETE = "border-t border-[#FFD700]/14";

/** Chip de destaque compartilhado — fase faísca (ativo) e vídeo */
export const EXERCISE_HIGHLIGHT_CHIP =
  `brasao-light-border relative z-[1] ${DASHBOARD_TAP_TARGET} shrink-0 rounded-full bg-gradient-to-r from-orange-950/55 to-black/60 px-3 py-2 text-[10px] font-bold uppercase text-amber-100 shadow-[0_0_14px_rgba(249,115,22,0.12)]`;

/** Botão vídeo / fase faísca — visual idêntico */
export const EXERCISE_VIDEO_BUTTON =
  `${EXERCISE_HIGHLIGHT_CHIP} gap-2 tracking-[0.18em] transition hover:from-orange-950/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`;

/** Fase ativa — EM CHAMAS: selo de forja */
export const EXERCISE_PHASE_EM_CHAMAS =
  "em-chamas-forge pointer-events-none inline-flex shrink-0";

/** Superação — selo heráldico de ascensão */
export const EXERCISE_PHASE_SUPERACAO =
  "superacao-forge pointer-events-none inline-flex shrink-0";

/** Chip de séries durante superação */
export const EXERCISE_SERIES_SUPERACAO =
  `${BRASAO_LIGHT_CAPSULE} shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-200/75`;

export const EXERCISE_CARD_SELECTABLE =
  "cursor-pointer rounded-[1.75rem] outline-none transition-[opacity,box-shadow,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

/** VTC — Volume Total de Carga (soma das cargas máximas da sessão) */
export const VTC_LABEL = "VTC";
export const VTC_FULL_NAME = "Volume Total de Carga Máxima";
export const VTC_FORMULA = "Soma das cargas máximas (kg)";
export const VTC_FORMULA_SHORT = "Σ kg máx";
export const VTC_SESSION_EXPLANATION = "Soma das cargas máximas registradas na sessão.";

/** Chama do Altar — texto orientativo para o cliente */
export const CHAMA_ALTAR_CLIENT_EXPLANATION =
  "Registro vivo da sua forja. O VTC soma as cargas máximas (kg) registradas na sessão de hoje — quanto mais volume forjar, mais intensa fica a chama do altar.";

/** Voo de Cinzas — texto orientativo para o cliente */
export const VOO_CINZAS_CLIENT_EXPLANATION =
  "Seu cardio consciente do dia. Acumule o tempo validado e confirme a cada 10 minutos que ainda está ativo. Pausas não apagam o progresso — ao atingir a meta, seu altar energético diário é sincronizado.";

/** Mapa Térmico (Evolução) — texto orientativo para o cliente */
export const MAPA_TERMICO_CLIENT_EXPLANATION =
  "O mapa mostra o calor muscular dos 6 grupos principais. Cada região muda de cor conforme o estímulo acumulado na quinzena — de Cinzas até Fogo Cósmico. Toque no corpo para ver detalhes. Membros fora da prescrição do forjador aparecem congelados.";

/** Pureza da Fênix (Evolução) — Índice de Ignição */
export const FENIX_PUREZA_CLIENT_EXPLANATION =
  "A Pureza da Fênix é o Índice de Ignição — sua consistência real nos últimos 30 dias. Cada dia com treino registrado ou cardio validado conta como dia puro. O percentual divide seus dias puros pela meta mensal de treinos do seu plano (ajustável no perfil). Abaixo de 50%, o mapa perde saturação: a Fênix não mente, ela reflete o ritmo medido, não a intenção.";

/** Comparação de Ciclo (Evolução) — selfies locais */
export const CICLO_COMPARACAO_CLIENT_EXPLANATION =
  "Espelho visual do seu ciclo mensal. Capture selfies nos dias 1, 15 e 30 com a mesma pose e iluminação. Quando tiver Dia 1 e Dia 30 gravados, arraste o divisor para comparar a evolução lado a lado. As fotos ficam só no seu dispositivo — nada é enviado à nuvem.";

export const VTC_METRIC_FRAME =
  "relative overflow-hidden rounded-2xl border border-orange-500/12 bg-black/35 px-4 py-3 backdrop-blur-sm";

export const VTC_METRIC_ACRONYM =
  "font-serif text-xl font-semibold leading-none tracking-wide text-amber-200/90 sm:text-2xl";

export const VTC_METRIC_VALUE =
  "block font-serif tabular-nums leading-none text-amber-50 break-words";

export const VTC_EXPLANATION_TEXT =
  "text-[10px] font-normal normal-case leading-snug tracking-normal text-neutral-500 sm:text-[11px]";

/** Bloco orientativo visível dentro dos cards do dashboard */
export const DASHBOARD_CLIENT_INFO_BLOCK =
  "rounded-2xl border border-orange-500/18 bg-gradient-to-br from-orange-950/40 via-neutral-950/55 to-black/60 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)] sm:px-4 sm:py-3.5";

export const DASHBOARD_CLIENT_INFO_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/90";

export const DASHBOARD_CLIENT_INFO_TEXT =
  "text-xs leading-relaxed text-amber-50/88 sm:text-sm sm:leading-relaxed";

/** Contador de séries — destaque fora da superação */
export const EXERCISE_SERIES_CHIP =
  `${BRASAO_LIGHT_CAPSULE} inline-flex items-center px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/95 shadow-[0_0_14px_rgba(249,115,22,0.12)] bg-gradient-to-r from-orange-950/40 to-black/55`;

/** Superfície destacada — cards internos, mural, métricas */
export const DASHBOARD_HIGHLIGHT_SURFACE =
  "brasao-light-border relative bg-gradient-to-r from-orange-950/55 to-black/60 shadow-[0_0_14px_rgba(249,115,22,0.12)]";

/** Label/chip de seção — mesmo visual do vídeo/fase faísca */
export const DASHBOARD_SECTION_CHIP = EXERCISE_VIDEO_BUTTON;

/** Abas do portal — ativo e inativo com alvo de toque */
export const DASHBOARD_TAB_BUTTON_ACTIVE = `${DASHBOARD_SECTION_CHIP} min-h-11 px-5`;

/** Saída do altar — compacto no mobile, destaque no desktop */
export const DASHBOARD_SIGN_OUT_BUTTON =
  "group relative inline-flex min-h-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/30 bg-gradient-to-r from-black via-neutral-950/95 to-orange-950/50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100/95 shadow-[inset_0_1px_0_rgba(251,191,36,0.08),0_0_16px_rgba(249,115,22,0.12)] backdrop-blur-md transition duration-300 hover:border-amber-400/50 hover:text-amber-50 hover:shadow-[inset_0_1px_0_rgba(251,191,36,0.14),0_0_32px_rgba(251,191,36,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/55 active:scale-[0.98] sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-[10px] sm:tracking-[0.2em]";

export const DASHBOARD_SIGN_OUT_GLOW =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.18),transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100";

/** Meta secundária (data, contadores) */
export const DASHBOARD_META_CHIP = `${BRASAO_LIGHT_CAPSULE} text-amber-200/85`;

/** Título de seção — uppercase estático */
export const DASHBOARD_SECTION_TITLE =
  "font-serif text-2xl font-semibold uppercase tracking-[0.08em] text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.15)] sm:text-3xl";

/** Subtítulo de aba */
export const DASHBOARD_TAB_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.32em] text-amber-500/90";

/** Região corporal abaixo do título monumental (Membro Superior · Inferior · Core) */
export const MONUMENTAL_BODY_REGION_SUBTITLE =
  "relative z-[1] font-serif text-sm font-medium uppercase tracking-[0.28em] text-amber-300 sm:text-base sm:tracking-[0.32em]";

/** Botão de ação primário */
export const DASHBOARD_ACTION_BUTTON = `${EXERCISE_VIDEO_BUTTON} w-full sm:w-auto`;

/** Botão touch 「Registrar carga」 — visibilidade controlada no PhoenixInput */
export const PHOENIX_REGISTER_CARGA_IDLE = `${EXERCISE_VIDEO_BUTTON_IDLE} w-full`;

/** Botão touch 「Registrar carga」 — card selecionado */
export const PHOENIX_REGISTER_CARGA_ACTIVE = `${EXERCISE_VIDEO_BUTTON} w-full`;

/** Concluir série — sem persistência Supabase */
export const EXERCISE_COMPLETE_SET_BUTTON = `${EXERCISE_VIDEO_BUTTON} w-full sm:w-auto`;

/** Minimizar / expandir cards da aba treino */
export const TREINO_MINIMIZE_TOGGLE = `${DASHBOARD_SECTION_CHIP} min-h-9 gap-1.5 px-3.5 py-1.5 text-[9px] tracking-[0.16em]`;

/** Meta do PhoenixInput — exercício concluído na sessão */
export const PHOENIX_INPUT_META_COMPLETE =
  "text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD700]/80";

export const PHOENIX_INPUT_GOAL_COMPLETE = "Carga máxima registrada";

export const PHOENIX_INPUT_HINT_COMPLETE = "Registro salvo nesta sessão";

export const EXERCISE_SESSION_REGISTERED_LABEL = "Sessão registrada";

/** Card de item (mural, ascensão) */
export const DASHBOARD_ITEM_CARD =
  `${DASHBOARD_HIGHLIGHT_SURFACE} block w-full rounded-2xl px-4 py-3`;

/** Frame interno (VTC, câmera, blocos) */
export const DASHBOARD_INNER_FRAME =
  `${DASHBOARD_HIGHLIGHT_SURFACE} rounded-[1.75rem] p-5`;

/** Nome em listagens — uppercase estático */
export const DASHBOARD_ITEM_NAME =
  "truncate font-serif text-lg font-semibold uppercase tracking-wide text-amber-100";

/** Marca MECCAFIT CENTER — uma linha, tipografia fluida (320px → desktop) */
export const MECCAFIT_CENTER_BRAND =
  "font-serif text-[clamp(0.75rem,2.8vw+0.4rem,1.25rem)] font-semibold uppercase leading-none tracking-[clamp(0.1em,0.04em+0.35vw,0.28em)] drop-shadow-[0_0_12px_rgba(251,191,36,0.28)]";

/** Shell do header — reserva espaço lateral para o botão Sair */
export const MECCAFIT_CENTER_HEADER_SHELL =
  "pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-[max(3.5rem,15vw)] sm:px-[max(5rem,12vw)]";

/** @deprecated Use MECCAFIT_CENTER_BRAND via MeccafitCenterBrand */
export const DASHBOARD_BRAND_TITLE = MECCAFIT_CENTER_BRAND;

export const DASHBOARD_HERO_TITLE =
  "mt-3 text-balance text-[clamp(1.35rem,6vw,2rem)] leading-tight tracking-[0.06em] sm:mt-4 sm:text-5xl sm:tracking-[0.12em] lg:text-6xl";

export const DASHBOARD_PORTAL_PADDING = "rounded-[1.75rem] p-3.5 sm:rounded-[2.25rem] sm:p-6 lg:p-10";

/** Painéis de aba — moldura compartilhada */
export const DASHBOARD_PANEL_FRAME = "rounded-[1.5rem] p-3.5 sm:rounded-[2rem] sm:p-4 lg:p-8";

export const DASHBOARD_PANEL_HEADER =
  "flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/50 pb-4";

export const DASHBOARD_TAB_CONTENT = "mt-4 sm:mt-6";

/** Mantém painéis montados ao trocar aba (preserva estado · evita refetch) */
export function dashboardTabPanelClass(isActive: boolean): string {
  const base = `${DASHBOARD_TAB_CONTENT} min-w-0 max-w-full`;

  if (isActive) {
    return `${base} block`;
  }

  return `${base} hidden overflow-hidden [contain:strict] [content-visibility:hidden]`;
}

export const DASHBOARD_EMPTY_STATE =
  "mt-6 text-sm leading-relaxed text-neutral-500 sm:text-[15px]";

/** Rodapé corporativo FENYXIA — marca da empresa no ecossistema Meccafit */
export const FENYXIA_BRAND_FOOTER_BADGE =
  "text-[10px] font-semibold uppercase tracking-[0.38em] text-neutral-700 transition duration-300 hover:text-amber-500 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]";

export const FENYXIA_BRAND_FOOTER_TAGLINE =
  "mt-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-neutral-800 transition duration-300 group-hover/footer:text-neutral-600";

export const FENYXIA_BRAND_FOOTER_SHELL =
  "group/footer mt-auto border-t border-orange-500/10 pt-6 text-center";

/** Phase evolution — constants aligned with ARGOS migration #19 */

export const PHASE_TIER_LABELS = {
  1: "Cinzas",
  2: "Faísca",
  3: "Brasa",
  4: "Labareda",
  5: "Fogo Cósmico Sagrado",
} as const;

export type PhaseTier = keyof typeof PHASE_TIER_LABELS;

/** Thermal gravity — layout codes (server-authoritative, never client-mutated). */
export type PhaseLayoutCode =
  | "CINZAS"
  | "FAISCA"
  | "BRASA"
  | "LABAREDA"
  | "FOGO_COSMICO";

/** PLUTUS/HERMES — rolling 30-day maintenance volume (kg VTC). */
export const PHASE_2_MAINTENANCE_VTC_30D = 4000.0;
export const PHASE_3_MAINTENANCE_VTC_30D = 16000.0;

/** IRIS/AIGIS — single-session baseline to clear degraded layout (kg VTC). */
export const PHASE_LAYOUT_RESTORATION_SESSION_KG: Record<PhaseLayoutCode, number> = {
  CINZAS: 0,
  FAISCA: 1000,
  BRASA: 1000,
  LABAREDA: 1000,
  FOGO_COSMICO: 1000,
};

export const THERMAL_GRAVITY_RESTORATION_FLASH_MS = 1400;

/** Phase 1 (Cinzas) — strict completion gates */
export const PHASE_ONE_DURATION_HOURS = 168;
export const PHASE_ONE_DURATION_MS = PHASE_ONE_DURATION_HOURS * 60 * 60 * 1000;
export const PHASE_ONE_MIN_SESSIONS = 4;
export const PHASE_ONE_MIN_VTC_KG = 2000;

/** IRIS transmutation breakscreen — timeline olho da Fênix */
export const PHASE_TRANSMUTATION_MS = 12_000;
export const PHASE_TRANSMUTATION_REVEAL_MS = 1_600;
export const PHASE_TRANSMUTATION_HOLD_MS = 5_200;
export const PHASE_TRANSMUTATION_FADE_MS = 2_000;
export const PHASE_TRANSMUTATION_SKIP_AFTER_MS = 6_000;

export const PHASE_TRANSMUTATION_COPY =
  "「A LINHAGEM EVOLUIU · SEU BRASEIRO REIVINDICOU A PRÓXIMA ERA」";

export const PHASE_TRANSMUTATION_SUBLINE = "Nova era desbloqueada";

/** IRIS · olho da Fênix — tokens partilhados com CSS */
export const PHASE_TRANSMUTATION_IRIS = {
  magmaCore: MAGMA_SPECTRUM.magmaCore,
  solarGold: MAGMA_SPECTRUM.solarGold,
  plasmaHot: "#fffef5",
  plasmaAmber: "#fde68a",
  emberDeep: "#c2410c",
  obsidian: "#050505",
  eyeSize: "min(42vw, 11rem)",
  /** Whiteout IRIS lento · passos micro */
  genesisMs: 5_400,
  awakenMs: 5_700,
} as const;

export const PHASE_TIER_STORAGE_PREFIX = "meccafit:phase-tier-ack:";

/** Default cosmetic tokens — overridden only by server custom_preferences */
export const DEFAULT_COSMETIC_THEME = {
  magmaCore: "#FF4500",
  solarGold: "#FFB800",
  ambientGlowOpacity: 0.07,
  panelBlurPx: 12,
} as const;

export const DEFAULT_LAYOUT_SCALE = 1;

/** Cards de exercício — pulso brasa-viva-card 4s (só box-shadow externo) */
export const BRASA_VIVA_CARD =
  "brasa-viva-card border border-orange-500/15 bg-neutral-950/60 backdrop-blur-md";

/** Título plasma — gradiente âmbar viscoso 4s */
export const PLASMA_TITLE =
  "plasma-viscous-text bg-clip-text font-serif uppercase text-transparent";

/** Nome do exercício — destaque estático (sem plasma) */
export const EXERCISE_NAME_ACTIVE =
  "min-w-0 text-balance font-serif text-xl font-semibold uppercase leading-snug tracking-[0.05em] text-amber-50 sm:text-2xl sm:leading-tight";

export const EXERCISE_NAME_IDLE =
  "min-w-0 text-balance font-serif text-xl uppercase leading-snug tracking-[0.05em] text-neutral-400/90 sm:text-2xl sm:leading-tight";

/** Meta prescrição — linha abaixo das métricas */
export const EXERCISE_RECORD_META =
  "mt-2.5 text-[10px] font-normal normal-case leading-relaxed tracking-normal text-neutral-500 sm:text-[11px]";

export const EXERCISE_RECORD_TERM =
  "font-semibold uppercase tracking-[0.1em] text-amber-500/85";

/** Fase inativa / fila — mantém borda brasão no selo 「Na fila」 */
export const EXERCISE_PHASE_IDLE =
  `${BRASAO_LIGHT_CAPSULE} px-3 py-1.5 text-[10px] tracking-[0.14em] text-neutral-500`;

/** Progresso de séries — em andamento */
export const EXERCISE_SERIES_PROGRESS =
  `${EXERCISE_SERIES_CHIP} tabular-nums`;

/** Progresso de séries — prescrição concluída (incandescência) */
export const EXERCISE_SERIES_COMPLETE =
  "brasao-light-border exercise-series-complete inline-flex shrink-0 items-center rounded-full tabular-nums px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD700]/95 bg-gradient-to-r from-amber-950/55 to-black/60 shadow-[0_0_14px_rgba(255,215,0,0.16)]";

/** Fase concluída — selo carbonizado (cinzas da fênix, paridade com EM CHAMAS) */
export const EXERCISE_PHASE_FORJADO =
  "exercise-forjado-forge pointer-events-none inline-flex shrink-0";

/** Cápsulas métricas — exercício forjado */
export const EXERCISE_CAPSULE_COMPLETE =
  "brasao-light-border exercise-series-complete shrink-0 rounded-full bg-black/45 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#FFD700]/85";

export const EXERCISE_CARD_ACTIVE = "opacity-100";
export const EXERCISE_CARD_IDLE = "opacity-[0.82] saturate-[0.85]";
export const EXERCISE_CARD_COMPLETE = "opacity-100 saturate-[1.02]";
export const EXERCISE_CARD_COMPLETE_FRAME =
  "exercise-card-complete shadow-[0_0_36px_rgba(255,215,0,0.12)] bg-neutral-950/65";

export const EXERCISE_CARD_SELECTED_FRAME = "exercise-card-selected";

/** Card em superação — brilho heráldico temporário (globals.css) */
export const EXERCISE_CARD_SUPERACAO_FRAME = "exercise-card-superacao";

/** Nome do exercício — prescrição concluída */
export const EXERCISE_NAME_COMPLETE =
  "min-w-0 text-balance font-serif text-xl font-semibold uppercase leading-snug tracking-[0.05em] text-[#FFD700]/88 sm:text-2xl sm:leading-tight";

/** Hero RENASÇA HOJE — plasma puro, sem bordas */
export const PLASMA_HERO_TITLE =
  `${PLASMA_TITLE} text-3xl font-semibold tracking-[0.12em] sm:text-5xl`;

/** Brasão — fênix do login com iluminação equilibrada para o dashboard */
export const PHOENIX_EMBLEM_AURA =
  "pointer-events-none absolute rounded-full blur-3xl";

export const PHOENIX_EMBLEM_SVG =
  "relative fill-none motion-safe:animate-[fenyxia-pulse_1s_ease-in-out_infinite] filter drop-shadow-[0_0_18px_rgba(234,88,12,0.44)] motion-safe:will-change-transform";

export const SUPERACAO_OVERLAY_TEXT =
  "superacao-overlay-title relative font-serif text-[clamp(2rem,10vw,4.5rem)] font-semibold uppercase leading-[0.95] tracking-[0.14em] sm:tracking-[0.18em] lg:text-[clamp(3.25rem,7vw,5rem)]";

export const SUPERACAO_OVERLAY_SUBLINE =
  "superacao-overlay-subline mt-3 font-serif text-[10px] font-medium uppercase tracking-[0.38em] text-amber-400/75 sm:mt-4 sm:text-[11px]";

export const VIDEO_MODAL_PANEL = `${BRASA_PANEL} rounded-[2rem]`;

/** Borda ativa — mesma moldura brasão dos cards de exercício */
export const PHOENIX_INPUT_BRASAO_SHELL = "brasao-light-border w-full rounded-xl";

/** Classes do PhoenixInput — Top Weight compacto */
export const PHOENIX_INPUT_SURFACE = {
  wrapper: "flex w-full max-w-[min(100%,15rem)] flex-col items-center gap-2 sm:max-w-[15rem]",
  field:
    "min-h-11 w-full rounded-xl border border-orange-500/20 bg-black px-4 py-3 text-center font-serif text-lg tracking-wide text-amber-400 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-orange-500/35 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xl",
  fieldBrasao:
    "rounded-[11px] border-transparent bg-black shadow-none focus:border-transparent focus:shadow-none focus-visible:ring-0",
  fieldPulse: "",
  fieldError: "border-red-500/60",
  label: "text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400/85",
  meta: "text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600",
  hint: "text-center text-[10px] uppercase tracking-[0.16em] text-neutral-700",
  saving: "text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/70",
} as const;
