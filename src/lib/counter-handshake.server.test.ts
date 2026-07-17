import {
  HANDSHAKE_TTL_SECONDS,
  mintHandshakeToken,
  verifyHandshakeToken,
} from "@/lib/counter-handshake.server";

describe("mintHandshakeToken", () => {
  it("emite token com janela de vida estrita", () => {
    const now = 1_000_000;
    const { token, issuedAt, expiresAt } = mintHandshakeToken(now);

    expect(token).toEqual(expect.any(String));
    expect(issuedAt).toBe(now);
    expect(expiresAt).toBe(now + HANDSHAKE_TTL_SECONDS * 1000);
  });

  it("gera tokens distintos a cada escaneamento (nonce aleatório)", () => {
    const a = mintHandshakeToken(1_000_000);
    const b = mintHandshakeToken(1_000_000);
    expect(a.token).not.toBe(b.token);
  });
});

describe("verifyHandshakeToken", () => {
  it("aceita token íntegro dentro da validade", () => {
    const now = 1_000_000;
    const { token } = mintHandshakeToken(now);
    expect(verifyHandshakeToken(token, now + 1000)).toBe(true);
  });

  it("rejeita token expirado", () => {
    const now = 1_000_000;
    const { token, expiresAt } = mintHandshakeToken(now);
    expect(verifyHandshakeToken(token, expiresAt)).toBe(false);
    expect(verifyHandshakeToken(token, expiresAt + 1)).toBe(false);
  });

  it("rejeita token usado antes da emissão", () => {
    const now = 1_000_000;
    const { token } = mintHandshakeToken(now);
    expect(verifyHandshakeToken(token, now - 1)).toBe(false);
  });

  it("rejeita cookie ausente", () => {
    expect(verifyHandshakeToken(undefined)).toBe(false);
    expect(verifyHandshakeToken(null)).toBe(false);
    expect(verifyHandshakeToken("")).toBe(false);
  });

  it("rejeita lixo / token malformado", () => {
    expect(verifyHandshakeToken("nao-e-um-token")).toBe(false);
    expect(verifyHandshakeToken("a.b.c")).toBe(false);
  });

  it("rejeita assinatura adulterada", () => {
    const now = 1_000_000;
    const { token } = mintHandshakeToken(now);

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [nonce, issuedAt, expiresAt] = decoded.split(".");
    const forjado = Buffer.from(
      `${nonce}.${issuedAt}.${expiresAt}.${"0".repeat(64)}`,
      "utf8",
    ).toString("base64url");

    expect(verifyHandshakeToken(forjado, now + 1000)).toBe(false);
  });

  it("rejeita payload adulterado (expiração esticada) sem reassinar", () => {
    const now = 1_000_000;
    const { token } = mintHandshakeToken(now);

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [nonce, issuedAt, , signature] = decoded.split(".");
    const expiracaoEsticada = now + HANDSHAKE_TTL_SECONDS * 1000 * 999;
    const forjado = Buffer.from(
      `${nonce}.${issuedAt}.${expiracaoEsticada}.${signature}`,
      "utf8",
    ).toString("base64url");

    expect(verifyHandshakeToken(forjado, now + 1000)).toBe(false);
  });
});
