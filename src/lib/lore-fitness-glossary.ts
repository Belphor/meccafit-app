/**
 * Léxico da lore FENYXIA · significado real na musculação.
 * Textos curtos, português do Brasil, sem travessão nem ponto e vírgula.
 */

export type LoreFitnessEntry = {
  id: string;
  term: string;
  meaning: string;
};

export const LORE_FITNESS_GLOSSARY: readonly LoreFitnessEntry[] = [
  { id: "forjar", term: "Forjar", meaning: "Transformar, esculpir." },
  { id: "forja", term: "Forja", meaning: "Treino, musculação." },
  { id: "forjado", term: "Forjado", meaning: "Treino concluído, carga registrada." },
  { id: "em-chamas", term: "Em Chamas", meaning: "Exercício em andamento." },
  { id: "forjador", term: "Forjador", meaning: "Instrutor, personal." },
  { id: "forjadores", term: "Forjadores", meaning: "Instrutores, personais." },
  { id: "soberano", term: "Soberano", meaning: "Administrador." },
  { id: "braseiro", term: "Braseiro", meaning: "Atleta." },
  { id: "chama", term: "Chama", meaning: "Força, vontade." },
  { id: "nova-chama", term: "Nova Chama", meaning: "Nome provisório do iniciante." },
  {
    id: "chama-altar",
    term: "Chama do Altar",
    meaning: "Volume de carga do dia, soma dos picos registrados.",
  },
  {
    id: "chama-acumulada",
    term: "Chama Acumulada",
    meaning: "Volume de carga dos últimos trinta dias.",
  },
  { id: "voo-cinzas", term: "Voo de Cinzas", meaning: "Cardio." },
  { id: "altar", term: "Altar", meaning: "Academia, painel de treino." },
  { id: "linhagem", term: "Linhagem", meaning: "Nível e progresso do atleta." },
  {
    id: "brasas-musculares",
    term: "Brasas Musculares",
    meaning: "Volume por grupo muscular, mapa de calor.",
  },
  {
    id: "ritmo-fenix",
    term: "Ritmo da Fênix",
    meaning: "Consistência na meta mensal.",
  },
  {
    id: "gravidade-termica",
    term: "Gravidade Térmica",
    meaning: "Prova mensal de fase.",
  },
  { id: "ascensao", term: "Ascensão", meaning: "Recorde pessoal." },
  { id: "superacao", term: "Superação", meaning: "Novo recorde no exercício." },
  { id: "cinzas", term: "Cinzas", meaning: "Fase inicial, inatividade." },
  { id: "faisca", term: "Faísca", meaning: "Início do progresso." },
  { id: "brasa", term: "Brasa", meaning: "Progresso consolidado." },
  { id: "labareda", term: "Labareda", meaning: "Alto volume, ritmo forte." },
  { id: "fogo-cosmico", term: "Fogo Cósmico", meaning: "Fase máxima." },
  {
    id: "renascimento",
    term: "Renascimento",
    meaning: "Evolução, retorno após pausa.",
  },
  { id: "transmutacao", term: "Transmutação", meaning: "Subida de fase." },
  { id: "portal-brasa", term: "Portal de Brasa", meaning: "Entrada, login." },
  { id: "anyma", term: "ANYMA", meaning: "Assistente da Fênix, voz guia." },
  { id: "fenix", term: "Fênix", meaning: "Sistema visual de evolução." },
  {
    id: "vtc",
    term: "VTC",
    meaning: "Volume de Carga Máxima, pico de carga por exercício em quilogramas.",
  },
  {
    id: "rei-chamas",
    term: "Rei das Chamas",
    meaning: "Líder do ranking mensal.",
  },
  {
    id: "termometro",
    term: "Termômetro",
    meaning: "Meta coletiva da academia.",
  },
  { id: "arena", term: "Arena", meaning: "Competição da comunidade." },
  { id: "cinturao", term: "Cinturão", meaning: "Prêmio dos duelos." },
  {
    id: "espelho-ciclo",
    term: "Espelho do Ciclo",
    meaning: "Fotos de progresso do mês.",
  },
  {
    id: "mural",
    term: "Mural de Ascensões",
    meaning: "Quadro de recordes da comunidade.",
  },
  { id: "ritual-aco", term: "Ritual do Aço", meaning: "Musculação." },
  {
    id: "exilio",
    term: "Exílio das Chamas",
    meaning: "Conta suspensa.",
  },
  { id: "fenyxia", term: "FENYXIA", meaning: "Empresa." },
  { id: "meccafit", term: "MECCAFIT", meaning: "App e academia." },
] as const;
