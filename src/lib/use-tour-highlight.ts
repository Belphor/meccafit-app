"use client";

import { useEffect, useState } from "react";

/** Atributo aplicado pela AnimaTourCallout no alvo em destaque durante a APRESENTAÇÃO. */
const TOUR_INTERACTIVE_ATTR = "data-anima-tour-interactive";

/**
 * Retorna true enquanto a APRESENTAÇÃO (tour guiado da ANYMA) destaca o alvo indicado.
 * Usado para expandir painéis minimizados só durante a explicação e recolher depois.
 */
export function useTourHighlightActive(tourTargetId: string): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const selector = `[data-tour-target="${tourTargetId}"]`;

    const sync = () => {
      const el = document.querySelector<HTMLElement>(selector);
      setActive(el?.dataset.animaTourInteractive === "true");
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [TOUR_INTERACTIVE_ATTR],
    });

    return () => observer.disconnect();
  }, [tourTargetId]);

  return active;
}
