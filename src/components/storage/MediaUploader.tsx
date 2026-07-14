"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Film, Loader2, X } from "lucide-react";
import type { StoredMediaRef } from "@/lib/storage/types";
import { resolveMediaDisplayUrl } from "@/lib/storage/paths";
import {
  deleteStoragePaths,
  getVideoDuration,
  uploadFileWithProgress,
} from "./media-utils";

type UploadItem = {
  id: string;
  file: File;
  kind: "image" | "video";
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  ref?: StoredMediaRef;
};

type MediaUploaderProps = {
  module: string;
  entityId: string;
  value: StoredMediaRef[];
  onChange: (media: StoredMediaRef[]) => void;
  /** True while files are uploading — parent should block submit. */
  onBusyChange?: (busy: boolean) => void;
  maxImages?: number;
  maxVideo?: number;
  maxVideoDurationSec?: number;
  disabled?: boolean;
};

const CLIENT_LIMITS = {
  maxImages: Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_IMAGES) || 10,
  maxVideos: Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_VIDEO) || 1,
  maxVideoDurationSec: Number(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_SECONDS) || 10,
};

export function MediaUploader({
  module,
  entityId,
  value,
  onChange,
  onBusyChange,
  maxImages,
  maxVideo,
  maxVideoDurationSec,
  disabled,
}: MediaUploaderProps) {
  const imageLimit = maxImages ?? CLIENT_LIMITS.maxImages;
  const videoLimit = maxVideo ?? CLIENT_LIMITS.maxVideos;
  const videoMaxSec = maxVideoDurationSec ?? CLIENT_LIMITS.maxVideoDurationSec;

  const [items, setItems] = useState<UploadItem[]>([]);
  const [globalError, setGlobalError] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;

  const imageCount = value.filter((m) => m.kind === "image").length;
  const videoCount = value.filter((m) => m.kind === "video").length;

  const syncValue = useCallback(
    (refs: StoredMediaRef[]) => {
      onChange(refs);
    },
    [onChange]
  );

  const uploadOne = async (item: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i))
    );
    try {
      const extra =
        item.kind === "video" ? { durationSec: await getVideoDuration(item.file) } : {};
      if (item.kind === "video" && extra.durationSec! > videoMaxSec) {
        throw new Error(
          `הסרטון ארוך מדי — מקסימום ${videoMaxSec} שניות (נבחר ${Math.ceil(extra.durationSec!)} שניות)`
        );
      }

      const result = await uploadFileWithProgress(
        item.file,
        { module, entityId, kind: item.kind, ...extra },
        (pct) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i)));
        }
      );

      const ref: StoredMediaRef = {
        path: result.path,
        kind: item.kind,
        mimeType: result.mimeType,
      };
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", progress: 100, ref } : i
        )
      );
      syncValue([...valueRef.current, ref]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "העלאה נכשלה";
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: msg } : i))
      );
    }
  };

  const queueUploads = async (newItems: UploadItem[]) => {
    setItems((prev) => [...prev, ...newItems]);
    await Promise.allSettled(newItems.map((item) => uploadOne(item)));
  };

  const handleImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setGlobalError("");
    const remaining = imageLimit - imageCount;
    if (remaining <= 0) {
      setGlobalError(`ניתן לצרף עד ${imageLimit} תמונות`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const newItems: UploadItem[] = selected.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      kind: "image" as const,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending" as const,
    }));
    await queueUploads(newItems);
  };

  const handleVideo = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setGlobalError("");
    if (videoCount >= videoLimit) {
      setGlobalError(`ניתן לצרף סרטון אחד בלבד`);
      return;
    }
    const file = files[0];
    const item: UploadItem = {
      id: `${Date.now()}-video`,
      file,
      kind: "video",
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending",
    };
    await queueUploads([item]);
  };

  const removeMedia = async (ref: StoredMediaRef) => {
    await deleteStoragePaths([ref.path]);
    syncValue(valueRef.current.filter((m) => m.path !== ref.path));
    setItems((prev) => prev.filter((i) => i.ref?.path !== ref.path));
  };

  const removeFailed = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      items.forEach((i) => {
        if (i.preview) URL.revokeObjectURL(i.preview);
      });
    };
  }, []);

  const uploading = items.some((i) => i.status === "pending" || i.status === "uploading");
  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  const pendingImages = items.filter((i) => i.kind === "image" && i.status !== "done");
  const pendingVideo = items.find((i) => i.kind === "video" && i.status !== "done");

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-bold mb-2">תמונות ({imageCount}/{imageLimit})</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {value
            .filter((m) => m.kind === "image")
            .map((ref) => (
              <div key={ref.path} className="relative">
                <div className="h-20 w-20 rounded-lg border border-border bg-muted/10 overflow-hidden">
                  <MediaThumb path={ref.path} fallback="" />
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeMedia(ref)}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          {pendingImages.map((item) => (
            <div key={item.id} className="relative">
              <img src={item.preview} alt="" className="h-20 w-20 object-cover rounded-lg border border-border" />
              {item.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  {item.progress}%
                </div>
              )}
              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => removeFailed(item.id)}
                  className="absolute inset-0 bg-red-600/80 rounded-lg flex items-center justify-center text-white text-[10px] p-1 text-center"
                  title={item.error}
                >
                  {item.error || "שגיאה"}
                </button>
              )}
            </div>
          ))}
        </div>
        {!disabled && imageCount < imageLimit && (
          <div className="flex flex-wrap gap-2">
            <label className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 cursor-pointer">
              <Camera className="h-5 w-5 text-muted" />
              <span className="text-sm font-bold">גלריה / צילום</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                multiple
                capture="environment"
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                  handleImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          סרטון ({videoCount}/{videoLimit}) — עד {videoMaxSec} שניות
        </label>
        {value
          .filter((m) => m.kind === "video")
          .map((ref) => (
            <div key={ref.path} className="flex items-center gap-2 mb-2 rounded-lg border border-border p-2">
              <Film className="h-5 w-5 text-primary shrink-0" />
              <span className="text-xs truncate flex-1">{ref.path.split("/").pop()}</span>
              {!disabled && (
                <button type="button" onClick={() => removeMedia(ref)} className="text-red-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        {pendingVideo && (
          <div className="mb-2 text-xs text-muted flex items-center gap-2">
            {pendingVideo.status === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מעלה סרטון {pendingVideo.progress}%
              </>
            ) : pendingVideo.status === "error" ? (
              <span className="text-red-600">{pendingVideo.error}</span>
            ) : null}
          </div>
        )}
        {!disabled && videoCount < videoLimit && !pendingVideo && (
          <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 cursor-pointer">
            <Film className="h-5 w-5 text-muted" />
            <span className="text-sm font-bold">הוסף סרטון</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              capture="environment"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                handleVideo(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {globalError && <p className="text-sm text-red-600 font-semibold">{globalError}</p>}
    </div>
  );
}

function MediaThumb({ path, fallback }: { path: string; fallback: string }) {
  const src = resolveMediaDisplayUrl(path) || fallback;
  if (!src) return <div className="h-full w-full bg-muted/20" />;
  return (
    <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
  );
}
