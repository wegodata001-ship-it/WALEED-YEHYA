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
