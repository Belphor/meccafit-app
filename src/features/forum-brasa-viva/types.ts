import type { PhaseTier } from "@/lib/dashboard-config";

/** Fases visuais IRIS dos cards do fórum (4 níveis de fogo). */
export type ForumCardPhase = "cinza" | "faisca" | "labareda" | "magma";

export type ForumBrasaVivaTopic = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorLineage: string;
  authorPhaseTier: PhaseTier;
  authorCardPhase: ForumCardPhase;
  weightKg: number;
  series: number;
  createdAt: string;
};

export type ForumBrasaVivaRpcRow = {
  id: number;
  topic_title: string;
  topic_body: string;
  author_name: string;
  author_lineage: string;
  author_phase_tier: number;
  peso: number;
  series: number;
  registrado_em: string;
};
