/** Disparado quando o forjador publica ou altera prescrição/planilha. */
export const FORJA_TREINO_UPDATE_EVENT = "meccafit:forja-treino-updated";

export type ForjaTreinoUpdateDetail = {
  clientId: string;
};

export function publishForjaTreinoUpdate(clientId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ForjaTreinoUpdateDetail>(FORJA_TREINO_UPDATE_EVENT, {
      detail: { clientId },
    }),
  );
}
