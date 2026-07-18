import type { DashboardTabId } from "@/lib/dashboard-tabs";
import { ANYMA_SPEECH_ALQUIMIA_MANIFESTO } from "@/lib/alquimia-manifesto";
import { ANYMA_VTC_PHRASE } from "@/lib/anyma-copy";
import { resolveAnymaSpeechText } from "@/lib/anima-speech";
import { FENYXIA_SUPORTE_ANYMA_LABEL } from "@/lib/client-lore-copy";

/**
 * Catálogo canônico de explicações da ANYMA FÊNIX.
 * Usado no tour do ecossistema e nos cards do painel da IA para ouvir de novo.
 * Nos cards, (VTC) permanece escrito. Na voz, a sigla é omitida.
 * O nome do atleta só entra nas falas das abas. Funções ficam sem nome.
 */

export type AnymaExplanationGroup =
  | "treino"
  | "evolucao"
  | "comunidade"
  | "dieta"
  | "perfil"
  | "suporte";

export type AnymaExplanationId =
  | "treino-aba"
  | "treino-voo"
  | "treino-calendario"
  | "treino-dia"
  | "treino-chama-altar"
  | "treino-ascensao"
  | "evolucao-aba"
  | "evolucao-meta"
  | "evolucao-ritmo"
  | "evolucao-brasas"
  | "evolucao-chama"
  | "evolucao-gravidade"
  | "evolucao-espelho"
  | "comunidade-aba"
  | "comunidade-arena"
  | "comunidade-titulos"
  | "comunidade-rankings"
  | "comunidade-mural"
  | "dieta-plano"
  | "perfil-linhagem"
  | "perfil-historia"
  | "perfil-suporte";

export type AnymaExplanationCard = {
  id: AnymaExplanationId;
  group: AnymaExplanationGroup;
  groupLabel: string;
  label: string;
  tab: DashboardTabId;
  speech: string;
  summary: string;
  requiresVip?: boolean;
  /** Navega até o alvo no altar sem narrar explicação. */
  redirectOnly?: boolean;
  /** Paleta visual do card no painel da ANYMA. */
  accent?: "magma" | "suporte";
};

export const ANYMA_EXPLANATION_GROUP_ORDER: readonly AnymaExplanationGroup[] = [
  "treino",
  "evolucao",
  "comunidade",
  "dieta",
  "perfil",
  "suporte",
] as const;

export const ANYMA_EXPLANATION_GROUP_LABELS: Record<AnymaExplanationGroup, string> = {
  treino: "Treino",
  evolucao: "Evolução",
  comunidade: "Comunidade",
  dieta: "Dieta",
  perfil: "Perfil",
  suporte: "Suporte",
};

/** Aba Treino. */
export const ANYMA_SPEECH_TREINO_ABA =
  "[Nome], esta é a aba Treino. Aqui vive o altar diário da linhagem FENYXIA. Você aquece no Voo de Cinzas, escolhe o dia na planilha, registra a carga máxima de cada exercício e alimenta a Chama do Altar com o esforço real do ferro.";

/** Voo de Cinzas. */
export const ANYMA_SPEECH_TREINO_VOO =
  "O Voo de Cinzas é o cardio consciente da linhagem. Os minutos validados aquecem sua chama e podem acontecer antes ou depois do treino com ferro. Seu forjador define a meta. Confirme a cada dez minutos que continua ativo. Pausas não apagam o progresso.";

/** Calendário da planilha. */
export const ANYMA_SPEECH_TREINO_CALENDARIO =
  "O calendário de segunda a sábado mostra sua planilha semanal. Escolha o dia para ver qual grupo muscular será forjado naquela sessão. Dias já concluídos nesta semana aparecem marcados.";

/** Treino do Dia e carga máxima. */
export const ANYMA_SPEECH_TREINO_DIA =
  `Aqui vive o Treino do Dia. Em cada exercício, registre a carga máxima forjada com verdade. Esse pico alimenta a Chama do Altar com ${ANYMA_VTC_PHRASE}. Cada registro acende ascensões no mural e move toda a linhagem FENYXIA.`;

