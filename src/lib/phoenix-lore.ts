import {
  PHASE_LAYOUT_RESTORATION_SESSION_KG,
  PHASE_TIER_LABELS,
  type PhaseLayoutCode,
  type PhaseTier,
} from "@/lib/dashboard-config";
import type { PhoenixPhaseRuntimeContext } from "@/components/dashboard/PhoenixPhaseEngine";
import {
  ANYMA_DEBT_SOFT_DAYS,
  ANYMA_DEBT_SOFT_GREETING,
  ANYMA_FENIX_SPOTLIGHT_SPEECH,
  ANYMA_ONBOARDING_LOCK_MS,
  ANYMA_ORB_GREETING,
  ANYMA_RETURNING_LOGIN_BEATS,
  ANYMA_RETURNING_LOGIN_PAUSE_MS,
  ANYMA_RETURNING_LOGIN_SPEECH,
} from "@/lib/anyma-copy";
import { clearSpotlightBeatProgress } from "@/lib/anima-perfil-identity-beats";
import { formatAnymaSpeech } from "@/lib/anima-speech";
import { injectName, injectRegisteredName } from "@/lib/profile-display-name";

export {
  ANYMA_DEBT_SOFT_DAYS,
  ANYMA_DEBT_SOFT_GREETING,
  ANYMA_FENIX_SPOTLIGHT_SPEECH,
  ANYMA_ONBOARDING_LOCK_MS,
  ANYMA_ORB_GREETING,
  ANYMA_RETURNING_LOGIN_BEATS,
  ANYMA_RETURNING_LOGIN_PAUSE_MS,
  ANYMA_RETURNING_LOGIN_SPEECH,
};

/** @deprecated Use ANYMA_* — marca canônica é ANYMA. */
export const ANIMA_FENIX_SPOTLIGHT_SPEECH = ANYMA_FENIX_SPOTLIGHT_SPEECH;
/** @deprecated Use ANYMA_DEBT_SOFT_DAYS */
export const ANIMA_DEBT_SOFT_DAYS = ANYMA_DEBT_SOFT_DAYS;
/** @deprecated Use ANYMA_ONBOARDING_LOCK_MS */
export const ANIMA_ONBOARDING_LOCK_MS = ANYMA_ONBOARDING_LOCK_MS;
/** @deprecated Use ANYMA_ORB_GREETING */
export const ANIMA_ORB_GREETING = ANYMA_ORB_GREETING;
/** @deprecated Use ANYMA_RETURNING_LOGIN_SPEECH */
export const ANIMA_RETURNING_LOGIN_SPEECH = ANYMA_RETURNING_LOGIN_SPEECH;
/** @deprecated Use ANYMA_RETURNING_LOGIN_BEATS */
export const ANIMA_RETURNING_LOGIN_BEATS = ANYMA_RETURNING_LOGIN_BEATS;
/** @deprecated Use ANYMA_DEBT_SOFT_GREETING */
export const ANIMA_DEBT_SOFT_GREETING = ANYMA_DEBT_SOFT_GREETING;

/**
 * Prefixos de storage legados — NÃO alterar as strings (estado local do atleta).
 * Nomes de constante canônicos: ANYMA_*; aliases ANIMA_* mantidos.
 */
export const ANYMA_ONBOARDING_STORAGE_PREFIX = "meccafit:anima-onboarding:v1:";
export const ANYMA_LAST_VISIT_STORAGE_PREFIX = "meccafit:anima-last-visit:";
export const ANYMA_GREETING_SESSION_PREFIX = "meccafit:anima-greeting-session:";
export const ANYMA_RETURNING_LOGIN_SESSION_PREFIX =
  "meccafit:anima-returning-login-session:v5:";
export const ANYMA_RETURNING_LOGIN_PENDING_PREFIX =
  "meccafit:anima-returning-login-pending:v1:";
/**
 * Número de entrada FIXADO para a sessão de login atual (sessionStorage).
 * Estabiliza o "Bem-vindo": reload/navegação reaproveitam o mesmo número e não
 * retocam a saudação; logout limpa e o próximo login recebe um número novo.
 */
