import type { PhaseTier } from "@/lib/dashboard-config";

export const FENIX_QA_ANIMATION_EVENT = "meccafit:fenix-qa-animation";

export type FenixQaAnimationKind =
  | "restoration-flash"
  | "superacao"
  | "linhagem-level-up"
  | "avatar-flash"
  | "avatar-tier-up";

export type FenixQaAnimationDetail = {
  kind: FenixQaAnimationKind;
  tier?: PhaseTier;
};

export const FENIX_QA_ANIMATIONS: ReadonlyArray<{
  kind: FenixQaAnimationKind;
  label: string;
  hint: string;
  tab: "treino" | "evolucao";
  howTo: string;
}> = [
  {
    kind: "restoration-flash",
    label: "Flash de restauração térmica",
    hint: "Brasas de retorno quando a fase térmica reativa na sessão (~1,4 s).",
    tab: "treino",
    howTo:
      "Fique na aba Treino. O flash cobre a tela com brasas douradas no centro. Use o botão abaixo ou simule degradação térmica + nova carga na sessão.",
  },
  {
    kind: "superacao",
    label: "Ascensão (superação)",
    hint: "Overlay de recorde pessoal (~8 s). Aba Treino.",
    tab: "treino",
    howTo: "Fique na aba Treino e supere o peso máximo de um exercício, ou dispare pelo botão abaixo.",
  },
  {
    kind: "linhagem-level-up",
    label: "Transmutação da linhagem",
    hint: "Olho da Fênix · só quando a Chama Acumulada sobe de fase.",
    tab: "evolucao",
    howTo:
      "Dispara a animação completa (~12 s). Na produção, só aparece quando o VTC de 30 dias cruza o próximo patamar durante a sessão.",
  },
  {
    kind: "avatar-flash",
    label: "Flash do avatar (evolução)",
    hint: "Pulso rápido no anel quando o mapa térmico muda (~1,4 s).",
    tab: "evolucao",
    howTo:
      "Use a prévia do avatar abaixo. O anel pulsa em laranja — acontece ao registrar carga que altera o calor muscular.",
  },
  {
    kind: "avatar-tier-up",
    label: "Subida de camada do anel",
    hint: "Brilho ao ganhar nova camada na Chama Acumulada (~2,2 s).",
    tab: "evolucao",
    howTo:
      "Use a prévia abaixo. Cada camada colorida representa Faísca, Brasa, Labareda ou Fogo Cósmico.",
  },
];

export function dispatchFenixQaAnimation(detail: FenixQaAnimationDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FenixQaAnimationDetail>(FENIX_QA_ANIMATION_EVENT, { detail }));
}
