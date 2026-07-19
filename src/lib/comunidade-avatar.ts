/**
 * Comunidade · thumbnail público no Supabase Storage + foto local no perfil.
 */

import type { RankingVtcEntry, RankingsThoth } from "@/lib/comunidade-data";
import { supabase } from "@/lib/supabase";

export const COMUNIDADE_AVATAR_BUCKET = "comunidade-avatars";
export const COMUNIDADE_AVATAR_THUMB_SIZE = 64;
export const COMUNIDADE_AVATAR_CACHE_CONTROL = "604800";

export type ComunidadePhotoResolver = (
  atletaId: string,
  serverPath?: string | null,
) => string | null;

export function buildComunidadeAvatarStoragePath(userId: string): string {
  return `${userId}/thumb.webp`;
}

export function getComunidadeAvatarPublicUrl(path: string | null | undefined): string | null {
  const trimmed = path?.trim();
  if (!trimmed) return null;

  const { data } = supabase.storage.from(COMUNIDADE_AVATAR_BUCKET).getPublicUrl(trimmed);
  return data.publicUrl?.trim() ? data.publicUrl : null;
}

export function resolveComunidadePhotoUrl(input: {
  atletaId: string;
  selfUserId?: string;
  selfLocalPhotoUrl?: string | null;
  serverPath?: string | null;
  pathByAtletaId?: ReadonlyMap<string, string | null | undefined>;
}): string | null {
  const { atletaId, selfUserId, selfLocalPhotoUrl, serverPath, pathByAtletaId } = input;

  const resolvedPath =
    serverPath?.trim() ||
    pathByAtletaId?.get(atletaId)?.trim() ||
    null;

  const publicUrl = getComunidadeAvatarPublicUrl(resolvedPath);
  if (publicUrl) return publicUrl;

  if (selfUserId && atletaId === selfUserId && selfLocalPhotoUrl?.trim()) {
    return selfLocalPhotoUrl;
  }

  return null;
}

export function collectAvatarPathsFromRankings(
  rankings: RankingsThoth | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!rankings) return map;

  const addEntries = (entries: RankingVtcEntry[]) => {
    for (const entry of entries) {
      const path = entry.atleta_avatar_path?.trim();
      if (path) map.set(entry.atleta_id, path);
    }
  };

  addEntries(rankings.vtc_global);
  addEntries(rankings.vtc_por_membro.peito);
  addEntries(rankings.vtc_por_membro.ombros);
  addEntries(rankings.vtc_por_membro.bracos);
  addEntries(rankings.vtc_por_membro.costas);
  addEntries(rankings.vtc_por_membro.pernas);
  addEntries(rankings.vtc_faixa?.superiores ?? []);
  addEntries(rankings.vtc_faixa?.inferiores ?? []);

  return map;
}

async function resizeImageToWebpThumbnail(file: File): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Miniatura indisponível neste ambiente.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.src = objectUrl;
    });

    const size = COMUNIDADE_AVATAR_THUMB_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");

    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const offsetX = (size - width) / 2;
    const offsetY = (size - height) / 2;

    ctx.drawImage(image, offsetX, offsetY, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Falha ao gerar miniatura."))),
        "image/webp",
        0.82,
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function syncComunidadeAvatarFromFile(
  userId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  try {
    const thumb = await resizeImageToWebpThumbnail(file);
    const path = buildComunidadeAvatarStoragePath(userId);

    const { error: uploadError } = await supabase.storage
      .from(COMUNIDADE_AVATAR_BUCKET)
      .upload(path, thumb, {
        upsert: true,
        contentType: "image/webp",
        cacheControl: COMUNIDADE_AVATAR_CACHE_CONTROL,
      });

    if (uploadError) {
      return { path: null, error: uploadError.message };
    }

    const { data, error: rpcError } = await supabase.rpc("argos_set_comunidade_avatar_path", {
      p_path: path,
    });

    if (rpcError) {
      return { path: null, error: rpcError.message };
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const row = data as Record<string, unknown>;
      if (row.error) {
        return { path: null, error: String(row.message ?? row.error) };
      }
    }

    return { path, error: null };
  } catch (error) {
    return {
      path: null,
      error: error instanceof Error ? error.message : "Falha ao enviar miniatura da comunidade.",
    };
  }
}