export const ANYMA_RETURNING_LOGIN_ACTIVE_PREFIX =
  "meccafit:anima-returning-login-active:v1:";
export const ANYMA_RETURNING_LOGIN_EVENT = "meccafit:anyma-returning-login";
/** @deprecated Use ANYMA_ONBOARDING_STORAGE_PREFIX */
export const ANIMA_ONBOARDING_STORAGE_PREFIX = ANYMA_ONBOARDING_STORAGE_PREFIX;
/** @deprecated Use ANYMA_LAST_VISIT_STORAGE_PREFIX */
export const ANIMA_LAST_VISIT_STORAGE_PREFIX = ANYMA_LAST_VISIT_STORAGE_PREFIX;
/** @deprecated Use ANYMA_GREETING_SESSION_PREFIX */
export const ANIMA_GREETING_SESSION_PREFIX = ANYMA_GREETING_SESSION_PREFIX;

export type PhoenixRitualId = "punishment" | "exit";

export const PHOENIX_RITUAL_LORE = {
  punishment:
    "[Nome], sua essência foi corrompida. Por ordem do Soberano, suas chamas foram exiladas ao frio das cinzas. Sua jornada está suspensa devido à falta de comprometimento e disciplina. O Deus do Universo FENYXIA não tolera o fogo que se apaga por negligência. Fale com um dos Forjadores Escolhidos para tentar restabelecer seu Altar.",
  exit: "Suas CHAMAS foram apagadas por hoje. Descanse, braseiro, mas não esqueça. O frio retorna no instante em que você para. Até o próximo renascimento.",
} as const;

export const ANYMA_EXIT_COPY = PHOENIX_RITUAL_LORE.exit;
/** @deprecated Use ANYMA_EXIT_COPY */
export const ANIMA_EXIT_COPY = ANYMA_EXIT_COPY;

/** EXIT RITUAL — falado quando o atleta fecha o HUD da ANYMA. */
export const PHOENIX_EXIT_RITUAL = ANYMA_EXIT_COPY;

export const PHOENIX_PUNISHMENT_LORE = PHOENIX_RITUAL_LORE.punishment;

export const SUPREME_PENALTY_SPEECH = PHOENIX_PUNISHMENT_LORE;

export type AnymaIntentId =
  | "vtc"
  | "degradation"
  | "restoration"
  | "transmutation"
  | "superacao"
  | "portal"
  | "roles"
  | "mural"
  | "forum";

/** @deprecated Use AnymaIntentId */
export type AnimaIntentId = AnymaIntentId;

export type AnymaBalloonAnchor = "treino" | "evolucao" | "perfil";
/** @deprecated Use AnymaBalloonAnchor */
export type AnimaBalloonAnchor = AnymaBalloonAnchor;

export type AnymaSpeechContext = {
  profileName: string;
  phaseContext: PhoenixPhaseRuntimeContext;
  daysAbsent: number | null;
};
/** @deprecated Use AnymaSpeechContext */
export type AnimaSpeechContext = AnymaSpeechContext;

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
  2: "[Nome], o atrito gerou calor. Uma fibra se rompeu para que a luz pudesse passar. Você ainda é frágil como uma chama ao vento, mas o escuro já começa a temer o seu progresso. Cada repetição é um choque que afasta o frio. Mantenha o movimento. O Universo FENYXIA está começando a notar sua existência.",
  3: "Você já não sente apenas o peso, [Nome]. Você sente o calor. O sangue ferve em suas veias e a sua linhagem reconhece o seu sacrifício. A brasa está viva e o Altar está aquecido. Não aceite o estado morno. O morno é o cemitério da evolução. Sopre o fogo com sua disciplina ou retorne ao pó.",
  4: "As asas de fogo se abriram, [Nome]. Cada repetição agora é o sopro que alimenta o seu próprio incêndio. Você não está mais apenas treinando. Você está se tornando luz em movimento. O suor é o combustível que transmuta o esforço em poder. O topo está próximo, e as chamas devoram qualquer dúvida que restava em sua alma.",
  5: "A combustão é total. Você não carrega mais o sol, [Nome]. Você se tornou o sol. O Universo FENYXIA se curva à sua vontade soberana. O ferro tornou-se etéreo diante da sua força. Renascido. Invencível. Eterno. Você atingiu o ápice da linhagem. Brilhe e incendeie o caminho para os outros.",
};

