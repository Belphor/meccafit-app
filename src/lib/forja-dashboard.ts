import type { PortalProfileRole } from "@/lib/portal-auth";

export type ForjaBondedAthlete = {
  bondId: string;
  clientId: string;
  forgerId: string;
  displayName: string;
  lineageName: string | null;
  phaseTier: number;
  bondedAt: string;
  forgerName: string | null;
  statusAltar?: string | null;
  isGlobalListing?: boolean;
  /** Vínculo activo em forger_client_bonds (requerido apenas para dieta VIP). */
  hasVipBond?: boolean;
};

export type ForjaWorkspaceTab = "comando" | "planilha" | "planilha_dieta" | "antifraude";

export type ForjaOperatorProfile = {
  displayName: string;
  role: PortalProfileRole;
  userId: string;
  isSovereign: boolean;
};

/** @deprecated use ForjaOperatorProfile */
export type ForjaSovereignProfile = ForjaOperatorProfile;

export type ForjaDashboardPayload = {
  operator: ForjaOperatorProfile;
  athletes: ForjaBondedAthlete[];
};

export type ForjaPrescriptionDraft = {
  exercicio: string;
  grupoMuscular: string;
  peso: string;
  repeticoes: string;
  series: string;
  /** Descanso deste exercício (s) — opcional; usa o padrão se vazio. */
  descansoSegundos: string;
  /** Descanso padrão do atleta (cronômetro global) — opcional. */
  descansoPadraoSeg: string;
};

export const EMPTY_PRESCRIPTION_DRAFT: ForjaPrescriptionDraft = {
  exercicio: "",
  grupoMuscular: "PEITO",
  peso: "",
  repeticoes: "",
  series: "",
  descansoSegundos: "",
  descansoPadraoSeg: "90",
};

export type ForjaDietMealDraft = {
  id: string;
  nome: string;
  horario: string;
  alimentosTexto: string;
};

export type ForjaDietBlueprintDraft = {
  titulo: string;
  objetivo: string;
  caloriasAlvo: string;
  proteinasG: string;
  carboidratosG: string;
  gordurasG: string;
  aguaLitros: string;
  observacoes: string;
  refeicoes: ForjaDietMealDraft[];
};

export const EMPTY_DIET_MEAL_DRAFT: ForjaDietMealDraft = {
  id: "cafe",
  nome: "Café da manhã",
  horario: "07:00",
  alimentosTexto: "",
};

export const EMPTY_DIET_BLUEPRINT_DRAFT: ForjaDietBlueprintDraft = {
  titulo: "",
  objetivo: "recomposicao",
  caloriasAlvo: "",
  proteinasG: "",
  carboidratosG: "",
  gordurasG: "",
  aguaLitros: "3",
  observacoes: "",
  refeicoes: [
    { ...EMPTY_DIET_MEAL_DRAFT },
    { id: "almoco", nome: "Almoço", horario: "12:30", alimentosTexto: "" },
    { id: "jantar", nome: "Jantar", horario: "20:00", alimentosTexto: "" },
  ],
};
