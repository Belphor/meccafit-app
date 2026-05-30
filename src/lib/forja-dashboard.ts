export type ForjaBondedAthlete = {
  bondId: string;
  clientId: string;
  forgerId: string;
  displayName: string;
  lineageName: string | null;
  phaseTier: number;
  bondedAt: string;
  forgerName: string | null;
};

export type ForjaSovereignProfile = {
  displayName: string;
  role: "forjador_soberano";
};

export type ForjaDashboardPayload = {
  sovereign: ForjaSovereignProfile;
  athletes: ForjaBondedAthlete[];
};

export type ForjaPrescriptionDraft = {
  exercicio: string;
  peso: string;
  repeticoes: string;
  series: string;
};

export const EMPTY_PRESCRIPTION_DRAFT: ForjaPrescriptionDraft = {
  exercicio: "",
  peso: "",
  repeticoes: "",
  series: "",
};
