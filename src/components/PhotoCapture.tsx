"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { InlineLoader } from "@/components/ui/SmallLoader";
import { isStoragePath } from "@/lib/storage/paths";

type PhotoCaptureProps = {
  onCapture: (url: string) => void;
  photoUrl?: string | null;
  label?: string;
  hint?: string;
  module?: string;
  entityId?: string;
};

export function PhotoCapture({
  onCapture,
  photoUrl,
  label = "צילום הוכחה",
  hint = "לחץ לצילום / העלאה",
  module = "machinery",
  entityId,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setDisplayUrl(null);
      return;
    }
    if (!isStoragePath(photoUrl)) {
      setDisplayUrl(photoUrl);
      return;
    }
    fetch("/api/storage/signed-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: [photoUrl] }),
    })
      .then((r) => r.json())
      .then((d) => setDisplayUrl(d.urls?.[photoUrl] || null))
      .catch(() => setDisplayUrl(null));
  }, [photoUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("module", module);
      if (entityId) form.append("entityId", entityId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.path || data.url) {
        const path = data.path || data.url;
        onCapture(path);
        setDisplayUrl(data.previewUrl || URL.createObjectURL(file));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-medium mb-2">
        <Camera className="h-4 w-4 text-primary" />
        {label}
      </div>
      {displayUrl ? (
        <div className="relative">
          <img src={displayUrl} alt="הוכחה" className="w-full h-32 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => {
              onCapture("");
              setDisplayUrl(null);
            }}
            className="absolute top-1 left-1 bg-black/50 text-white rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          {uploading ? (
            <InlineLoader />
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted mb-1" />
              <span className="text-xs text-muted">{hint}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
