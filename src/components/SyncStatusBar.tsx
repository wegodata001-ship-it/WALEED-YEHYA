"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { getOfflineQueue, syncOfflineQueue } from "@/lib/offline-sync";

export function SyncStatusBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = () => setPending(getOfflineQueue().length);

  const sync = async () => {
    setSyncing(true);
    await syncOfflineQueue();
    refresh();
    setSyncing(false);
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    const onOnline = () => {
      setOnline(true);
      sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div
      className={`rounded-xl p-3 border flex items-center justify-between ${
        online ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {online ? (
          <Wifi className="h-4 w-4 text-emerald-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-600" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {online ? "מחובר לשרת" : "אופליין — נשמר מקומית"}
          </p>
          {pending > 0 && (
            <p className="text-xs text-muted">{pending} רשומות ממתינות לסנכרון</p>
          )}
        </div>
      </div>
      {pending > 0 && online && (
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          סנכרן
        </button>
      )}
    </div>
  );
}