/** Chama do Altar. */
export const ANYMA_SPEECH_TREINO_CHAMA_ALTAR =
  `A Chama do Altar soma o ${ANYMA_VTC_PHRASE} do dia em quilogramas. Cada exercício concluído contribui com sua carga máxima. É a mesma unidade da Chama Acumulada, das Brasas Musculares e do termômetro da Comunidade.`;

/** Ascensão. */
export const ANYMA_SPEECH_TREINO_ASCENSAO =
  `Ascensão celebra quando você supera seu próprio recorde de ${ANYMA_VTC_PHRASE} naquele exercício. É um momento visual da forja. Não altera fase, mapa corporal nem Ritmo da Fênix.`;

/** Aba Evolução. */
export const ANYMA_SPEECH_EVOLUCAO_ABA =
  "[Nome], esta é a aba Evolução. Aqui a linhagem lê o que você forjou no altar. Ritmo da Fênix, Brasas Musculares, Chama Acumulada, Gravidade Térmica e o Espelho do Ciclo mostram como seu esforço se transforma em fase, anel e mapa corporal.";

/** Meta de treino. */
export const ANYMA_SPEECH_EVOLUCAO_META =
  "Defina sua meta de treino agora. Escolha quantos dias você pretende forjar nos próximos trinta dias e sincronize. Sem esse compromisso, o Ritmo da Fênix não tem referência para medir sua chama.";

/** Ritmo da Fênix. */
export const ANYMA_SPEECH_EVOLUCAO_RITMO =
  `O Ritmo da Fênix compara o ${ANYMA_VTC_PHRASE} que você já forjou no mês com a meta mensal da linhagem. Quanto mais próximo da meta, mais vivo fica o mapa corporal. Nos primeiros dias a linhagem acolhe com cores mais suaves. Depois, ritmo baixo deixa o mapa esfriar. Consistência no altar sustenta o fogo.`;

/** Brasas Musculares. */
export const ANYMA_SPEECH_EVOLUCAO_BRASAS =
  `As Brasas Musculares somam o ${ANYMA_VTC_PHRASE} por grupo muscular nos últimos quatorze dias. Cada região do corpo muda de cor conforme o volume. Toque no mapa para ver detalhes e quanto falta para o próximo nível térmico.`;

/** Chama Acumulada. */
export const ANYMA_SPEECH_EVOLUCAO_CHAMA =
  `A Chama Acumulada soma o ${ANYMA_VTC_PHRASE} dos últimos trinta dias. Ela define a fase da sua linhagem e o anel do avatar. Leia com atenção. É o espelho do esforço que você sustentou no altar.`;

/** Gravidade Térmica. */
export const ANYMA_SPEECH_EVOLUCAO_GRAVIDADE =
  `A Gravidade Térmica prova sua chama até a virada do mês. Se o ${ANYMA_VTC_PHRASE} do mês civil sustentar o patamar, a linhagem sobe. Se esfriar, a fase pode descer um nível. O altar responde ao ritmo real, não à intenção.`;

/** Espelho do ciclo. */
export const ANYMA_SPEECH_EVOLUCAO_ESPELHO =
  "O Espelho do Ciclo guarda selfies no primeiro dia útil do mês, de segunda a sexta, e no último dia do mês no calendário de Brasília. Se o dia 1 cair no domingo ou no sábado, a captura do início passa para a próxima segunda. Use a mesma pose e a mesma luz. Com início e fim gravados, compare o progresso. As fotos ficam só no seu dispositivo.";

/** Aba Comunidade. */
export const ANYMA_SPEECH_COMUNIDADE_ABA =
  "[Nome], esta é a aba Comunidade. Aqui a linhagem FENYXIA se encontra. Arena, títulos, rankings e mural mostram o esforço coletivo, os duelos e as ascensões forjadas com verdade no altar.";

