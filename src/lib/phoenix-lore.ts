import {
  PHASE_LAYOUT_RESTORATION_SESSION_KG,
  PHASE_TIER_LABELS,
  type PhaseLayoutCode,
  type PhaseTier,
} from "@/lib/dashboard-config";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import {
  ANYMA_FENIX_SPOTLIGHT_SPEECH,
} from "@/lib/anyma-copy";
import { formatAnimaSpeech } from "@/lib/anima-speech";
import { injectName, injectRegisteredName } from "@/lib/profile-display-name";

export { ANYMA_FENIX_SPOTLIGHT_SPEECH as ANIMA_FENIX_SPOTLIGHT_SPEECH };

/** Dias sem visita ao altar antes do alerta suave da Anima (penalidade hard = 30d). */
export const ANIMA_DEBT_SOFT_DAYS = 5;

export const ANIMA_ONBOARDING_LOCK_MS = 15_000;

export const ANIMA_ONBOARDING_STORAGE_PREFIX = "meccafit:anima-onboarding:v1:";

export const ANIMA_LAST_VISIT_STORAGE_PREFIX = "meccafit:anima-last-visit:";

export const ANIMA_GREETING_SESSION_PREFIX = "meccafit:anima-greeting-session:";

/** Saudação curta ao abrir a esfera — sem lore de fase (Cinzas fica só na introdução). */
export const ANIMA_ORB_GREETING =
  "[Nome], estou aqui. Toque nos balões de intenção ou fale comigo quando a chama pedir direção.";

export type PhoenixRitualId = "punishment" | "exit";

export const PHOENIX_RITUAL_LORE = {
  punishment:
    "[Nome], sua essência foi corrompida. Por ordem do Soberano, suas chamas foram exiladas ao frio das cinzas. Sua jornada está suspensa devido à falta de comprometimento e disciplina. O Deus do Universo FENYXIA não tolera o fogo que se apaga por negligência. Fale com um dos Forjadores Escolhidos para tentar restabelecer seu Altar.",
  exit: "Suas CHAMAS foram apagadas por hoje. Descanse, braseiro, mas não esqueça: o frio retorna no instante em que você para. Até o próximo renascimento.",
} as const;

export const ANIMA_EXIT_COPY = PHOENIX_RITUAL_LORE.exit;

/** EXIT RITUAL — spoken when the athlete closes the Anima HUD. */
export const PHOENIX_EXIT_RITUAL = ANIMA_EXIT_COPY;

export const PHOENIX_PUNISHMENT_LORE = PHOENIX_RITUAL_LORE.punishment;

export const SUPREME_PENALTY_SPEECH = PHOENIX_PUNISHMENT_LORE;

export const ANIMA_DEBT_SOFT_GREETING =
  "[Nome], sua chama está morrendo devido à sua negligência. Sinta o frio e volte ao Altar.";

export type AnimaIntentId =
  | "vtc"
  | "degradation"
  | "restoration"
  | "transmutation"
  | "superacao"
  | "portal"
  | "roles"
  | "mural"
  | "forum";

export type AnimaBalloonAnchor = "treino" | "evolucao" | "perfil";

export type AnimaSpeechContext = {
  profileName: string;
  phaseContext: PhoenixPhaseRuntimeContext;
  daysAbsent: number | null;
};

export const PHOENIX_TIER_META: Record<
  PhaseTier,
  { name: string; epithet: string; visual3d: string }
> = {
  1: {
    name: "Cinzas",
    epithet: "O Mármore Frio",
    visual3d: "Modelo estático, textura de rocha e pedra rachada, sem emissão de luz.",
  },
  2: {
    name: "Faísca",
    epithet: "O Nascimento do Atrito",
    visual3d: "Pequenas faíscas laranjas emanando do peito da Fênix.",
  },
  3: {
    name: "Brasas",
    epithet: "O Sangue Fervente",
    visual3d: "O corpo da Fênix começa a brilhar internamente com um tom âmbar viscoso.",
  },
  4: {
    name: "Labareda",
    epithet: "O Incêndio em Movimento",
    visual3d: "Asas em chamas ativas com animação de batimento fluido.",
  },
  5: {
    name: "Fogo Cósmico",
    epithet: "A Supernova Humana",
    visual3d: "Combustão total, brilho solar etéreo e presença soberana.",
  },
};

