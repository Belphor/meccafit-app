export type ForumBrasaVivaTopic = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorLineage: string;
  authorAvatarPath?: string | null;
  temCinturaoDuelo: boolean;
  isReiDasChamas: boolean;
  isPilarCooperativo: boolean;
  weightKg: number;
  series: number;
  exercicioId?: number | null;
  metricBadge: string;
  createdAt: string;
};

export type ForumBrasaVivaRpcRow = {
  id: number;
  topic_title: string;
  topic_body: string;
  author_name: string;
  author_lineage: string;
  author_id?: string;
  author_avatar_path?: string | null;
  tem_cinturao_duelo?: boolean;
  is_rei_das_chamas?: boolean;
  is_rei_chamas_superiores?: boolean;
  is_rei_chamas_inferiores?: boolean;
  is_pilar_cooperativo?: boolean;
  /** legado pré-THOTH */
  detem_cinturao_duelo?: boolean;
  is_pilar_fogo_cosmico?: boolean;
  author_phase_tier?: number;
  exercicio_id?: number | null;
  peso: number;
  series: number;
  registrado_em: string;
};
