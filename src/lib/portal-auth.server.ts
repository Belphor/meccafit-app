import type { AuthError } from "@supabase/supabase-js";
import { PORTAL_COPY } from "@/lib/portal-copy";

export type PortalProfile = {
  full_name: string | null;
  role: "forjador" | "forjador_linhagem" | "forjador_soberano" | "cliente";
  nome_linhagem: string | null;
  status_altar: string | null;
};

const INVALID_CREDENTIAL_CODES = new Set([
  "invalid_credentials",
  "invalid_grant",
  "user_not_found",
]);

export function mapAuthError(error: AuthError): string {
  const code = (error.code ?? "").trim().toLowerCase();
  const message = error.message.trim().toLowerCase();

  if (
    INVALID_CREDENTIAL_CODES.has(code) ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return PORTAL_COPY.loginInvalidCredentials;
  }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de acessar o altar.";
  }

  if (error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Não foi possível autenticar agora. Tente novamente.";
}
