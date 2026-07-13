"use client";

import { PortalDeBrasaClient } from "@/components/portal/PortalDeBrasaClient";

/** URL estável para QR futuro — abre o formulário de criar conta. */
export default function CriarContaPage() {
  return <PortalDeBrasaClient initialMode="criar_conta" />;
}
