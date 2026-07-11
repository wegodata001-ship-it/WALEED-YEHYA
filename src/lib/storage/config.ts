import type { MediaKind } from "./types";

function parseList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseIntEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getStorageConfig() {
  const imageTypes = parseList(process.env.ALLOWED_IMAGE_TYPES, [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);
  const videoTypes = parseList(process.env.ALLOWED_VIDEO_TYPES, [
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ]);

  return {
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "photo-buc",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    signedUrlExpiresSec: parseIntEnv(process.env.STORAGE_SIGNED_URL_EXPIRES_SEC, 3600),
    maxImages: parseIntEnv(process.env.MAX_UPLOAD_IMAGES, 10),
    maxImageSizeMb: parseIntEnv(process.env.MAX_IMAGE_SIZE_MB, 10),
    maxVideos: parseIntEnv(process.env.MAX_UPLOAD_VIDEO, 1),
    maxVideoSizeMb: parseIntEnv(process.env.MAX_VIDEO_SIZE_MB, 50),
    maxVideoDurationSec: parseIntEnv(process.env.MAX_VIDEO_DURATION_SECONDS, 10),
    allowedImageTypes: imageTypes,
    allowedVideoTypes: videoTypes,
  };
}

export function maxBytesForKind(kind: MediaKind): number {
  const cfg = getStorageConfig();
  return kind === "image" ? cfg.maxImageSizeMb * 1024 * 1024 : cfg.maxVideoSizeMb * 1024 * 1024;
}

export function allowedMimeTypes(kind: MediaKind): string[] {
  const cfg = getStorageConfig();
  return kind === "image" ? cfg.allowedImageTypes : cfg.allowedVideoTypes;
}
