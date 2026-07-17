import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Counter-to-App Handshake — verificação criptográfica do QR físico do balcão.
 *
 * O token prova que o cliente escaneou o QR Code estático presente na academia
 * (a "Forja"). Sem esse elo, o formulário de cadastro é bloqueado.
 *
 * Formato do token (base64url): `${nonce}.${issuedAt}.${expiresAt}.${assinatura}`
 *  - `nonce`      → entropia por escaneamento (anti-replay superficial)
 *  - `issuedAt`   → epoch ms de emissão
 *  - `expiresAt`  → epoch ms de expiração (tempo de vida estrito)
 *  - `assinatura` → HMAC-SHA256 do payload assinado com o segredo do servidor
 */

export const HANDSHAKE_COOKIE_NAME = "fenyxia_handshake_token";

/** Tempo de vida estrito do elo: 10 minutos após o escaneamento. */
export const HANDSHAKE_TTL_SECONDS = 10 * 60;

const DEV_FALLBACK_SECRET =
  "fenyxia-forja-handshake-dev-secret-nao-use-em-producao";

function resolveSecret(): string {
  const secret = process.env.FENYXIA_HANDSHAKE_SECRET?.trim();

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FENYXIA_HANDSHAKE_SECRET ausente — defina o segredo do handshake em produção.",
    );
  }

  return DEV_FALLBACK_SECRET;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", resolveSecret()).update(payload).digest("hex");
}

/** Compara duas assinaturas hex em tempo constante (anti timing-attack). */
function safeEqualHex(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (bufferA.length === 0 || bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

export type MintedHandshake = {
  token: string;
  issuedAt: number;
  expiresAt: number;
};

/** Emite um token de handshake assinado, com tempo de vida estrito. */
export function mintHandshakeToken(now: number = Date.now()): MintedHandshake {
  const issuedAt = now;
  const expiresAt = now + HANDSHAKE_TTL_SECONDS * 1000;
  const nonce = randomBytes(24).toString("hex");

  const payload = `${nonce}.${issuedAt}.${expiresAt}`;
  const signature = sign(payload);
  const token = base64UrlEncode(`${payload}.${signature}`);

  return { token, issuedAt, expiresAt };
}

/**
 * Verifica assinatura e validade do token. Retorna `true` apenas quando o token
 * é íntegro (assinatura confere) e ainda dentro do tempo de vida.
 */
export function verifyHandshakeToken(
  token: string | undefined | null,
  now: number = Date.now(),
): boolean {
  if (!token) return false;

  let decoded: string;
  try {
    decoded = base64UrlDecode(token);
  } catch {
    return false;
  }

  const segments = decoded.split(".");
  if (segments.length !== 4) return false;

  const [nonce, issuedAtRaw, expiresAtRaw, signature] = segments;
  if (!nonce || !issuedAtRaw || !expiresAtRaw || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return false;

  const expectedSignature = sign(`${nonce}.${issuedAt}.${expiresAt}`);
  if (!safeEqualHex(signature, expectedSignature)) return false;

  if (now < issuedAt) return false;
  if (now >= expiresAt) return false;

  return true;
}
