import { isStoragePath } from "@/lib/storage/paths";

/** Re-export — canonical definition lives in @/lib/storage/paths */
export { resolveMediaDisplayUrl } from "@/lib/storage/paths";

export async function fetchSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const storagePaths = paths.filter(isStoragePath);
  if (storagePaths.length === 0) return {};

  const res = await fetch("/api/storage/signed-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: storagePaths }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "שגיאה בטעינת קישורים למדיה");
  }
  return data.urls || {};
}

export function resolveLegacyUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return "";
}

export async function deleteStoragePaths(paths: string[]) {
  const storagePaths = paths.filter(isStoragePath);
  if (storagePaths.length === 0) return;
  await fetch("/api/storage/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: storagePaths }),
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("לא ניתן לקרוא את הסרטון"));
    };
    video.src = objectUrl;
  });
}

type UploadFields = {
  module: string;
  entityId: string;
  kind: "image" | "video";
  durationSec?: number;
};

export function uploadFileWithProgress(
  file: File,
  fields: UploadFields,
  onProgress: (pct: number) => void
): Promise<{ path: string; kind: string; mimeType: string; previewUrl?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("module", fields.module);
    fd.append("entityId", fields.entityId);
    fd.append("kind", fields.kind);
    if (fields.durationSec != null) fd.append("durationSec", String(fields.durationSec));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "העלאה נכשלה"));
      } catch {
        reject(new Error("העלאה נכשלה"));
      }
    };
    xhr.onerror = () => reject(new Error("שגיאת רשת"));
    xhr.open("POST", "/api/storage/upload");
    xhr.send(fd);
  });
}