/** Arena e termômetro. */
export const ANYMA_SPEECH_COMUNIDADE_ARENA =
  `A Arena é o coração coletivo da linhagem. O termômetro une todos em torno de uma meta comum de ${ANYMA_VTC_PHRASE}. Cada carga máxima registrada no altar soma calor ao esforço do grupo. Os duelos confrontam atletas com verdade forjada no ferro, e o vencedor disputa o cinturão. Sua contribuição aqui não é palavra. É volume real, validado sessão a sessão.`;

/** Títulos e Reis das Chamas. */
export const ANYMA_SPEECH_COMUNIDADE_TITULOS =
  "Os títulos celebram quem lidera o mês. Rei das Chamas e pilares cooperativos mostram quem sustentou a forja com disciplina. Sua arena, masculina ou feminina, define onde você compete.";

/** rankings (sempre falado em inglês). */
export const ANYMA_SPEECH_COMUNIDADE_RANKINGS =
  `Os rankings ordenam a linhagem pelo ${ANYMA_VTC_PHRASE} forjado de verdade. Suba com sessões honestas. O altar valida cada quilo antes de aparecer aqui.`;

/** Mural. */
export const ANYMA_SPEECH_COMUNIDADE_MURAL =
  "O Mural celebra ascensões reais da comunidade. Superações e marcos forjados no treino aparecem aqui. O que brilha no mural passou pelo altar.";

/** Dieta VIP (aba). */
export const ANYMA_SPEECH_DIETA_PLANO =
  "[Nome], esta é a aba Dieta. É o plano alimentar definido pelo seu Forjador. Aqui você vê metas diárias, refeições sugeridas e observações válidas por semanas ou meses. Siga o plano com a mesma disciplina do ferro.";

/** Perfil (aba). */
export const ANYMA_SPEECH_PERFIL_LINHAGEM =
  "[Nome], esta é a aba Perfil. Aqui você sela nome e gênero na linhagem FENYXIA. O gênero define sua arena mensal. No ecossistema existem atleta, Forjador, níveis superiores de forja e Soberano. O Perfil garante que cada um só vê o que lhe cabe.";

/** História · Manifesto Primordial (narração completa na overlay). */
export const ANYMA_SPEECH_PERFIL_HISTORIA = ANYMA_SPEECH_ALQUIMIA_MANIFESTO;