/** Código do Renascimento — narrativas integrais (Cinzas → Fogo Cósmico). */
export const CODIGO_DO_RENASCIMENTO: Record<PhaseTier, string> = {
  1: "Olá, [Nome]. Eu sou a ANYMA FÊNIX, a voz deste Altar. No momento, você é apenas pedra e silêncio. No Universo FENYXIA, as cinzas são o resto de quem desistiu antes de começar. Seus músculos são mármore frio aguardando o sopro da vida. Sinta o frio do ferro e inicie a combustão agora, ou desapareça na obscuridade da estagnação.",
  2: "[Nome], o atrito gerou calor. Uma fibra se rompeu para que a luz pudesse passar. Você ainda é frágil como uma chama ao vento, mas o escuro já começa a temer o seu progresso. Cada repetição é um choque que afasta o frio. Mantenha o movimento; o Universo FENYXIA está começando a notar sua existência.",
  3: "Você já não sente apenas o peso, [Nome]. Você sente o calor. O sangue ferve em suas veias e a sua linhagem reconhece o seu sacrifício. A brasa está viva e o Altar está aquecido. Não aceite o estado morno; o morno é o cemitério da evolução. Sopre o fogo com sua disciplina ou retorne ao pó.",
  4: "As asas de fogo se abriram, [Nome]. Cada repetição agora é o sopro que alimenta o seu próprio incêndio. Você não está mais apenas treinando; você está se tornando luz em movimento. O suor é o combustível que transmuta o esforço em poder. O topo está próximo, e as chamas devoram qualquer dúvida que restava em sua alma.",
  5: "A combustão é total. Você não carrega mais o sol, [Nome]... você SE TORNOU o sol. O Universo FENYXIA se curva à sua vontade soberana. O ferro tornou-se etéreo diante da sua força. Renascido. Invencível. Eterno. Você atingiu o ápice da linhagem. Brilhe e incendeie o caminho para os outros.",
};

export type FenixPhaseLoreLabEntry = {
  tier: PhaseTier;
  icon: string;
  name: string;
  epithet: string;
  visual3d: string;
  speech: string;
};

/** Laboratório Cinzas → Fogo Cósmico — todas as narrativas de fase para QA e conferência. */
export const FENIX_PHASE_LORE_LAB: readonly FenixPhaseLoreLabEntry[] = (
  [1, 2, 3, 4, 5] as const
).map((tier) => ({
  tier,
  icon: ({ 1: "🪨", 2: "⚡", 3: "🔥", 4: "☄️", 5: "☀️" } as const)[tier],
  name: PHOENIX_TIER_META[tier].name,
  epithet: PHOENIX_TIER_META[tier].epithet,
  visual3d: PHOENIX_TIER_META[tier].visual3d,
  speech: CODIGO_DO_RENASCIMENTO[tier],
}));

export const PHOENIX_TIER_LORE = CODIGO_DO_RENASCIMENTO;