export const PHOENIX_TIER_LORE = CODIGO_DO_RENASCIMENTO;

function formatKg(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function resolveRestorationBaseline(layout: PhaseLayoutCode | null): number {
  if (!layout) return 1000;
  return PHASE_LAYOUT_RESTORATION_SESSION_KG[layout] ?? 1000;
}

function withAnymaSpeech(text: string): string {
  return formatAnymaSpeech(text);
}

export function resolveTierLore(tier: PhaseTier, profileName: string): string {
  return withAnymaSpeech(injectName(CODIGO_DO_RENASCIMENTO[tier], profileName));
}

export function resolveDebtSoftGreeting(profileName: string): string {
  return withAnymaSpeech(injectName(ANYMA_DEBT_SOFT_GREETING, profileName));
}

export function resolveOnboardingSpeech(ctx: AnymaSpeechContext): string {
  return resolveTierLore(1, ctx.profileName);
}

export function resolveAnymaSpotlightSpeech(profileName: string): string {
  return withAnymaSpeech(injectName(ANYMA_FENIX_SPOTLIGHT_SPEECH, profileName));
}

/** @deprecated Use resolveAnymaSpotlightSpeech */
export const resolveAnimaSpotlightSpeech = resolveAnymaSpotlightSpeech;

export function resolveOrbRevealGreeting(profileName: string): string {
  return withAnymaSpeech(injectRegisteredName(ANYMA_ORB_GREETING, profileName));
}

export function resolvePunishmentSpeech(profileName: string): string {
  return withAnymaSpeech(injectName(PHOENIX_PUNISHMENT_LORE, profileName));
}

export function resolveExitSpeech(profileName: string): string {
  return withAnymaSpeech(injectName(ANYMA_EXIT_COPY, profileName));
}

function vibrantSummary(term: string, definition: string, dataLine: string, cta: string): string {
  const parts = [`${term}. ${definition}`];
  if (dataLine.trim()) parts.push(dataLine.trim());
  if (cta.trim()) parts.push(cta.trim());
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function resolveIntentSummary(intentId: AnymaIntentId, ctx: AnymaSpeechContext): string {
  const { phaseContext } = ctx;
  const thermal = phaseContext.thermalGravity;
  const sessionVtc = phaseContext.sessionVtcToday;
  const vtc30d = phaseContext.vtcMonth;
  const phaseLabel = phaseContext.phaseLabel;
  const phaseReached = thermal?.phase_reached ?? "CINZAS";
  const activeLayout = thermal?.active_phase_layout ?? phaseReached;
  const maintenanceKg = thermal?.monthly_maintenance_goal_kg ?? thermal?.monthly_goal_kg;
  const restorationBaseline = resolveRestorationBaseline(activeLayout);

  switch (intentId) {
    case "vtc":
      return withAnymaSpeech(
        vibrantSummary(
          "VTC",
          "Volume Total de Carga. Soma dos quilos máximos que você registrou hoje em cada exercício do altar.",
          `Hoje você forjou ${formatKg(sessionVtc)} kg.`,
          "Registre a próxima carga máxima com verdade.",
        ),
      );
    case "degradation":
      if (phaseContext.isThermallyDegraded && thermal) {
        return withAnymaSpeech(
          vibrantSummary(
            "Degradação térmica",
            `Sua linhagem conquistou a era ${PHASE_TIER_LABELS[phaseContext.phaseTier]}, mas o braseiro precisa de ritmo.`,
            vtc30d > 0 && maintenanceKg
              ? `Nos últimos trinta dias você forjou ${formatKg(vtc30d)} kg. A meta de manutenção é ${formatKg(maintenanceKg)} kg.`
              : "O layout reflete cinzas até você reacender com consistência.",
            "Isso não apaga sua conquista. Apenas revela o momento atual.",
          ),
        );
      }
      return withAnymaSpeech(
        vibrantSummary(
          "Layout ativo",
          `Sua linhagem está em ${phaseLabel}. O altar reflete seu ritmo real.`,
          sessionVtc > 0 ? `Volume Total De Carga (VTC) de hoje, ${formatKg(sessionVtc)} kg.` : "Ainda sem Volume Total De Carga (VTC) registrado hoje.",
          "Mantenha o fogo com sessões verdadeiras.",
        ),
      );
    case "restoration":
      return withAnymaSpeech(
        vibrantSummary(
          "Restauração",
          "Uma sessão de verdade pode trazer a chama de volta ao layout degradado.",
          `A meta desta sessão é ${formatKg(restorationBaseline)} kg. Você tem ${formatKg(sessionVtc)} kg hoje.`,
          "A Fênix responde ao esforço medido, não à intenção.",
        ),
      );
    case "transmutation":
      return withAnymaSpeech(
        vibrantSummary(
          "Transmutação",
          "Ritual em que sua linhagem deixa uma era e assume outra. O olho da Fênix abre porque você cumpriu os portões da forja.",
          `Sua era atual é ${phaseLabel}.`,
          "Nova era desbloqueada quando os portões forem cumpridos.",
        ),
      );
    case "superacao":
      return withAnymaSpeech(
        vibrantSummary(
          "Superação",
          "Quando você ultrapassa seu próprio recorde no exercício, não o do vizinho.",
          sessionVtc > 0 ? `Volume Total De Carga (VTC) de hoje, ${formatKg(sessionVtc)} kg.` : "",
          "É a Fênix testemunhando. Você renasceu mais forte que ontem.",
        ),
      );
    case "portal":
      return withAnymaSpeech(
        vibrantSummary(
          "Portal de Brasa",
          "Entrada do Meccafit Center, onde você reacende sua chama ou forja sua linhagem no primeiro acesso.",
          "",
          "Lema do altar: deixe o ontem para trás. Renasça hoje.",
        ),
      );
    case "roles":
      return withAnymaSpeech(
        vibrantSummary(
          "Classes de acesso",
          "No ecossistema FENYXIA existem atleta, Forjador, níveis superiores de forja e Soberano.",
          "",
          "A linhagem FENYXIA garante que cada um só vê o que lhe cabe.",
        ),
      );
    case "mural":
      return withAnymaSpeech(
        vibrantSummary(
          "Mural comunitário",
          "Celebra ascensões reais da comunidade: superações e marcos forjados no treino.",
          "",
          "O que aparece lá passou pelo altar da linhagem FENYXIA.",
        ),
      );
    case "forum":
      return withAnymaSpeech(
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
      return withAnymaSpeech(String(_exhaustive));
    }
  }
}

export type AnymaBalloonDefinition = {
  anchor: AnymaBalloonAnchor;
  label: string;
  intentId: AnymaIntentId;
  tabLabel: string;
};
/** @deprecated Use AnymaBalloonDefinition */
export type AnimaBalloonDefinition = AnymaBalloonDefinition;

export const ANYMA_BALLOONS: readonly AnymaBalloonDefinition[] = [
  { anchor: "treino", label: "VTC & Treino", intentId: "vtc", tabLabel: "Treino" },
  { anchor: "evolucao", label: "Fases & Chama", intentId: "degradation", tabLabel: "Evolução" },
  { anchor: "perfil", label: "Perfil", intentId: "roles", tabLabel: "Perfil" },
] as const;
/** @deprecated Use ANYMA_BALLOONS */
export const ANIMA_BALLOONS = ANYMA_BALLOONS;

export function readAnymaOnboardingComplete(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${ANYMA_ONBOARDING_STORAGE_PREFIX}${userId}`) === "done";
  } catch {
    return true;
  }
}
/** @deprecated Use readAnymaOnboardingComplete */
export const readAnimaOnboardingComplete = readAnymaOnboardingComplete;

export function writeAnymaOnboardingComplete(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ANYMA_ONBOARDING_STORAGE_PREFIX}${userId}`, "done");
  } catch {
    // quota / private mode
  }
}
/** @deprecated Use writeAnymaOnboardingComplete */
export const writeAnimaOnboardingComplete = writeAnymaOnboardingComplete;

