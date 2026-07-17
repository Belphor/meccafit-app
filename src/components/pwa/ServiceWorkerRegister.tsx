"use client";

import { useEffect } from "react";

/**
 * Registra o service worker do PWA no cliente. Sem UI — apenas efeito.
 * Roda uma vez após a montagem; falhas são silenciosas (não quebram o app).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
