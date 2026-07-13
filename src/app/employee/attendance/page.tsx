"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LogOut, Play, Clock, History } from "lucide-react";
import { getCurrentPosition } from "@/lib/geolocation";
import { EmployeeShell } from "@/components/EmployeeShell";

type OpenShift = {
  id: string;
  checkIn: string;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EmployeeAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openShift, setOpenShift] = useState<OpenShift | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const res = await fetch(
        `/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      const data = await res.json();
      const open = data.openToday;
      if (open?.checkIn) {
        setOpenShift({ id: open.id, checkIn: open.checkIn });
      } else {
        setOpenShift(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!openShift?.checkIn) {
      setElapsed("00:00:00");
      return;
    }
    const tick = () => {
      const ms = Date.now() - new Date(openShift.checkIn).getTime();
      setElapsed(formatElapsed(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [openShift?.checkIn]);

  const startDay = async () => {
    setBusy(true);
    setMsg("");
    try {
      let gps: { lat: number; lng: number };
      try {
        gps = await getCurrentPosition();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "לא ניתן לקבל מיקום GPS");
        return;
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", gpsLat: gps.lat, gpsLng: gps.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setMsg("יום העבודה התחיל");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const endDay = async () => {
    setBusy(true);
    setMsg("");
    try {
      let gps: { lat: number; lng: number };
      try {
        gps = await getCurrentPosition();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "לא ניתן לקבל מיקום GPS");
        return;
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_out", gpsLat: gps.lat, gpsLng: gps.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      const hours =
        data.timeEntries?.reduce((s: number, t: { hours: number }) => s + Number(t.hours), 0) ||
        (data.checkIn && data.checkOut
          ? (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 3600000
          : 0);
      setMsg(`יום העבודה הסתיים — ${Math.round(hours * 10) / 10} שעות`);
      setOpenShift(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <EmployeeShell title="נוכחות" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  const onShift = Boolean(openShift);

  return (
    <EmployeeShell title="נוכחות" subtitle={onShift ? "במשמרת" : "לא במשמרת"}>
      <div className="space-y-6">
        {!onShift ? (
          <div className="text-center space-y-6 py-8">
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8">
              <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
              <p className="text-muted text-sm mb-6">לחץ כדי להתחיל את יום העבודה — יישמר מיקום GPS</p>
              <button
                type="button"
                disabled={busy}
                onClick={startDay}
                className="w-full rounded-2xl bg-emerald-600 text-white py-6 font-extrabold text-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              >
                {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Play className="h-7 w-7" />}
                התחל יום עבודה
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-4">
              <span className="inline-block text-xs font-bold bg-emerald-600 text-white px-3 py-1 rounded-full">
                במשמרת
              </span>
              <div>
                <p className="text-sm text-emerald-800 mb-1">שעת כניסה</p>
                <p className="text-3xl font-extrabold text-emerald-900">
                  {new Date(openShift!.checkIn).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-emerald-800 mb-1">זמן עבודה מצטבר</p>
                <p className="text-4xl font-extrabold text-primary-dark tabular-nums">{elapsed}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={endDay}
              className="w-full rounded-2xl bg-primary-dark text-white py-6 font-extrabold text-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            >
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <LogOut className="h-7 w-7" />}
              סיים יום עבודה
            </button>
          </div>
        )}

        {msg && (
          <p className="text-sm text-center rounded-xl border border-border bg-card py-3 font-semibold text-primary-dark flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {msg}
          </p>
        )}

        <Link
          href="/employee/my-attendance"
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-4 font-bold text-primary hover:bg-muted/10"
        >
          <History className="h-5 w-5" />
          הנוכחות שלי — היסטוריה וסיכום
        </Link>
      </div>
    </EmployeeShell>
  );
}
