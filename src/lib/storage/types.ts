/** Storage module folders inside the bucket. */
export const STORAGE_MODULES = [
  "attendance",
  "reports",
  "tasks",
  "machinery",
  "fuel",
  "documents",
] as const;

export type StorageModule = (typeof STORAGE_MODULES)[number];

export type MediaKind = "image" | "video";

export type StoredMediaRef = {
  path: string;
  kind: MediaKind;
  mimeType: string;
};

export type UploadResult = StoredMediaRef & {
  size: number;
};