function formatKg(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function resolveRestorationBaseline(layout: PhaseLayoutCode | null): number {
  if (!layout) return 1000;
  return PHASE_LAYOUT_RESTORATION_SESSION_KG[layout] ?? 1000;
}

function withAnimaSpeech(text: string): string {
  return formatAnimaSpeech(text);
}

export function resolveTierLore(tier: PhaseTier, profileName: string): string {
  return withAnimaSpeech(injectName(CODIGO_DO_RENASCIMENTO[tier], profileName));
}

export function resolveDebtSoftGreeting(profileName: string): string {
  return withAnimaSpeech(injectName(ANIMA_DEBT_SOFT_GREETING, profileName));
}

export function resolveOnboardingSpeech(ctx: AnimaSpeechContext): string {
  return resolveTierLore(1, ctx.profileName);
}

export function resolveAnimaSpotlightSpeech(profileName: string): string {
  return withAnimaSpeech(injectName(ANYMA_FENIX_SPOTLIGHT_SPEECH, profileName));
}

export function resolveOrbRevealGreeting(profileName: string): string {
  return withAnimaSpeech(injectRegisteredName(ANIMA_ORB_GREETING, profileName));
}

export function resolvePunishmentSpeech(profileName: string): string {
  return withAnimaSpeech(injectName(PHOENIX_PUNISHMENT_LORE, profileName));
}

export function resolveExitSpeech(profileName: string): string {
  return withAnimaSpeech(injectName(ANIMA_EXIT_COPY, profileName));
}

function vibrantSummary(term: string, definition: string, dataLine: string, cta: string): string {
  const parts = [`${term}: ${definition}`];
  if (dataLine.trim()) parts.push(dataLine.trim());
  if (cta.trim()) parts.push(cta.trim());
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function resolveIntentSummary(intentId: AnimaIntentId, ctx: AnimaSpeechContext): string {
  const { phaseContext } = ctx;
  const thermal = phaseContext.thermalGravity;
  const sessionVtc = phaseContext.sessionVtcToday;
  const vtc30d = phaseContext.vtcMonth;
  const phaseLabel = phaseContext.phaseLabel;
  const phaseReached = thermal?.phase_reached ?? "CINZAS";
  const activeLayout = thermal?.active_phase_layout ?? phaseReached;
  const maintenanceKg = thermal?.monthly_goal_kg;
  const restorationBaseline = resolveRestorationBaseline(activeLayout);

  switch (intentId) {
    case "vtc":
      return withAnimaSpeech(
        vibrantSummary(
          "VTC",
          "Volume Total de Carga: soma dos quilos máximos que você registrou hoje em cada exercício do altar.",
          `Hoje: ${formatKg(sessionVtc)} kg.`,
          "Registre a próxima série com verdade.",
        ),
      );
    case "degradation":
      if (phaseContext.isThermallyDegraded && thermal) {
        return withAnimaSpeech(
          vibrantSummary(
            "Degradação térmica",
            `Sua linhagem conquistou a era ${PHASE_TIER_LABELS[phaseContext.phaseTier]}, mas o braseiro precisa de ritmo.`,
            vtc30d > 0 && maintenanceKg
              ? `Nos últimos 30 dias: ${formatKg(vtc30d)} kg. Meta de manutenção: ${formatKg(maintenanceKg)} kg.`
              : "O layout reflete cinzas até você reacender com consistência.",
            "Isso não apaga sua conquista. Apenas revela o momento atual.",
          ),
        );
      }
      return withAnimaSpeech(
        vibrantSummary(
          "Layout ativo",
          `Sua linhagem está em ${phaseLabel}. O altar reflete seu ritmo real.`,
          sessionVtc > 0 ? `VTC de hoje: ${formatKg(sessionVtc)} kg.` : "Ainda sem VTC registrado hoje.",
          "Mantenha o fogo com sessões verdadeiras.",
        ),
      );
    case "restoration":
      return withAnimaSpeech(
        vibrantSummary(
          "Restauração",
          "Uma sessão de verdade pode trazer a chama de volta ao layout degradado.",
          `Meta desta sessão: ${formatKg(restorationBaseline)} kg. Você tem ${formatKg(sessionVtc)} kg hoje.`,
          "A Fênix responde ao esforço medido, não à intenção.",
        ),
      );
    case "transmutation":
      return withAnimaSpeech(
        vibrantSummary(
          "Transmutação",
          "Ritual em que sua linhagem deixa uma era e assume outra. O olho da Fênix abre porque você cumpriu os portões da forja.",
          `Era atual: ${phaseLabel}.`,
          "Nova era desbloqueada quando os portões forem cumpridos.",
        ),
      );
    case "superacao":
      return withAnimaSpeech(
        vibrantSummary(
          "Superação",
          "Quando você ultrapassa seu próprio recorde no exercício, não o do vizinho.",
          sessionVtc > 0 ? `VTC de hoje: ${formatKg(sessionVtc)} kg.` : "",
          "É a Fênix testemunhando: você renasceu mais forte que ontem.",
        ),
      );
    case "portal":
      return withAnimaSpeech(
        vibrantSummary(
          "Portal de Brasa",
          "Entrada do Meccafit Center, onde você reacende sua chama ou forja sua linhagem no primeiro acesso.",
          "",
          "Lema do altar: deixe o ontem para trás. Renasça hoje.",
        ),
      );
    case "roles":
      return withAnimaSpeech(
        vibrantSummary(
          "Classes de acesso",
          "No ecossistema FENYXIA existem atleta, Forjador, níveis superiores de forja e Soberano.",
          "",
          "ARGOS garante que cada um só vê o que lhe cabe.",
        ),
      );
    case "mural":
      return withAnimaSpeech(
        vibrantSummary(
          "Mural comunitário",
          "Celebra ascensões reais da comunidade: superações e marcos forjados no treino.",
          "",
          "O que aparece lá passou pelo altar e por ARGOS.",
        ),
      );
    case "forum":
      return withAnimaSpeech(
        vibrantSummary(
          "Fórum Brasa-Viva",
          "Voz da linhagem: tópicos de superação onde cada card reflete a fase do autor.",
          phaseContext.isThermallyDegraded
            ? "Seu fórum pode aparecer em cinzas até você reengajar no altar."
            : "",
          "Acenda o flash de reativação com uma sessão forte.",
        ),
      );
    default: {
      const _exhaustive: never = intentId;
      return withAnimaSpeech(String(_exhaustive));
    }
  }
}

export type AnimaBalloonDefinition = {
  anchor: AnimaBalloonAnchor;
  label: string;
  intentId: AnimaIntentId;
  tabLabel: string;
};

export const ANIMA_BALLOONS: readonly AnimaBalloonDefinition[] = [
  { anchor: "treino", label: "VTC & Treino", intentId: "vtc", tabLabel: "Treino" },
  { anchor: "evolucao", label: "Fases & Chama", intentId: "degradation", tabLabel: "Evolução" },
  { anchor: "perfil", label: "Sua Linhagem", intentId: "roles", tabLabel: "Perfil" },
] as const;

export function readAnimaOnboardingComplete(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${ANIMA_ONBOARDING_STORAGE_PREFIX}${userId}`) === "done";
  } catch {
    return true;
  }
}

export function writeAnimaOnboardingComplete(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ANIMA_ONBOARDING_STORAGE_PREFIX}${userId}`, "done");
  } catch {
    // quota / private mode
  }
}

