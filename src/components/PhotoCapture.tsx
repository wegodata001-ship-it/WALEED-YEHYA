"use client";

import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

type PhotoCaptureProps = {
  onCapture: (url: string) => void;
  photoUrl?: string | null;
  label?: string;
  hint?: string;
};

export function PhotoCapture({ onCapture, photoUrl, label = "צילום הוכחה", hint = "לחץ לצילום / העלאה" }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) onCapture(data.url);
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
      {photoUrl ? (
        <div className="relative">
          <img src={photoUrl} alt="הוכחה" className="w-full h-32 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => onCapture("")}
            className="absolute top-1 left-1 bg-black/50 text-white rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
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
