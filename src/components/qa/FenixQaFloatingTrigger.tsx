"use client";

import { useEffect, useState } from "react";
import { isFenixQaLabEnabled } from "@/components/qa/FenixAnimationTestPanel";

type FenixQaFloatingTriggerProps = {
  tab: "treino" | "evolucao";
};

export function FenixQaFloatingTrigger({ tab }: FenixQaFloatingTriggerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isFenixQaLabEnabled());
    const onStorage = () => setVisible(isFenixQaLabEnabled());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!visible) return null;

  return (
    <p className="rounded-lg border border-dashed border-amber-500/20 bg-amber-950/15 px-3 py-2 text-[11px] text-amber-100/80">
      Laboratório QA ativo · aba {tab === "treino" ? "Treino" : "Evolução"}. Dispare animações na aba Perfil.
    </p>
  );
}
