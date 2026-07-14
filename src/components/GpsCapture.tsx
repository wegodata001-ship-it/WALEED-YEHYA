"use client";

import { useState } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import { InlineLoader } from "@/components/ui/SmallLoader";

type GpsCaptureProps = {
  onCapture: (coords: { lat: number; lng: number }) => void;
  coords?: { lat: number; lng: number } | null;
};

export function GpsCapture({ onCapture, coords }: GpsCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const capture = () => {
    if (!navigator.geolocation) {
      setError("GPS לא נתמך בדפדפן");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onCapture(c);
        setLoading(false);
      },
      () => {
        setError("לא ניתן לקבל מיקום");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">מיקום GPS</span>
        </div>
        <button
          type="button"
          onClick={capture}
          disabled={loading}
          className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
        >
          {loading ? "מאתר..." : "רענן"}
        </button>
      </div>
      {coords ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      ) : loading ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <InlineLoader />
          מאתר מיקום...
        </p>
      ) : error ? (
        <p className="mt-2 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
