import { NextResponse } from "next/server";
import {
  HANDSHAKE_COOKIE_NAME,
  HANDSHAKE_TTL_SECONDS,
  mintHandshakeToken,
} from "@/lib/counter-handshake.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Interface oficial de instalação do app FENYXIA (destino após o handshake). */
const DOWNLOAD_INTERFACE_URL =
  process.env.FENYXIA_DOWNLOAD_URL?.trim() ||
  "https://www.fenyxia.com.br/instalar";

/**
 * Counter-to-App Handshake Gateway.
 *
 * Alcançado quando o QR Code estático do balcão físico é escaneado. Emite um
 * token de verificação criptográfico, grava-o em cookie seguro e redireciona
 * para a interface de download do app.
 */
export async function GET() {
  const { token, expiresAt } = mintHandshakeToken();

  const response = NextResponse.redirect(DOWNLOAD_INTERFACE_URL, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });

  response.cookies.set({
    name: HANDSHAKE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: HANDSHAKE_TTL_SECONDS,
    expires: new Date(expiresAt),
  });

  return response;
}
