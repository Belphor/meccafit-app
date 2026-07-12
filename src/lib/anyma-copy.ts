/** Marca exibida em toda copy falada e escrita da IA do Portal. */
export const ANYMA_BRAND = "ANYMA FÊNIX";

/** Fallback TTS quando o perfil ainda não tem nome. */
export const ANYMA_NAME_FALLBACK = "Nova Chama";

/** Forma escrita nos cards. A voz nunca pronuncia a sigla VTC. */
export const ANYMA_VTC_PHRASE = "Volume Total De Carga (VTC)";

/** Forma falada pela ANYMA. Sem a sigla VTC. */
export const ANYMA_VTC_SPOKEN = "Volume Total De Carga";

export const ANYMA_EYEBROW_PREFIX = `${ANYMA_BRAND} · `;

/** Dias sem visita ao altar antes do alerta suave da ANYMA (penalidade hard = 30d). */
export const ANYMA_DEBT_SOFT_DAYS = 5;

/** Lock da narrativa de onboarding da ANYMA no Portal. */
export const ANYMA_ONBOARDING_LOCK_MS = 15_000;

/** Saudação ao abrir a esfera da ANYMA. Só voz. Sem card visual. */
export const ANYMA_ORB_GREETING =
  "O que a ANYMA FÊNIX pode te explicar hoje?";

/** Alerta suave por ausência. Voz da ANYMA. */
export const ANYMA_DEBT_SOFT_GREETING =
  "[Nome], sua chama está morrendo devido à sua negligência. Sinta o frio e volte ao Altar.";

/** Esfera no canto do Portal. Primeiro beat da apresentação. */
export const ANYMA_ORB_PRESENCE_SPEECH =
  "Permaneço ancorada no canto inferior direito do Portal de Brasa, na esfera âmbar que pulsa ao seu lado. Toque quando precisar de voz e direção.";

/** Aba Perfil. Apresentação da navegação. */
export const ANYMA_PERFIL_TAB_SPEECH =
  "[Nome], abra a aba Perfil. É ali que você selará nome e gênero antes de forjar no altar.";

/** Card de identidade. Orientação geral. */
export const ANYMA_PERFIL_SEAL_SPEECH =
  "Neste painel você declara quem é na linhagem. Informe um nome único e escolha seu gênero. Ele define sua arena mensal, masculina ou feminina.";

/** Passo 1. Campo de nome. */
export const ANYMA_PERFIL_NOME_SPEECH =
  "Digite seu nome aqui. Este nome será único na linhagem FENYXIA.";

/** Passo 2. Seleção de gênero. */
export const ANYMA_PERFIL_GENERO_SPEECH =
  "Agora escolha seu gênero aqui. Ele define em qual arena mensal você compete, masculina ou feminina.";

/** Passo 3. Foto no dispositivo. */
export const ANYMA_PERFIL_FOTO_SPEECH =
  "Antes de selar, toque em Inserir foto do dispositivo. Sua imagem fica no aparelho e uma miniatura sobe para duelos, RANKINGS e mural.";

/** Passo 4. Confirmação. */
export const ANYMA_PERFIL_CONFIRMA_SPEECH =
  "Quando estiver pronto, confirme nome e gênero para selar sua identidade na linhagem.";

/** Apresentação completa (catálogo / QA). */
export const ANYMA_FENIX_SPOTLIGHT_SPEECH = `${ANYMA_ORB_PRESENCE_SPEECH} ${ANYMA_PERFIL_SEAL_SPEECH}`;
