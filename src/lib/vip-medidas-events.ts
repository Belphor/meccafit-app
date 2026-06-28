/** Evento disparado após publicação de medidas VIP pelo personal. */
export const VIP_MEDIDAS_UPDATE_EVENT = "meccafit:vip-medidas-updated";

export type VipMedidasUpdateDetail = {
  clientId: string;
};

export function publishVipMedidasUpdate(clientId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<VipMedidasUpdateDetail>(VIP_MEDIDAS_UPDATE_EVENT, {
      detail: { clientId },
    }),
  );
}
