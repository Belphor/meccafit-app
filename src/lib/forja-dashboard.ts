import type { PortalProfileRole } from "@/lib/portal-auth";
import type { PrescriptionProgressionId } from "@/lib/prescription-progression";
import type { TrainingMuscleGroup, WeekdayIndex } from "@/lib/training-week";

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
  /** Monitoramento global — VTC agregado (RPC). */
  vtcToday?: number;
  vtcAvg7d?: number;
  vtc30d?: number;
};

export type ForjaVtcFeedEntry = {
  clientId: string;
  displayName: string;
  forgerName: string;
  phaseTier: number;
  statusAltar: string;
  vtcToday: number;
  vtcAvg7d: number;
  vtc30d: number;
  updatedAt: string;
  isOwnClient: boolean;
  hasVipBond?: boolean;
  alertSpike: boolean;
};

export type ForjaWorkspaceTab = "comando" | "planilha" | "planilha_treino";

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
  /** Dia da planilha (Seg=1 … Sáb=6) em que o exercício será prescrito. */
  diaSemana: WeekdayIndex;
  /** Grupos musculares activos neste dia (planilha semanal do cliente). */
  musculosDoDia: TrainingMuscleGroup[];
  exercicio: string;
  grupoMuscular: string;
  /** Uma entrada por série — número ou "FALHA". */
  repeticoesPorSerie: string[];
  series: string;
  progressaoAlternativas: PrescriptionProgressionId[];
  /** Descanso deste exercício (s) — opcional; usa o padrão se vazio. */
  descansoSegundos: string;
  /** Descanso padrão do atleta (cronômetro global) — opcional. */
  descansoPadraoSeg: string;
  /** Meta diária de cardio (minutos). */
  cardioMetaMinutos: string;
};

export const EMPTY_PRESCRIPTION_DRAFT: ForjaPrescriptionDraft = {
  diaSemana: 1,
  musculosDoDia: [],
  exercicio: "",
  grupoMuscular: "PEITO",
  repeticoesPorSerie: ["12", "12", "12"],
  series: "3",
  progressaoAlternativas: [],
  descansoSegundos: "",
  descansoPadraoSeg: "90",
  cardioMetaMinutos: "30",
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
