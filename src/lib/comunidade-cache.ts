/**
 * Cache em memória · snapshot Comunidade (evita refetch ao trocar aba do dashboard)
 */

import type { ComunidadeArenaSnapshot } from "@/lib/comunidade-data";
import type { ComunidadeClienteEvolution } from "@/lib/comunidade-evolution";

const TTL_MS = 120_000;

type CacheEntry<T> = {
  userId: string;
  data: T;
  fetchedAt: number;
};

let arenaEntry: CacheEntry<ComunidadeArenaSnapshot> | null = null;
let evolutionEntry: CacheEntry<ComunidadeClienteEvolution> | null = null;

function isFresh(entry: CacheEntry<unknown> | null, userId: string): boolean {
  if (!entry || entry.userId !== userId) return false;
  return Date.now() - entry.fetchedAt < TTL_MS;
}

export function readCachedComunidadeArena(userId: string): ComunidadeArenaSnapshot | null {
  return isFresh(arenaEntry, userId) ? arenaEntry!.data : null;
}

export function writeCachedComunidadeArena(userId: string, data: ComunidadeArenaSnapshot): void {
  arenaEntry = { userId, data, fetchedAt: Date.now() };
}

export function readCachedComunidadeEvolution(userId: string): ComunidadeClienteEvolution | null {
  return isFresh(evolutionEntry, userId) ? evolutionEntry!.data : null;
}

export function writeCachedComunidadeEvolution(userId: string, data: ComunidadeClienteEvolution): void {
  evolutionEntry = { userId, data, fetchedAt: Date.now() };
}

export function invalidateComunidadeCache(): void {
  arenaEntry = null;
  evolutionEntry = null;
}
