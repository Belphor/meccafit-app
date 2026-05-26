import { timingSafeEqual } from "node:crypto";



/** Chave da Forja — somente server-side (FORGE_KEY). Nunca usar NEXT_PUBLIC_. */



export function resolveForgeIgnitionKey(): string {

  return process.env.FORGE_KEY?.trim() ?? "";

}



export function isForgeIgnitionConfigured(): boolean {

  return resolveForgeIgnitionKey().length > 0;

}



export function matchesForgeIgnitionKey(candidate: string): boolean {

  const expected = resolveForgeIgnitionKey();

  const normalized = candidate.trim();

  if (!expected || !normalized) return false;



  const expectedBuffer = Buffer.from(expected, "utf8");

  const candidateBuffer = Buffer.from(normalized, "utf8");

  if (expectedBuffer.length !== candidateBuffer.length) return false;



  return timingSafeEqual(expectedBuffer, candidateBuffer);

}

