/**
 * Content interpretation helpers.
 *
 * A node has no explicit "type" — we infer how to render its `content` string.
 * Everything here is pure and client-side (no network), which keeps the app
 * fully static. Future enrichment (og:image, titles) can layer on top by
 * populating `BrainNodeData.meta` without touching these detectors.
 */

export type ContentKind = "text" | "image" | "youtube" | "link";

const URL_RE = /^(https?:\/\/[^\s]+)$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;
const DATA_IMAGE_RE = /^data:image\//i;

/** Extract a YouTube video id from common URL shapes, or null. */
export function getYouTubeId(raw: string): string | null {
  const value = raw.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?[^\s]*\bv=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function isImageContent(content: string): boolean {
  const value = content.trim();
  if (DATA_IMAGE_RE.test(value)) return true;
  return URL_RE.test(value) && IMAGE_EXT_RE.test(value);
}

export function isUrl(content: string): boolean {
  return URL_RE.test(content.trim());
}

/** Single source of truth for "how should this node render?". */
export function classifyContent(content: string): ContentKind {
  const value = content.trim();
  if (!value) return "text";
  if (isImageContent(value)) return "image";
  if (getYouTubeId(value)) return "youtube";
  if (isUrl(value)) return "link";
  return "text";
}

/** Best-effort display label for a link node. */
export function linkLabel(url: string): string {
  try {
    const u = new URL(url.trim());
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
