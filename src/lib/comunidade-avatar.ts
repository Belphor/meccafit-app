/**
 * Comunidade · fotos 100% locais (zero custo cloud).
 * Cada dispositivo mostra a foto local apenas onde o próprio atleta aparece.
 * Outros membros continuam com iniciais — não há upload nem storage remoto.
 */

export function resolveLocalComunidadePhotoUrl(input: {
  atletaId: string;
  selfUserId?: string;
  selfLocalPhotoUrl?: string | null;
}): string | null {
  const { atletaId, selfUserId, selfLocalPhotoUrl } = input;
  if (!selfUserId || atletaId !== selfUserId) return null;
  return selfLocalPhotoUrl?.trim() ? selfLocalPhotoUrl : null;
}
