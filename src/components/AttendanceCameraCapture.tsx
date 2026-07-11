"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw, X } from "lucide-react";

const HAVE_ENOUGH_DATA = 4;

type Phase = "opening" | "live" | "capturing" | "preview" | "uploading" | "error";

type AttendanceCameraCaptureProps = {
  open: boolean;
  onClose: () => void;
  onApproved: (photoUrl: string) => void;
};

function debugLog(step: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[AttendanceCamera] ${step}`, data ?? "");
  }
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const ready =
        video.readyState >= HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0;

      if (ready) {
        debugLog("Video ready", {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
        resolve();
        return;
      }

      if (Date.now() - start > timeoutMs) {
        reject(
          new Error(
            `Capture failed — video not ready: readyState=${video.readyState} videoWidth=${video.videoWidth} videoHeight=${video.videoHeight}`
          )
        );
        return;
      }

      requestAnimationFrame(check);
    };

    if (video.readyState >= HAVE_ENOUGH_DATA) {
      check();
    } else {
      video.addEventListener("loadeddata", check, { once: true });
      video.addEventListener("canplay", check, { once: true });
      setTimeout(check, 100);
    }
  });
}

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    t.stop();
    debugLog("Track stopped", { kind: t.kind, readyState: t.readyState });
  });
}

export function AttendanceCameraCapture({ open, onClose, onApproved }: AttendanceCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phase, setPhase] = useState<Phase>("opening");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  const reset = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setErrorDetail("");
    setStatusText("");
    setPhase("opening");
  }, [previewUrl]);

  const openCamera = useCallback(async () => {
    reset();
    setPhase("opening");
    setStatusText("פותח מצלמה...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Capture failed — getUserMedia not supported on this device");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      const settings = videoTracks[0]?.getSettings();

      debugLog("Camera opened", {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        deviceId: settings?.deviceId,
        facingMode: settings?.facingMode,
        readyState: videoTracks[0]?.readyState,
      });

      const video = videoRef.current;
      if (!video) throw new Error("Capture failed — video element missing");

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      setStatusText("ממתין לטעינת וידאו...");
      await waitForVideoReady(video);

      setPhase("live");
      setStatusText("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Capture failed — unknown camera error";
      debugLog("Camera open error", { error: msg });
      setErrorDetail(msg);
      setPhase("error");
      stopStream(streamRef.current);
      streamRef.current = null;
    }
  }, [reset]);

  useEffect(() => {
    if (open) {
      openCamera();
    } else {
      reset();
    }
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = async () => {
    debugLog("Capture clicked");

    const video = videoRef.current;
    if (!video) {
      setErrorDetail("Capture failed — video element missing");
      setPhase("error");
      return;
    }

    setPhase("capturing");
    setStatusText("מעבד תמונה...");

    try {
      if (video.readyState < HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
        setStatusText("ממתין לוידאו...");
        await waitForVideoReady(video);
      }

      video.pause();

      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      debugLog("Canvas created", { width: canvas.width, height: canvas.height });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error(
          `Capture failed — videoWidth=${video.videoWidth} videoHeight=${video.videoHeight} Canvas=null`
        );
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Capture failed — Canvas=null (no 2d context)");

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        debugLog("drawImage succeeded");
      } catch (drawErr) {
        const drawMsg = drawErr instanceof Error ? drawErr.message : "drawImage failed";
        throw new Error(`drawImage failed — ${drawMsg}`);
      }

      stopStream(streamRef.current);
      streamRef.current = null;
      video.srcObject = null;

      setStatusText("יוצר Snapshot...");

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      debugLog("Blob created", {
        blob: blob ? "yes" : "null",
        size: blob?.size ?? 0,
        type: blob?.type ?? "null",
      });

      if (!blob || blob.size === 0) {
        throw new Error(
          `Capture failed — Blob=null size=${blob?.size ?? 0} type=${blob?.type ?? "null"}`
        );
      }

      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPhase("preview");
      setStatusText("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Capture failed — unknown error";
      debugLog("Capture error", { error: msg });
      setErrorDetail(msg);
      setPhase("error");
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    openCamera();
  };

  const handleApprove = async () => {
    if (!previewBlob) {
      setErrorDetail("Capture failed — Blob=null (no preview to upload)");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setStatusText("מעלה תמונה...");

    try {
      const form = new FormData();
      form.append("file", previewBlob, `attendance-${Date.now()}.jpg`);

      const res = await fetch("/api/upload/attendance", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || `Upload failed status=${res.status}`);
      }

      debugLog("Upload succeeded", { path: data.path || data.url, size: data.size });
      onApproved(data.path || data.url);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed — unknown error";
      debugLog("Upload error", { error: msg });
      setErrorDetail(msg);
      setPhase("error");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card border border-border overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-bold text-primary-dark">
            <Camera className="h-5 w-5 text-primary" />
            צילום אימות נוכחות
          </div>
          <button type="button" onClick={handleClose} className="p-1 rounded-full hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black aspect-[3/4] max-h-[60vh]">
          {phase === "preview" && previewUrl ? (
            <img src={previewUrl} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${phase === "live" || phase === "capturing" ? "block" : "hidden"}`}
            />
          )}

          {(phase === "opening" || phase === "capturing" || phase === "uploading") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-semibold">{statusText || "טוען..."}</p>
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center gap-3">
              <p className="text-sm font-bold text-red-300">שגיאה בצילום</p>
              <p className="text-xs text-red-200 break-all">{errorDetail}</p>
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-bold"
              >
                נסה שוב
              </button>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {phase === "live" && (
            <button
              type="button"
              onClick={handleCapture}
              className="w-full rounded-xl bg-primary py-4 text-white font-extrabold text-lg flex items-center justify-center gap-2"
            >
              <Camera className="h-6 w-6" />
              צילום
            </button>
          )}

          {phase === "preview" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-xl border border-border py-3 font-bold flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                צלם שוב
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="rounded-xl bg-emerald-600 py-3 text-white font-extrabold flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                אישור
              </button>
            </div>
          )}

          <p className="text-xs text-center text-muted">
            {phase === "live" && "יש לצלם את פניך לאימות כניסה"}
            {phase === "preview" && "בדוק את התמונה ולחץ אישור"}
            {phase === "uploading" && "מעלה ושומר..."}
          </p>
        </div>
      </div>
    </div>
  );
}
