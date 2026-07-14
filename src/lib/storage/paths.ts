import type { StorageModule } from "./types";

export function buildStoragePath(
  module: StorageModule,
  employeeId: string,
  entityId: string,
  filename: string
): string {
  const safeEmp = employeeId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${module}/${safeEmp}/${safeEntity}/${safeName}`;
}

export function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mimeType.toLowerCase()] || "bin";
}

export function uniqueFilename(mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

/** Returns true if value looks like a storage path (not a legacy URL). */
export function isStoragePath(value: string): boolean {
  if (!value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/uploads/")) {
    return false;
  }
  return value.includes("/");
}

/**
 * Normalize DB/path values before Storage API calls.
 * Strips accidental bucket prefix (e.g. photo-buc/tasks/... → tasks/...).
 */
export function normalizeStoragePath(raw: string, bucket = process.env.SUPABASE_STORAGE_BUCKET || "photo-buc"): string {
  let p = String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!p) return "";
  if (p.startsWith(`${bucket}/`)) p = p.slice(bucket.length + 1);
  if (p.includes("..") || p.includes("\0")) {
    throw new Error("נתיב אחסון לא תקין");
  }
  return p;
}

/** Same-origin URL used by <img>/<video> so the browser never hits Supabase directly. */
export function storageMediaProxyUrl(path: string): string {
  const normalized = normalizeStoragePath(path);
  return `/api/storage/media?path=${encodeURIComponent(normalized)}`;
}

/**
 * Resolve a usable browser src for task/employee media.
 * - Legacy http(s) or /uploads paths pass through
 * - Storage object paths use the authenticated same-origin proxy
 */
export function resolveMediaDisplayUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  if (isStoragePath(path) || path.includes("/")) {
    try {
      return storageMediaProxyUrl(path);
    } catch {
      return "";
    }
  }
  return "";
}
