"use client";

import { useEffect, useState } from "react";
import { isStoragePath } from "@/lib/storage/paths";
import type { StoredMediaRef } from "@/lib/storage/types";
import { fetchSignedUrls, resolveLegacyUrl } from "./media-utils";

export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const signed = await fetchSignedUrls(paths);
      if (cancelled) return;
      const merged: Record<string, string> = { ...signed };
      for (const p of paths) {
        const legacy = resolveLegacyUrl(p);
        if (legacy) merged[p] = legacy;
      }
      setUrls(merged);
      setLoading(false);
    };
    if (paths.length > 0) run();
    else {
      setUrls({});
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [paths.join("|")]);

  return { urls, loading };
}

export function MediaGallery({
  media,
  legacyUrls,
  className = "",
}: {
  media?: StoredMediaRef[];
  legacyUrls?: string[];
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const refs: StoredMediaRef[] = media?.length
    ? media
    : (legacyUrls || []).map((url) => ({
        path: url,
        kind: "image" as const,
        mimeType: "image/jpeg",
      }));

  const paths = refs.map((r) => r.path);
  const { urls, loading } = useSignedUrls(paths);

  const images = refs.filter((r) => r.kind === "image");
  const videos = refs.filter((r) => r.kind === "video");

  if (refs.length === 0) return null;

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        {loading && refs.some((r) => isStoragePath(r.path)) && (
          <p className="text-xs text-muted">טוען מדיה...</p>
        )}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => {
              const src = urls[img.path];
              return (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => src && setLightbox(src)}
                  className="block rounded-lg border border-border overflow-hidden focus:ring-2 focus:ring-primary"
                >
                  {src ? (
                    <img src={src} alt="תמונה" className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-muted/20 flex items-center justify-center text-xs text-muted">
                      תמונה
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {videos.map((vid) => {
          const src = urls[vid.path];
          return (
            <div key={vid.path} className="rounded-lg border border-border overflow-hidden">
              {src ? (
                <video src={src} controls playsInline className="w-full max-h-48" />
              ) : (
                <div className="w-full h-24 bg-muted/20 flex items-center justify-center text-xs text-muted">
                  סרטון
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 left-4 text-white text-sm font-bold"
            onClick={() => setLightbox(null)}
          >
            סגור
          </button>
          <img
            src={lightbox}
            alt="תמונה מלאה"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
