const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function sanitizeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

export function extractYouTubeId(input: string | null | undefined): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  if (YOUTUBE_ID_REGEX.test(raw)) return raw;

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be" && pathParts[0]) {
      const candidate = sanitizeToken(pathParts[0]);
      return YOUTUBE_ID_REGEX.test(candidate) ? candidate : "";
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const videoParam = url.searchParams.get("v");
      if (videoParam) {
        const candidate = sanitizeToken(videoParam);
        if (YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }

      const shortsIndex = pathParts.findIndex((part) => part === "shorts");
      if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
        const candidate = sanitizeToken(pathParts[shortsIndex + 1]);
        if (YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }

      const embedIndex = pathParts.findIndex((part) => part === "embed");
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        const candidate = sanitizeToken(pathParts[embedIndex + 1]);
        if (YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }

      const liveIndex = pathParts.findIndex((part) => part === "live");
      if (liveIndex !== -1 && pathParts[liveIndex + 1]) {
        const candidate = sanitizeToken(pathParts[liveIndex + 1]);
        if (YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }
    }
  } catch {
    const extracted = raw.match(/[A-Za-z0-9_-]{11}/)?.[0] || "";
    return YOUTUBE_ID_REGEX.test(extracted) ? extracted : "";
  }

  const fallback = raw.match(/[A-Za-z0-9_-]{11}/)?.[0] || "";
  return YOUTUBE_ID_REGEX.test(fallback) ? fallback : "";
}

export function buildYouTubeEmbedUrl(input: string | null | undefined): string | null {
  const videoId = extractYouTubeId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
}

export function buildYouTubeThumbnailUrl(input: string | null | undefined): string | null {
  const videoId = extractYouTubeId(input);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function buildYouTubeWatchUrl(input: string | null | undefined): string | null {
  const videoId = extractYouTubeId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
