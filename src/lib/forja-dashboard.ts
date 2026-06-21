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
  /** Vínculo activo em forger_client_bonds (requerido para prescrição VIP). */
  hasVipBond?: boolean;
};

export type ForjaWorkspaceTab = "comando" | "planilha" | "antifraude";

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