/** Strings de storage legadas — não alterar. */
export const ANYMA_PORTAL_ENTRY_COUNT_PREFIX = "meccafit:anima-portal-entry-count:v1:";
export const ANYMA_SECOND_ENTRY_TREINO_PREFIX = "meccafit:anima-second-entry-treino:v1:";
/** Silencia "Bem-vindo" na entrada após "Pular apresentação" (até limpar no dashboard). */
export const ANYMA_PRESENTATION_SKIP_SILENT_PREFIX =
  "meccafit:anima-presentation-skip-silent:v1:";
/**
 * Após "Pular apresentação": Juramento → perfil (nome/gênero/foto/confirmar), sem tour.
 * Persiste até o selo — cobre reload antes de confirmar.
 */
export const ANYMA_PRESENTATION_SKIP_IDENTITY_ONLY_PREFIX =
  "meccafit:anima-presentation-skip-identity-only:v1:";
/** @deprecated Use ANYMA_PORTAL_ENTRY_COUNT_PREFIX */
export const ANIMA_PORTAL_ENTRY_COUNT_PREFIX = ANYMA_PORTAL_ENTRY_COUNT_PREFIX;
/** @deprecated Use ANYMA_SECOND_ENTRY_TREINO_PREFIX */
export const ANIMA_SECOND_ENTRY_TREINO_PREFIX = ANYMA_SECOND_ENTRY_TREINO_PREFIX;

