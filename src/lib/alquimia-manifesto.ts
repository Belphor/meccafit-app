/**
 * Manifesto Primordial · A Alquimia do Ferro e das Cinzas.
 * Texto canônico da história MECCAFIT (Perfil + narração ANYMA).
 */

export const ALQUIMIA_MANIFESTO_CHIP = "História";
export const ALQUIMIA_MANIFESTO_META = "Manifesto Primordial";
export const ALQUIMIA_MANIFESTO_BUTTON =
  'O Manifesto Primordial: "A Alquimia do Ferro e das Cinzas"';
export const ALQUIMIA_MANIFESTO_TITLE = "A Alquimia do Ferro e das Cinzas";
export const ALQUIMIA_MANIFESTO_CLOSING =
  "Você não puxa ferro. Você esculpe o seu próprio renascimento.";

export type AlquimiaManifestoSection = {
  roman: string;
  heading: string;
  paragraphs: readonly string[];
};

export const ALQUIMIA_MANIFESTO_SECTIONS: readonly AlquimiaManifestoSection[] = [
  {
    roman: "I",
    heading: "O Mito do Ferro Ancestral",
    paragraphs: [
      "No início dos tempos, a Fênix não era apenas uma criatura de fogo. Ela era a personificação da Vontade Inabalável. Para renovar sua existência, ela não se lançava ao fogo por fraqueza, mas por escolha. Ela recolhia os galhos mais densos, os minerais mais pesados da terra e construía seu ninho-fogueira, a primeira Forja.",
      "Ela se deitava sob o peso esmagador de sua própria história e permitia que a gravidade e o calor a consumissem até que restasse apenas o pó. O renascimento não era um milagre gratuito. Era uma consequência geométrica de suportar o fogo purificador.",
    ],
  },
  {
    roman: "II",
    heading: "O Altar Moderno: A Musculação",
    paragraphs: [
      'O que o mundo moderno chama de "musculação", a Fênix chama de O Ritual do Aço. Quando um atleta entra no Altar e se posiciona sob o peso frio de uma barra metálica, ele está replicando exatamente o ritual ancestral da ave de fogo. Cada repetição, cada quilo adicionado ao Volume Total de Carga (VTC), é uma microdestruição deliberada.',
      "As fibras musculares são tensionadas até o limite da ruptura. Microscopicamente, o tecido é transformado em cinzas. A dor que o atleta sente nas últimas repetições não é um sinal de falha. É o calor da fogueira aumentando. É o corpo físico queimando a sua versão mais fraca, estagnada e comum.",
    ],
  },
  {
    roman: "III",
    heading: "A Conexão do Tempo e do Futuro",
    paragraphs: [
      'No MECCAFIT, o atleta não "malha" para mudar de aparência. Ele treina para forçar sua própria biologia a se reconstruir mais forte. O descanso noturno é o período nas cinzas. A manhã seguinte é o erguer da Faísca. A fase do usuário não mente: ou você move o peso e alimenta o fogo, ou a Gravidade Térmica consome sua interface, provando que você escolheu permanecer cinza.',
      "O MECCAFIT une o passado mítico e o futuro de alta tecnologia. O suor e o esforço bruto contra o ferro são o elemento arcaico, imutável desde o início da humanidade.",
    ],
  },
] as const;

/** Narração completa da ANYMA (TTS). [Nome] só no convite inicial. */
export const ANYMA_SPEECH_ALQUIMIA_MANIFESTO = [
  "[Nome], este é o Manifesto Primordial. A Alquimia do Ferro e das Cinzas.",
  "O Mito do Ferro Ancestral.",
  "No início dos tempos, a Fênix não era apenas uma criatura de fogo. Ela era a personificação da Vontade Inabalável. Para renovar sua existência, ela não se lançava ao fogo por fraqueza, mas por escolha. Ela recolhia os galhos mais densos, os minerais mais pesados da terra e construía seu ninho-fogueira, a primeira Forja. Ela se deitava sob o peso esmagador de sua própria história e permitia que a gravidade e o calor a consumissem até que restasse apenas o pó. O renascimento não era um milagre gratuito. Era uma consequência geométrica de suportar o fogo purificador.",
  "O Altar Moderno: A Musculação.",
  "O que o mundo moderno chama de musculação, a Fênix chama de O Ritual do Aço. Quando um atleta entra no Altar e se posiciona sob o peso frio de uma barra metálica, ele está replicando exatamente o ritual ancestral da ave de fogo. Cada repetição, cada quilo adicionado ao Volume Total De Carga (VTC), é uma microdestruição deliberada. As fibras musculares são tensionadas até o limite da ruptura. Microscopicamente, o tecido é transformado em cinzas. A dor que o atleta sente nas últimas repetições não é um sinal de falha. É o calor da fogueira aumentando. É o corpo físico queimando a sua versão mais fraca, estagnada e comum.",
  "A Conexão do Tempo e do Futuro.",
  "No MECCAFIT, o atleta não malha para mudar de aparência. Ele treina para forçar sua própria biologia a se reconstruir mais forte. O descanso noturno é o período nas cinzas. A manhã seguinte é o erguer da Faísca. A fase do usuário não mente: ou você move o peso e alimenta o fogo, ou a Gravidade Térmica consome sua interface, provando que você escolheu permanecer cinza. O MECCAFIT une o passado mítico e o futuro de alta tecnologia. O suor e o esforço bruto contra o ferro são o elemento arcaico, imutável desde o início da humanidade.",
  ALQUIMIA_MANIFESTO_CLOSING,
].join(" ");
