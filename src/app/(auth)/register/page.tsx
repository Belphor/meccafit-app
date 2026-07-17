import { cookies } from "next/headers";
import {
  HANDSHAKE_COOKIE_NAME,
  verifyHandshakeToken,
} from "@/lib/counter-handshake.server";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ELO_ROMPIDO_MESSAGE =
  "ELO ROMPIDO. A IGNIÇÃO DO ALTAR EXIGE PRESENÇA FÍSICA NA FORJA. FAÇA O ESCANEAMENTO NO BALCÃO DA ACADEMIA.";

/**
 * Registration Blocker.
 *
 * O token do handshake é `httpOnly`, logo a validação acontece no servidor no
 * momento da requisição (equivalente ao "component mounting"). Token válido →
 * formulário mínimo. Token ausente/inválido → tela de erro estática, somente
 * texto, sem qualquer animação ou transição.
 */
export default async function RegisterPage() {
  const cookieStore = await cookies();
  const handshakeToken = cookieStore.get(HANDSHAKE_COOKIE_NAME)?.value;
  const isHandshakeValid = verifyHandshakeToken(handshakeToken);

  if (!isHandshakeValid) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-black px-6">
        <p className="max-w-2xl text-center text-xl font-bold uppercase leading-relaxed tracking-[0.18em] text-[#ffb800] sm:text-2xl">
          {ELO_ROMPIDO_MESSAGE}
        </p>
      </main>
    );
  }

  return <RegisterForm />;
}
