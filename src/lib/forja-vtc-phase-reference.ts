import { PHASE_TIER_LABELS, type PhaseTier } from "@/lib/dashboard-config";

export type ForjaVtcPhaseReferenceRow = {
  tier: PhaseTier;
  label: string;
  vtcRangeLabel: string;
  description: string;
};

export const FORJA_VTC_PHASE_REFERENCE: ForjaVtcPhaseReferenceRow[] = [
  {
    tier: 1,
    label: PHASE_TIER_LABELS[1],
    vtcRangeLabel: "0 – 4.999 kg",
    description: "Início da jornada — volume baixo nos últimos 30 dias.",
  },
  {
    tier: 2,
    label: PHASE_TIER_LABELS[2],
    vtcRangeLabel: "5.000 – 19.999 kg",
    description: "Consistência inicial — cliente treina com regularidade.",
  },
  {
    tier: 3,
    label: PHASE_TIER_LABELS[3],
    vtcRangeLabel: "20.000 – 49.999 kg",
    description: "Volume sólido — evolução visível no mês.",
  },
  {
    tier: 4,
    label: PHASE_TIER_LABELS[4],
    vtcRangeLabel: "50.000 – 99.999 kg",
    description: "Alta dedicação — treinos frequentes e pesados.",
  },
  {
    tier: 5,
    label: PHASE_TIER_LABELS[5],
    vtcRangeLabel: "100.000 kg ou mais",
    description: "Elite de volume — máxima intensidade no período.",
  },
];