export function readAnymaPortalEntryCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`${ANYMA_PORTAL_ENTRY_COUNT_PREFIX}${userId}`);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}
/** @deprecated Use readAnymaPortalEntryCount */
export const readAnimaPortalEntryCount = readAnymaPortalEntryCount;

/** Incrementa a cada abertura do dashboard (mesma conta). */
export function bumpAnymaPortalEntryCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = readAnymaPortalEntryCount(userId) + 1;
    window.localStorage.setItem(`${ANYMA_PORTAL_ENTRY_COUNT_PREFIX}${userId}`, String(next));
    return next;
  } catch {
    return readAnymaPortalEntryCount(userId);
  }
}
/** @deprecated Use bumpAnymaPortalEntryCount */
export const bumpAnimaPortalEntryCount = bumpAnymaPortalEntryCount;

/**
 * Pular apresentação (1ª vez): logo + manifesto + Juramento das Cinzas, depois
 * perfil (nome → gênero → foto → confirmar). Sem spotlight/tour do Portal.
 * Saudação "Bem-vindo" silenciada nesta entrada.
 */
export function seedPresentationSkipCeremonyFlow(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${ANYMA_PRESENTATION_SKIP_SILENT_PREFIX}${userId}`,
      "1",
    );
    window.localStorage.setItem(
      `${ANYMA_PRESENTATION_SKIP_IDENTITY_ONLY_PREFIX}${userId}`,
      "1",
    );
  } catch {
    // quota / private mode
  }
}

/**
 * @deprecated Use seedPresentationSkipCeremonyFlow — não força mais contador de entrada.
 */
export function seedAnymaPortalEntryCountForPresentationSkip(userId: string): void {
  seedPresentationSkipCeremonyFlow(userId);
}

/** Skip ativo: altar sem tour — só selar nome/gênero/foto. */
export function readPresentationSkipIdentityOnly(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(
        `${ANYMA_PRESENTATION_SKIP_IDENTITY_ONLY_PREFIX}${userId}`,
      ) === "1"
    );
  } catch {
    return false;
  }
}

/** Limpa o modo skip após o selo (ou se a conta já estava selada). */
export function clearPresentationSkipIdentityOnly(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(
      `${ANYMA_PRESENTATION_SKIP_IDENTITY_ONLY_PREFIX}${userId}`,
    );
  } catch {
    // quota / private mode
  }
}

/**
 * Zera o estado local do Portal/onboarding — simula 1º login no aparelho.
 * Usar ao reabrir as diretrizes (aceite resetado no Auth).
 */
export function resetClientFirstLoginLocalState(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${ANYMA_ONBOARDING_STORAGE_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ANYMA_PORTAL_ENTRY_COUNT_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ANYMA_SECOND_ENTRY_TREINO_PREFIX}${userId}`);
    window.localStorage.removeItem(
      `${ANYMA_PRESENTATION_SKIP_IDENTITY_ONLY_PREFIX}${userId}`,
    );
    window.sessionStorage.removeItem(
      `${ANYMA_PRESENTATION_SKIP_SILENT_PREFIX}${userId}`,
    );
    window.localStorage.removeItem(`${ANYMA_LAST_VISIT_STORAGE_PREFIX}${userId}`);
    window.sessionStorage.removeItem(`${ANYMA_GREETING_SESSION_PREFIX}${userId}`);
  } catch {
    // quota / private mode
  }
  clearReturningLoginGreetingShown(userId);
  clearReturningLoginGreetingPending(userId);
  clearSpotlightBeatProgress(userId);
}

