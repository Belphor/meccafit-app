/**
 * Contato direto Fenyxia · suporte e feedback via WhatsApp
 */

export const FENYXIA_CEO = {
  name: "Ricardo Ghiouleas",
  role: "CEO Fenyxia",
  /** E.164 para links wa.me · Brasil (55) + DDD 54 + 996047932 */
  whatsappE164: "5554996047932",
} as const;

export function buildFenyxiaWhatsAppUrl(message: string): string {
  return `https://wa.me/${FENYXIA_CEO.whatsappE164}?text=${encodeURIComponent(message)}`;
}

export function buildFeedbackWhatsAppMessage(categoria: string, mensagem: string): string {
  const categoryLabel =
    {
      geral: "Geral",
      treino: "Treino",
      evolucao: "Evolução",
      comunidade: "Comunidade",
      bug: "Problema técnico",
    }[categoria] ?? categoria;

  return [
    "FENYXIA SUPORTE (Meccafit)",
    `Categoria: ${categoryLabel}`,
    "",
    mensagem.trim(),
    "",
    "Enviado pelo app Meccafit.",
  ].join("\n");
}

/** Mensagem de teste para validar o canal WhatsApp do CEO. */
export const FENYXIA_WHATSAPP_TEST_MESSAGE = [
  "FENYXIA SUPORTE (Meccafit)",
  "",
  "Olá, Ricardo! Esta é uma mensagem de teste do app Meccafit.",
  "O canal Fenyxia Suporte está configurado para este WhatsApp.",
  "",
  "Teste automático da Fenyxia.",
].join("\n");

/** Interesse na Empresa FENYXIA (página de vitrine no Perfil). */
export function buildEmpresaInterestWhatsAppMessage(): string {
  return [
    "FENYXIA EMPRESA (Meccafit)",
    "",
    "Olá, Ricardo. Vi a página da Empresa FENYXIA no app e gostaria de saber mais.",
    "",
    "Enviado pelo app Meccafit.",
  ].join("\n");
}
