export type VideoSourceKind = "iframe" | "html5" | "external";

/** Converte links comuns (YouTube watch/shorts, youtu.be, Vimeo) em URL reproduzível no player. */
export function toPlayableVideoUrl(videoUrl: string): string {
  const trimmed = videoUrl.trim();
  if (!trimmed) return "";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const path = parsed.pathname;

    if (path.startsWith("/embed/")) {
      return `https://www.youtube.com${path}${parsed.search}`;
    }

    const watchId = parsed.searchParams.get("v");
    if (watchId) {
      return `https://www.youtube.com/embed/${watchId}`;
    }

    const shortMatch = path.match(/^\/(?:shorts|live|v)\/([^/?#]+)/i);
    if (shortMatch?.[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    if (host === "player.vimeo.com" && pathStartsWith(parsed.pathname, "/video/")) {
      return `https://player.vimeo.com${parsed.pathname}`;
    }

    const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    if (id) return `https://player.vimeo.com/video/${id}`;
  }

  return trimmed;
}

function pathStartsWith(pathname: string, prefix: string): boolean {
  return pathname.toLowerCase().startsWith(prefix.toLowerCase());
}

export function resolveVideoSourceKind(videoUrl: string): VideoSourceKind {
  const playable = toPlayableVideoUrl(videoUrl);
  const normalized = playable.trim().toLowerCase();
  if (!normalized) return "external";

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(normalized)) {
    return "html5";
  }

  if (
    normalized.includes("youtube.com/embed/") ||
    normalized.includes("player.vimeo.com/video/") ||
    normalized.includes("youtube.com") ||
    normalized.includes("youtu.be") ||
    normalized.includes("vimeo.com")
  ) {
    return "iframe";
  }

  if (normalized.startsWith("http")) {
    // Sites que costumam bloquear iframe — abre fora do app.
    if (
      normalized.includes("instagram.com") ||
      normalized.includes("tiktok.com") ||
      normalized.includes("facebook.com") ||
      normalized.includes("fb.watch")
    ) {
      return "external";
    }
    return "iframe";
  }

  return "html5";
}