/**
 * Após "Pular apresentação": sem "Bem-vindo" nesta entrada de sessão.
 * Limpa com clearPresentationSkipSilentEntry (após marcar a saudação como ouvida).
 */
export function isPresentationSkipSilentEntry(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(
        `${ANYMA_PRESENTATION_SKIP_SILENT_PREFIX}${userId}`,
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function clearPresentationSkipSilentEntry(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(
      `${ANYMA_PRESENTATION_SKIP_SILENT_PREFIX}${userId}`,
    );
  } catch {
    // private mode
  }
}

export function readSecondEntryTreinoRedirectDone(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.localStorage.getItem(`${ANYMA_SECOND_ENTRY_TREINO_PREFIX}${userId}`) === "done"
    );
  } catch {
    return true;
  }
}

export function markSecondEntryTreinoRedirectDone(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ANYMA_SECOND_ENTRY_TREINO_PREFIX}${userId}`, "done");
  } catch {
    // quota / private mode
  }
}

/** Introdução do Portal só na 1ª entrada real da conta. */
export function shouldShowAnymaPortalOnboarding(
  userId: string,
  animaPortalVisto: boolean,
): boolean {
  if (animaPortalVisto) return false;
  return !readAnymaOnboardingComplete(userId);
}
/** @deprecated Use shouldShowAnymaPortalOnboarding */
export const shouldShowAnimaPortalOnboarding = shouldShowAnymaPortalOnboarding;

export function readAnymaDaysSinceLastVisit(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${ANYMA_LAST_VISIT_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const last = new Date(raw);
    if (Number.isNaN(last.getTime())) return null;
    const diffMs = Date.now() - last.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}
/** @deprecated Use readAnymaDaysSinceLastVisit */
export const readAnimaDaysSinceLastVisit = readAnymaDaysSinceLastVisit;

export function writeAnymaLastVisit(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${ANYMA_LAST_VISIT_STORAGE_PREFIX}${userId}`,
      new Date().toISOString(),
    );
  } catch {
    // quota / private mode
  }
}
/** @deprecated Use writeAnymaLastVisit */
export const writeAnimaLastVisit = writeAnymaLastVisit;

export function shouldShowDebtSoftGreeting(userId: string, daysAbsent: number | null): boolean {
  const daysSinceVisit = readAnymaDaysSinceLastVisit(userId);
  const effectiveDays = daysAbsent ?? daysSinceVisit;
  if (effectiveDays === null || effectiveDays < ANYMA_DEBT_SOFT_DAYS) return false;

  if (typeof window === "undefined") return false;
  try {
    const sessionKey = `${ANYMA_GREETING_SESSION_PREFIX}${userId}`;
    if (window.sessionStorage.getItem(sessionKey) === "shown") return false;
    return true;
  } catch {
    return false;
  }
}

