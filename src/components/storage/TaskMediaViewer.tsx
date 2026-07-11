"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { countTaskImages, taskHasVideo } from "@/lib/field-task-utils";
import type { StoredMediaRef } from "@/lib/storage/types";
import { fetchSignedUrls, resolveLegacyUrl } from "./media-utils";

export function resolveTaskMediaRefs(
  media?: StoredMediaRef[],
  legacyUrls?: string[]
): StoredMediaRef[] {
  if (media && media.length > 0) return media;
  return (legacyUrls || []).map((url) => ({
    path: url,
    kind: "image" as const,
    mimeType: "image/jpeg",
  }));
}

type TaskMediaViewerProps = {
  media?: StoredMediaRef[];
  legacyUrls?: string[];
  className?: string;
};

export function TaskMediaViewer({ media, legacyUrls, className = "" }: TaskMediaViewerProps) {
  const refs = useMemo(() => resolveTaskMediaRefs(media, legacyUrls), [media, legacyUrls]);
  const imageCount = countTaskImages(refs);
  const hasVideo = taskHasVideo(refs);
  const hasMedia = refs.length > 0;

  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const images = refs.filter((r) => r.kind === "image");
  const videos = refs.filter((r) => r.kind === "video");

  const loadUrls = useCallback(async () => {
    setLoading(true);
    try {
      const paths = refs.map((r) => r.path);
      const signed = await fetchSignedUrls(paths);
      const merged: Record<string, string> = { ...signed };
      for (const p of paths) {
        const legacy = resolveLegacyUrl(p);
        if (legacy) merged[p] = legacy;
      }
      setUrls(merged);
    } finally {
      setLoading(false);
    }
  }, [refs]);

  const openModal = () => {
    setOpen(true);
    setLightboxIdx(null);
    setZoom(1);
    void loadUrls();
  };

  const closeModal = () => {
    setOpen(false);
    setLightboxIdx(null);
    setZoom(1);
  };

  useEffect(() => {
    if (lightboxIdx == null || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIdx(null);
        setZoom(1);
      } else if (e.key === "ArrowLeft" && lightboxIdx > 0) {
        setLightboxIdx(lightboxIdx - 1);
        setZoom(1);
      } else if (e.key === "ArrowRight" && lightboxIdx < images.length - 1) {
        setLightboxIdx(lightboxIdx + 1);
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, open, images.length]);

  return (
    <div className={`space-y-2 text-sm ${className}`}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
        {imageCount > 0 ? (
          <span className="flex items-center gap-1 font-semibold text-primary-dark">
            <Camera className="h-4 w-4" />
            {imageCount} {imageCount === 1 ? "תמונה" : "תמונות"}
          </span>
        ) : (
          <span className="text-xs">לא צורפו תמונות</span>
        )}
        {hasVideo ? (
          <span className="flex items-center gap-1 font-semibold text-primary-dark">
            <Film className="h-4 w-4" />
            סרטון
          </span>
        ) : (
          <span className="text-xs">לא צורף סרטון</span>
        )}
      </div>

      {hasMedia && (
        <button
          type="button"
          onClick={openModal}
          className="w-full rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
        >
          צפה במדיה
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-extrabold text-primary-dark">מדיה מצורפת</h3>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm">טוען מדיה מ-Supabase...</span>
                </div>
              ) : (
                <>
                  {images.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted mb-2">תמונות ({images.length})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {images.map((img, idx) => {
                          const src = urls[img.path];
                          return (
                            <button
                              key={img.path}
                              type="button"
                              onClick={() => src && setLightboxIdx(idx)}
                              className="aspect-square rounded-lg border border-border overflow-hidden bg-muted/10 hover:ring-2 hover:ring-primary focus:ring-2 focus:ring-primary"
                            >
                              {src ? (
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                                  ?
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {videos.map((vid) => {
                    const src = urls[vid.path];
                    return (
                      <div key={vid.path}>
                        <p className="text-xs font-bold text-muted mb-2 flex items-center gap-1">
                          <Film className="h-4 w-4" /> סרטון
                        </p>
                        <div className="rounded-lg border border-border overflow-hidden bg-black">
                          {src ? (
                            <video
                              src={src}
                              controls
                              playsInline
                              className="w-full max-h-72"
                              controlsList="nodownload"
                            />
                          ) : (
                            <div className="h-40 flex items-center justify-center text-muted text-sm">
                              לא ניתן לטעון סרטון
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxIdx != null && images[lightboxIdx] && urls[images[lightboxIdx].path] && (
        <div
          className="fixed inset-0 z-[250] bg-black/95 flex flex-col"
          onClick={() => {
            setLightboxIdx(null);
            setZoom(1);
          }}
        >
          <div className="flex items-center justify-between p-4 text-white shrink-0">
            <span className="text-sm font-bold">
              {lightboxIdx + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((z) => Math.max(1, z - 0.25));
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((z) => Math.min(3, z + 0.25));
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(null);
                  setZoom(1);
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative overflow-hidden px-14">
            {lightboxIdx > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(lightboxIdx - 1);
                  setZoom(1);
                }}
                className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
            <img
              src={urls[images[lightboxIdx].path]}
              alt="תמונה מלאה"
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxIdx < images.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(lightboxIdx + 1);
                  setZoom(1);
                }}
                className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
