/**
 * Léxico da lore FENYXIA · fantasia e significado real na musculação.
 * Português do Brasil, sem travessão nem ponto e vírgula.
 */

export type LoreFitnessEntry = {
  id: string;
  term: string;
  meaning: string;
};

export const LORE_FITNESS_GLOSSARY: readonly LoreFitnessEntry[] = [
  {
    id: "forjar",
    term: "Forjar",
    meaning: "Na lore, moldar no fogo. Na prática, treinar e registrar a carga.",
  },
  {
    id: "forja",
    term: "Forja",
    meaning: "Na lore, o lugar onde o aço nasce. Na prática, o treino de musculação.",
  },
  {
    id: "forjado",
    term: "Forjado",
    meaning: "Na lore, peça concluída no fogo. Na prática, treino feito e carga registrada.",
  },
  {
    id: "em-chamas",
    term: "Em Chamas",
    meaning: "Na lore, o fogo ativo. Na prática, exercício em andamento na sessão.",
  },
  {
    id: "forjador",
    term: "Forjador",
    meaning: "Na lore, quem guia a forja. Na prática, instrutor ou personal trainer.",
  },
  {
    id: "forjadores",
    term: "Forjadores",
    meaning: "Na lore, a equipe da forja. Na prática, instrutores e personais da academia.",
  },
  {
    id: "soberano",
    term: "Soberano",
    meaning: "Na lore, autoridade máxima da casa. Na prática, administrador da academia.",
  },
  {
    id: "braseiro",
    term: "Braseiro",
    meaning: "Na lore, quem carrega a brasa. Na prática, o atleta cliente.",
  },
  {
    id: "chama",
    term: "Chama",
    meaning: "Na lore, o fogo da vontade. Na prática, força, ritmo e esforço no treino.",
  },
  {
    id: "nova-chama",
    term: "Nova Chama",
    meaning: "Na lore, fogo que acaba de nascer. Na prática, nome provisório do iniciante.",
  },
  {
    id: "chama-altar",
    term: "Chama do Altar",
    meaning:
      "Na lore, o calor do dia no altar. Na prática, volume de carga do dia, soma dos picos registrados.",
  },
  {
    id: "chama-acumulada",
    term: "Chama Acumulada",
    meaning:
      "Na lore, o fogo somado no tempo. Na prática, volume de carga dos últimos trinta dias.",
  },
  {
    id: "voo-cinzas",
    term: "Voo de Cinzas",
    meaning: "Na lore, o voo sobre as cinzas. Na prática, o cardio da sessão.",
  },
  {
    id: "altar",
    term: "Altar",
    meaning: "Na lore, o templo da forja. Na prática, a academia e o painel de treino.",
  },
  {
    id: "linhagem",
    term: "Linhagem",
    meaning: "Na lore, a herança da Fênix. Na prática, nível e progresso do atleta.",
  },
  {
    id: "brasas-musculares",
    term: "Brasas Musculares",
    meaning:
      "Na lore, brasas por região do corpo. Na prática, volume por grupo muscular no mapa de calor.",
  },
  {
    id: "ritmo-fenix",
    term: "Ritmo da Fênix",
    meaning:
      "Na lore, o pulso da Fênix no mês. Na prática, consistência perante a meta mensal de carga.",
  },
  {
    id: "gravidade-termica",
    term: "Gravidade Térmica",
    meaning:
      "Na lore, a prova do fogo até a virada. Na prática, avaliação mensal que pode subir ou baixar a fase.",
  },
  {
    id: "ascensao",
    term: "Ascensão",
    meaning: "Na lore, subir além de si. Na prática, recorde pessoal de carga no exercício.",
  },
  {
    id: "superacao",
    term: "Superação",
    meaning: "Na lore, vencer o próprio limite. Na prática, novo recorde no exercício.",
  },
  {
    id: "cinzas",
    term: "Cinzas",
    meaning: "Na lore, o estado sem fogo. Na prática, fase inicial ou período de inatividade.",
  },
  {
    id: "faisca",
    term: "Faísca",
    meaning: "Na lore, o primeiro estalo do fogo. Na prática, início real do progresso.",
  },
  {
    id: "brasa",
    term: "Brasa",
    meaning: "Na lore, fogo estável. Na prática, progresso consolidado na fase.",
  },
  {
    id: "labareda",
    term: "Labareda",
    meaning: "Na lore, chama alta e viva. Na prática, alto volume com ritmo forte.",
  },
  {
    id: "fogo-cosmico",
    term: "Fogo Cósmico",
    meaning: "Na lore, o auge da Fênix. Na prática, a fase máxima da linhagem.",
  },
  {
    id: "renascimento",
    term: "Renascimento",
    meaning:
      "Na lore, nascer de novo das cinzas. Na prática, evoluir ou retornar após uma pausa.",
  },
  {
    id: "transmutacao",
    term: "Transmutação",
    meaning: "Na lore, a mudança de forma pelo fogo. Na prática, subida de fase da linhagem.",
  },
  {
    id: "portal-brasa",
    term: "Portal de Brasa",
    meaning: "Na lore, a porta da forja. Na prática, a tela de entrada e o login.",
  },
  {
    id: "anyma",
    term: "ANYMA",
    meaning: "Na lore, a voz da Fênix. Na prática, assistente que guia com voz e recados.",
  },
  {
    id: "fenix",
    term: "Fênix",
    meaning: "Na lore, o símbolo do renascimento. Na prática, sistema visual de evolução.",
  },
  {
    id: "vtc",
    term: "VTC",
    meaning:
      "Sigla de Volume de Carga Máxima. Na prática, pico de carga por exercício em quilogramas.",
  },
  {
    id: "rei-chamas",
    term: "Rei das Chamas",
    meaning: "Na lore, quem lidera o fogo do mês. Na prática, líder do ranking mensal.",
  },
  {
    id: "termometro",
    term: "Termômetro",
    meaning: "Na lore, o calor coletivo. Na prática, meta compartilhada da academia.",
  },
  {
    id: "arena",
    term: "Arena",
    meaning: "Na lore, o campo de confronto. Na prática, competição da comunidade.",
  },
  {
    id: "cinturao",
    term: "Cinturão",
    meaning: "Na lore, o troféu do duelo. Na prática, prêmio dos duelos da comunidade.",
  },
  {
    id: "espelho-ciclo",
    term: "Espelho do Ciclo",
    meaning:
      "Na lore, o espelho do mês. Na prática, fotos locais do início útil e do último dia do mês para comparar o físico.",
  },
  {
    id: "mural",
    term: "Mural de Ascensões",
    meaning: "Na lore, o mural das vitórias. Na prática, quadro de recordes da comunidade.",
  },
  {
    id: "ritual-aco",
    term: "Ritual do Aço",
    meaning: "Na lore, o rito com o ferro. Na prática, a musculação em si.",
  },
  {
    id: "exilio",
    term: "Exílio das Chamas",
    meaning: "Na lore, afastamento do fogo. Na prática, conta suspensa.",
  },
  {
    id: "fenyxia",
    term: "FENYXIA",
    meaning:
      "Na lore, a casa da Fênix. Na prática, empresa de tecnologia de sistemas sob medida.",
  },
  {
    id: "meccafit",
    term: "MECCAFIT",
    meaning: "Na lore, a primeira obra da casa. Na prática, o app e a academia neste altar.",
  },
] as const;
