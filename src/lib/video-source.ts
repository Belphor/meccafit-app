export type VideoSourceKind = "iframe" | "html5";

export function resolveVideoSourceKind(videoUrl: string): VideoSourceKind {
  const normalized = videoUrl.trim().toLowerCase();
  if (!normalized) return "html5";

  if (
    normalized.includes("youtube.com") ||
    normalized.includes("youtu.be") ||
    normalized.includes("vimeo.com")
  ) {
    return "iframe";
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(normalized)) {
    return "html5";
  }

  return normalized.startsWith("http") ? "iframe" : "html5";
}
