"use client";

/** Botão de impressão do cartaz do balcão — oculto na versão impressa. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print mt-10 border border-[#ffb800]/50 bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] text-[#ffb800]"
    >
      Imprimir cartaz
    </button>
  );
}