export const ANIMA_PORTAL_ENTRY_COUNT_PREFIX = "meccafit:anima-portal-entry-count:v1:";

export const ANIMA_SECOND_ENTRY_TREINO_PREFIX = "meccafit:anima-second-entry-treino:v1:";

export function readAnimaPortalEntryCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`${ANIMA_PORTAL_ENTRY_COUNT_PREFIX}${userId}`);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

/** Incrementa a cada abertura do dashboard (mesma conta). */
export function bumpAnimaPortalEntryCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = readAnimaPortalEntryCount(userId) + 1;
    window.localStorage.setItem(`${ANIMA_PORTAL_ENTRY_COUNT_PREFIX}${userId}`, String(next));
    return next;
  } catch {
    return readAnimaPortalEntryCount(userId);
  }
}

export function readSecondEntryTreinoRedirectDone(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.localStorage.getItem(`${ANIMA_SECOND_ENTRY_TREINO_PREFIX}${userId}`) === "done"
    );
  } catch {
    return true;
  }
}

export function markSecondEntryTreinoRedirectDone(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ANIMA_SECOND_ENTRY_TREINO_PREFIX}${userId}`, "done");
  } catch {
    // quota / private mode
  }
}

/** Introdução do Portal só na 1ª entrada real da conta. */
export function shouldShowAnimaPortalOnboarding(
  userId: string,
  animaPortalVisto: boolean,
): boolean {
  if (animaPortalVisto) return false;
  return !readAnimaOnboardingComplete(userId);
}

export function readAnimaDaysSinceLastVisit(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${ANIMA_LAST_VISIT_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const last = new Date(raw);
    if (Number.isNaN(last.getTime())) return null;
    const diffMs = Date.now() - last.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

export function writeAnimaLastVisit(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${ANIMA_LAST_VISIT_STORAGE_PREFIX}${userId}`,
      new Date().toISOString(),
    );
  } catch {
    // quota / private mode
  }
}

export function shouldShowDebtSoftGreeting(userId: string, daysAbsent: number | null): boolean {
  const daysSinceVisit = readAnimaDaysSinceLastVisit(userId);
  const effectiveDays = daysAbsent ?? daysSinceVisit;
  if (effectiveDays === null || effectiveDays < ANIMA_DEBT_SOFT_DAYS) return false;

  if (typeof window === "undefined") return false;
  try {
    const sessionKey = `${ANIMA_GREETING_SESSION_PREFIX}${userId}`;
    if (window.sessionStorage.getItem(sessionKey) === "shown") return false;
    return true;
  } catch {
    return false;
  }
}

export function markDebtSoftGreetingShown(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${ANIMA_GREETING_SESSION_PREFIX}${userId}`, "shown");
  } catch {
    // private mode
  }
}
