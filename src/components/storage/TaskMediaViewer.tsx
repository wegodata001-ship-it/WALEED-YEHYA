"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { countTaskImages, taskHasVideo } from "@/lib/field-task-utils";
import type { StoredMediaRef } from "@/lib/storage/types";
import { resolveMediaDisplayUrl } from "@/lib/storage/paths";

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
  showEmpty?: boolean;
  className?: string;
};

export function TaskMediaViewer({
  media,
  legacyUrls,
  showEmpty = true,
  className = "",
}: TaskMediaViewerProps) {
  const refs = useMemo(() => resolveTaskMediaRefs(media, legacyUrls), [media, legacyUrls]);
  const imageCount = countTaskImages(refs);
  const hasVideo = taskHasVideo(refs);
  const hasMedia = refs.length > 0;

  const images = useMemo(
    () =>
      refs
        .filter((r) => r.kind === "image")
        .map((r) => ({ ...r, src: resolveMediaDisplayUrl(r.path) })),
    [refs]
  );
  const videos = useMemo(
    () =>
      refs
        .filter((r) => r.kind === "video")
        .map((r) => ({ ...r, src: resolveMediaDisplayUrl(r.path) })),
    [refs]
  );

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [broken, setBroken] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);

  const openModal = () => {
    setOpen(true);
    setLightboxIdx(null);
    setZoom(1);
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

  if (!hasMedia && !showEmpty) return null;

  const summary = (
    <div className={`space-y-2 text-sm ${className}`}>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {imageCount > 0 ? (
          <span className="font-bold text-primary-dark">
            📷 {imageCount} {imageCount === 1 ? "תמונה" : "תמונות"}
          </span>
        ) : showEmpty ? (
          <span className="text-xs text-muted">לא צורפו תמונות</span>
        ) : null}
        {hasVideo ? (
          <span className="font-bold text-primary-dark">🎥 סרטון</span>
        ) : showEmpty && !hasMedia ? (
          <span className="text-xs text-muted">לא צורף סרטון</span>
        ) : null}
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
    </div>
  );

  const modal =
    mounted &&
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center p-4"
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

          <div className="p-4 space-y-6">
            {images.map((img, idx) => (
              <div key={img.path} className="space-y-2">
                <p className="text-sm font-bold text-primary-dark">📷 תמונה {idx + 1}</p>
                {img.src && !broken[img.path] ? (
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="block w-full rounded-xl border border-border overflow-hidden bg-muted/10 hover:ring-2 hover:ring-primary"
                  >
                    <img
                      src={img.src}
                      alt={`תמונה ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full max-h-80 object-contain bg-black/5"
                      onError={() =>
                        setBroken((prev) => ({
                          ...prev,
                          [img.path]: "לא ניתן לטעון את התמונה",
                        }))
                      }
                    />
                  </button>
                ) : (
                  <p className="text-sm text-red-600 font-semibold py-6 text-center border border-dashed border-red-200 rounded-xl">
                    {broken[img.path] || "חסר קישור לתמונה"}
                    <span className="block text-xs text-muted mt-1 break-all">{img.path}</span>
                  </p>
                )}
              </div>
            ))}

            {videos.map((vid, idx) => (
              <div key={vid.path} className="space-y-2">
                <p className="text-sm font-bold text-primary-dark">🎥 סרטון {idx + 1}</p>
                {vid.src && !broken[vid.path] ? (
                  <div className="rounded-xl border border-border overflow-hidden bg-black">
                    <video
                      src={vid.src}
                      controls
                      playsInline
                      className="w-full max-h-80"
                      controlsList="nodownload"
                      onError={() =>
                        setBroken((prev) => ({
                          ...prev,
                          [vid.path]: "לא ניתן לטעון את הסרטון",
                        }))
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-red-600 font-semibold text-center">
                    {broken[vid.path] || "חסר קישור לסרטון"}
                  </p>
                )}
              </div>
            ))}

            {images.length === 0 && videos.length === 0 && (
              <p className="text-sm text-muted text-center py-8">אין מדיה להצגה</p>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  const lightbox =
    mounted &&
    lightboxIdx != null &&
    images[lightboxIdx]?.src &&
    createPortal(
      <div
        className="fixed inset-0 z-[350] bg-black/95 flex flex-col"
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
            src={images[lightboxIdx].src}
            alt="תמונה מלאה"
            referrerPolicy="no-referrer"
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
      </div>,
      document.body
    );

  return (
    <>
      {summary}
      {modal}
      {lightbox}
    </>
  );
}
