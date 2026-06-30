import type { PhaseTier } from "@/lib/dashboard-config";
import { canShowLinhagemTransmutation } from "@/lib/linhagem-tier-tracker";

export const LINHAGEM_TRANSMUTATION_EVENT = "meccafit:linhagem-transmutation";

export type LinhagemTransmutationDetail = {
  tier: PhaseTier;
  userId: string;
};

export function dispatchLinhagemTransmutation(detail: LinhagemTransmutationDetail): void {
  if (typeof window === "undefined") return;
  if (!canShowLinhagemTransmutation(detail.userId, detail.tier)) return;
  window.dispatchEvent(
    new CustomEvent<LinhagemTransmutationDetail>(LINHAGEM_TRANSMUTATION_EVENT, { detail }),
  );
}
