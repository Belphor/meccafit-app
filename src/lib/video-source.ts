export type VideoSourceKind = "iframe" | "html5" | "external";

export type PlayableVideoOptions = {
  /** Quando true, adiciona autoplay/playsinline nos embeds YouTube/Vimeo. */
  autoplay?: boolean;
};

/** Converte links comuns (YouTube watch/shorts, youtu.be, Vimeo) em URL reproduzível no player. */
export function toPlayableVideoUrl(
  videoUrl: string,
  options: PlayableVideoOptions = {},
): string {
  const trimmed = videoUrl.trim();
  if (!trimmed) return "";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const { autoplay = false } = options;

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    if (id) return youtubeEmbedUrl(id, autoplay);
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const path = parsed.pathname;

    if (path.startsWith("/embed/")) {
      const id = path.split("/").filter(Boolean)[1];
      if (id) return youtubeEmbedUrl(id, autoplay, parsed.searchParams);
      return withEmbedPlaybackParams(
        `https://www.youtube-nocookie.com${path}${parsed.search}`,
        "youtube",
        autoplay,
      );
    }

    const watchId = parsed.searchParams.get("v");
    if (watchId) {
      return youtubeEmbedUrl(watchId, autoplay);
    }

    const shortMatch = path.match(/^\/(?:shorts|live|v)\/([^/?#]+)/i);
    if (shortMatch?.[1]) {
      return youtubeEmbedUrl(shortMatch[1], autoplay);
    }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    if (host === "player.vimeo.com" && pathStartsWith(parsed.pathname, "/video/")) {
      return withEmbedPlaybackParams(
        `https://player.vimeo.com${parsed.pathname}${parsed.search}`,
        "vimeo",
        autoplay,
      );
    }

    const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    if (id) {
      return withEmbedPlaybackParams(
        `https://player.vimeo.com/video/${id}`,
        "vimeo",
        autoplay,
      );
    }
  }

  return trimmed;
}

function youtubeEmbedUrl(
  id: string,
  autoplay: boolean,
  existingParams?: URLSearchParams,
): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  if (existingParams) {
    existingParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
  }
  return withEmbedPlaybackParams(url.toString(), "youtube", autoplay);
}

function withEmbedPlaybackParams(
  embedUrl: string,
  provider: "youtube" | "vimeo",
  autoplay: boolean,
): string {
  if (!autoplay) return embedUrl;

  let parsed: URL;
  try {
    parsed = new URL(embedUrl);
  } catch {
    return embedUrl;
  }

  parsed.searchParams.set("autoplay", "1");
  parsed.searchParams.set("playsinline", "1");
  if (provider === "youtube") {
    parsed.searchParams.set("rel", "0");
    parsed.searchParams.set("modestbranding", "1");
  }

  return parsed.toString();
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
    normalized.includes("youtube-nocookie.com/embed/") ||
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