export const ANYMA_EXPLANATION_CARDS: readonly AnymaExplanationCard[] = [
  {
    id: "treino-aba",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Aba Treino",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_ABA,
    summary: "Altar diário, planilha, carga máxima e Chama do Altar.",
  },
  {
    id: "treino-voo",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Voo de Cinzas",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_VOO,
    summary: "Cardio consciente antes ou depois do ferro.",
  },
  {
    id: "treino-calendario",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Calendário da planilha",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_CALENDARIO,
    summary: "Dias da semana, grupos musculares e sessões da planilha.",
  },
  {
    id: "treino-dia",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Treino do Dia",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_DIA,
    summary: "Carga máxima por exercício e Volume Total De Carga (VTC).",
  },
  {
    id: "treino-chama-altar",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Chama do Altar",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_CHAMA_ALTAR,
    summary: "Soma do Volume Total De Carga (VTC) forjado hoje.",
  },
  {
    id: "treino-ascensao",
    group: "treino",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.treino,
    label: "Ascensão",
    tab: "treino",
    speech: ANYMA_SPEECH_TREINO_ASCENSAO,
    summary: "Celebração do seu recorde pessoal no exercício.",
  },
  {
    id: "evolucao-aba",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Aba Evolução",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_ABA,
    summary: "Leitura da chama, fase, anel e mapa corporal.",
  },
  {
    id: "evolucao-meta",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Defina sua meta de treino",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_META,
    summary: "Dias planejados e sincronização do Ritmo da Fênix.",
  },
  {
    id: "evolucao-ritmo",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Ritmo da Fênix",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_RITMO,
    summary: "Progresso mensal frente à meta e vivacidade do mapa.",
  },
  {
    id: "evolucao-brasas",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Brasas Musculares",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_BRASAS,
    summary: "Mapa térmico por grupo muscular em quatorze dias.",
  },
  {
    id: "evolucao-chama",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Chama Acumulada",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_CHAMA,
    summary: "Volume de trinta dias, fase da linhagem e anel.",
  },
  {
    id: "evolucao-gravidade",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Gravidade Térmica",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_GRAVIDADE,
    summary: "Prova mensal que sobe ou esfria a fase da linhagem.",
  },
  {
    id: "evolucao-espelho",
    group: "evolucao",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.evolucao,
    label: "Espelho do Ciclo",
    tab: "evolucao",
    speech: ANYMA_SPEECH_EVOLUCAO_ESPELHO,
    summary: "Fotos locais no início útil e no último dia do mês.",
  },
  {
    id: "comunidade-aba",
    group: "comunidade",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.comunidade,
    label: "Aba Comunidade",
    tab: "comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_ABA,
    summary: "Arena, títulos, rankings e mural da linhagem.",
  },
  {
    id: "comunidade-arena",
    group: "comunidade",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.comunidade,
    label: "Arena e Termômetro",
    tab: "comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_ARENA,
    summary: "Meta coletiva, duelos, cinturão e calor do grupo.",
  },
  {
    id: "comunidade-titulos",
    group: "comunidade",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.comunidade,
    label: "Títulos e Reis",
    tab: "comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_TITULOS,
    summary: "Rei das Chamas, pilares e arenas por gênero.",
  },
  {
    id: "comunidade-rankings",
    group: "comunidade",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.comunidade,
    label: "rankings",
    tab: "comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_RANKINGS,
    summary: "Ordem da linhagem pelo Volume Total De Carga (VTC).",
  },
  {
    id: "comunidade-mural",
    group: "comunidade",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.comunidade,
    label: "Mural de Ascensões",
    tab: "comunidade",
    speech: ANYMA_SPEECH_COMUNIDADE_MURAL,
    summary: "Marcos reais de superação da comunidade.",
  },
  {
    id: "dieta-plano",
    group: "dieta",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.dieta,
    label: "Aba Dieta",
    tab: "dieta",
    speech: ANYMA_SPEECH_DIETA_PLANO,
    summary: "Metas, refeições e orientações do Forjador.",
    requiresVip: true,
  },
  {
    id: "perfil-linhagem",
    group: "perfil",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.perfil,
    label: "Aba Perfil",
    tab: "perfil",
    speech: ANYMA_SPEECH_PERFIL_LINHAGEM,
    summary: "Nome, gênero, arena e classes do ecossistema.",
  },
  {
    id: "perfil-historia",
    group: "perfil",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.perfil,
    label: "História",
    tab: "perfil",
    speech: ANYMA_SPEECH_PERFIL_HISTORIA,
    summary: "Manifesto Primordial: A Alquimia do Ferro e das Cinzas.",
  },
  {
    id: "perfil-suporte",
    group: "suporte",
    groupLabel: ANYMA_EXPLANATION_GROUP_LABELS.suporte,
    label: FENYXIA_SUPORTE_ANYMA_LABEL,
    tab: "perfil",
    speech: "",
    summary: "",
    redirectOnly: true,
    accent: "suporte",
  },
] as const;

export function resolveAnymaExplanationCards(hasPersonalBond: boolean): AnymaExplanationCard[] {
  return ANYMA_EXPLANATION_CARDS.filter((card) => !card.requiresVip || hasPersonalBond);
}

export function resolveAnymaExplanationSpeech(
  speech: string,
  profileName: string,
): string {
  return resolveAnymaSpeechText(speech, profileName);
}

export function groupAnymaExplanationCards(
  cards: readonly AnymaExplanationCard[],
): Array<{ group: AnymaExplanationGroup; label: string; cards: AnymaExplanationCard[] }> {
  const byGroup = new Map<AnymaExplanationGroup, AnymaExplanationCard[]>();

  for (const card of cards) {
    const list = byGroup.get(card.group) ?? [];
    list.push(card);
    byGroup.set(card.group, list);
  }

  return ANYMA_EXPLANATION_GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
    group,
    label: ANYMA_EXPLANATION_GROUP_LABELS[group],
    cards: byGroup.get(group) ?? [],
  }));
}