export function markDebtSoftGreetingShown(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${ANYMA_GREETING_SESSION_PREFIX}${userId}`, "shown");
  } catch {
    // private mode
  }
}

/**
 * Saudação de retorno: uma vez por entrada no Portal (cada login/sessão de dashboard).
 * `entryCount` evita silêncio após logout/login na mesma aba.
 */
export function shouldPlayReturningLoginGreeting(
  userId: string,
  portalReady: boolean,
  entryCount = 0,
): boolean {
  if (!portalReady) return false;
  if (entryCount < 1) return false;
  if (typeof window === "undefined") return false;
  try {
    const sessionKey = `${ANYMA_RETURNING_LOGIN_SESSION_PREFIX}${userId}`;
    const heardForEntry = window.sessionStorage.getItem(sessionKey);
    if (heardForEntry === String(entryCount)) return false;
    return true;
  } catch {
    return false;
  }
}

export function markReturningLoginGreetingShown(
  userId: string,
  entryCount: number,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${ANYMA_RETURNING_LOGIN_SESSION_PREFIX}${userId}`,
      String(entryCount),
    );
  } catch {
    // private mode
  }
}

export function clearReturningLoginGreetingShown(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(
      `${ANYMA_RETURNING_LOGIN_SESSION_PREFIX}${userId}`,
    );
    // Encerra a sessão de login atual — próximo login recebe entrada nova.
    window.sessionStorage.removeItem(
      `${ANYMA_RETURNING_LOGIN_ACTIVE_PREFIX}${userId}`,
    );
  } catch {
    // private mode
  }
}

/**
 * Número de entrada da saudação para ESTA sessão de login.
 * Fixa o valor no sessionStorage na primeira montagem do login: reload e
 * navegação de rota reaproveitam o mesmo número (não retocam "Bem-vindo").
 * Logout/reset limpam a marca (clearReturningLoginGreetingShown), então o
 * próximo login recebe o `bumpedEntryCount` novo e a saudação toca de novo.
 */
export function resolveReturningLoginSessionEntry(
  userId: string,
  bumpedEntryCount: number,
): number {
  if (typeof window === "undefined") return bumpedEntryCount;
  try {
    const key = `${ANYMA_RETURNING_LOGIN_ACTIVE_PREFIX}${userId}`;
    const existing = window.sessionStorage.getItem(key);
    if (existing !== null) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed) && parsed >= 1) return parsed;
    }
    window.sessionStorage.setItem(key, String(bumpedEntryCount));
    return bumpedEntryCount;
  } catch {
    return bumpedEntryCount;
  }
}

/** Abre chance de fala em toda nova entrada (logout → login na mesma aba). */
export function beginReturningLoginGreetingEntry(
  userId: string,
  entryCount: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const sessionKey = `${ANYMA_RETURNING_LOGIN_SESSION_PREFIX}${userId}`;
    const heardForEntry = window.sessionStorage.getItem(sessionKey);
    // Só limpa se for uma entrada nova — não apaga o "já falou" desta mesma entrada.
    if (heardForEntry !== null && heardForEntry !== String(entryCount)) {
      // entrada nova: deixa shouldPlay comparar e liberar
    }
    window.sessionStorage.setItem(
      `${ANYMA_RETURNING_LOGIN_PENDING_PREFIX}${userId}`,
      String(entryCount),
    );
  } catch {
    // private mode
  }
  window.dispatchEvent(
    new CustomEvent(ANYMA_RETURNING_LOGIN_EVENT, {
      detail: { userId, entryCount },
    }),
  );
}

/** @deprecated Use beginReturningLoginGreetingEntry */
export function publishReturningLoginGreetingRequest(userId: string): void {
  beginReturningLoginGreetingEntry(userId, Date.now());
}

export function hasReturningLoginGreetingPending(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(
      window.sessionStorage.getItem(
        `${ANYMA_RETURNING_LOGIN_PENDING_PREFIX}${userId}`,
      ),
    );
  } catch {
    return false;
  }
}

export function clearReturningLoginGreetingPending(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(
      `${ANYMA_RETURNING_LOGIN_PENDING_PREFIX}${userId}`,
    );
  } catch {
    // private mode
  }
}

export function resolveReturningLoginSpeech(profileName: string): string {
  return withAnymaSpeech(injectName(ANYMA_RETURNING_LOGIN_SPEECH, profileName));
}

export function resolveReturningLoginBeats(profileName: string): string[] {
  return ANYMA_RETURNING_LOGIN_BEATS.map((beat) =>
    withAnymaSpeech(injectName(beat, profileName)),
  );
}
