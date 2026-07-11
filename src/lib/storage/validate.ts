import { allowedMimeTypes, maxBytesForKind } from "./config";
import type { MediaKind } from "./types";

export function detectMediaKind(mimeType: string): MediaKind | null {
  const m = mimeType.toLowerCase();
  if (allowedMimeTypes("image").includes(m)) return "image";
  if (allowedMimeTypes("video").includes(m)) return "video";
  return null;
}

export function validateUploadFile(
  buffer: Buffer,
  mimeType: string,
  kind: MediaKind
): { ok: true } | { ok: false; error: string } {
  const detected = detectMediaKind(mimeType);
  if (!detected || detected !== kind) {
    return { ok: false, error: kind === "image" ? "סוג תמונה לא נתמך" : "סוג סרטון לא נתמך" };
  }

  const max = maxBytesForKind(kind);
  if (buffer.length > max) {
    const mb = Math.round(max / (1024 * 1024));
    return {
      ok: false,
      error: kind === "image" ? `גודל תמונה מקסימלי: ${mb}MB` : `גודל סרטון מקסימלי: ${mb}MB`,
    };
  }

  return { ok: true };
}
