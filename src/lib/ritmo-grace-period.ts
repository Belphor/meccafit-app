import { PURITY_PENALTY_THRESHOLD } from "@/components/evolution/human-body-constants";

/** Dias de acolhimento antes da penalidade visual do Ritmo no mapa corporal. */
export const RITMO_GRACE_DAYS = 20;

export type RitmoGraceState = {
  inGrace: boolean;
  daysRemaining: number;
  daysSinceSetup: number | null;
};

export function resolveRitmoGraceState(
  phaseSetupAt: string | null | undefined,
  now: Date = new Date(),
): RitmoGraceState {
  const trimmed = phaseSetupAt?.trim();
  if (!trimmed) {
    return { inGrace: false, daysRemaining: 0, daysSinceSetup: null };
  }

  const start = new Date(trimmed);
  if (Number.isNaN(start.getTime())) {
    return { inGrace: false, daysRemaining: 0, daysSinceSetup: null };
  }

  const msPerDay = 86_400_000;
  const daysSinceSetup = Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerDay));
  const inGrace = daysSinceSetup < RITMO_GRACE_DAYS;
  const daysRemaining = inGrace ? RITMO_GRACE_DAYS - daysSinceSetup : 0;

  return { inGrace, daysRemaining, daysSinceSetup };
}

export function isRitmoPurityPenaltyActive(
  indiceIgnicao: number,
  phaseSetupAt: string | null | undefined,
  serverGraceActive?: boolean | null,
): boolean {
  if (serverGraceActive === true) return false;
  const grace = resolveRitmoGraceState(phaseSetupAt);
  if (grace.inGrace) return false;
  return indiceIgnicao < PURITY_PENALTY_THRESHOLD;
}

export function buildRitmoGraceActiveHint(daysRemaining: number): string {
  const days = Math.max(0, Math.trunc(daysRemaining));
  const dayWord = days === 1 ? "dia" : "dias";
  return `Você ainda está no período de acolhimento. Faltam ${days} ${dayWord} com o mapa em cores plenas, mesmo se o Ritmo estiver abaixo de 50%.`;
}

export function buildRitmoGraceEndedAlert(): string {
  return (
    "O período de acolhimento terminou. Com Ritmo abaixo de 50%, o mapa corporal ficou mais suave. " +
    "A Fênix não apaga sua jornada: volte a treinar com constância para reacender as cores."
  );
}
