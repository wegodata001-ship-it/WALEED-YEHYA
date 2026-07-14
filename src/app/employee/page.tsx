"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  Fuel,
  History,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { InlineLoader, SmallLoader } from "@/components/ui/SmallLoader";
import { useCallback, useEffect, useState } from "react";
import { getCurrentPosition } from "@/lib/geolocation";

type User = { firstName: string; lastName: string; role: string; employeeId?: string | null };

type OpenShift = { id: string; checkIn: string };

export default function EmployeeHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [openShift, setOpenShift] = useState<OpenShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftMsg, setShiftMsg] = useState("");
  const [shiftError, setShiftError] = useState(false);

  const loadShift = useCallback(async () => {
    setShiftLoading(true);
    try {
      const now = new Date();
      const res = await fetch(
        `/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      const data = await res.json();
      const open = data.openToday;
      if (open?.checkIn && !open?.checkOut) {
        setOpenShift({ id: open.id, checkIn: open.checkIn });
      } else {
        setOpenShift(null);
      }
    } finally {
      setShiftLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.firstName) setUser(d);
      });
    const now = new Date();
    fetch(
      `/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=ASSIGNED,IN_PROGRESS,AWAITING_COMPLETION`
    )
      .then((r) => r.json())
      .then((d) => setOpenCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
    loadShift();
  }, [loadShift]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const checkIn = async () => {
    setShiftBusy(true);
    setShiftMsg("");
    setShiftError(false);
    try {
      let gps: { lat: number; lng: number };
      try {
        gps = await getCurrentPosition();
      } catch (e) {
        setShiftError(true);
        setShiftMsg(e instanceof Error ? e.message : "לא ניתן לקבל מיקום GPS");
        return;
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", gpsLat: gps.lat, gpsLng: gps.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShiftError(true);
        setShiftMsg(data.error || "שגיאה בכניסה למשמרת");
        return;
      }
      setShiftMsg("נכנסת למשמרת");
      await loadShift();
    } finally {
      setShiftBusy(false);
    }
  };

  const checkOut = async () => {
    setShiftBusy(true);
    setShiftMsg("");
    setShiftError(false);
    try {
      let gps: { lat: number; lng: number };
      try {
        gps = await getCurrentPosition();
      } catch (e) {
        setShiftError(true);
        setShiftMsg(e instanceof Error ? e.message : "לא ניתן לקבל מיקום GPS");
        return;
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_out", gpsLat: gps.lat, gpsLng: gps.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShiftError(true);
        setShiftMsg(data.error || "שגיאה ביציאה מהמשמרת");
        return;
      }
      const hours =
        data.timeEntries?.reduce((s: number, t: { hours: number }) => s + Number(t.hours), 0) ||
        (data.checkIn && data.checkOut
          ? (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 3600000
          : 0);
      setShiftMsg(`יצאת מהמשמרת — ${Math.round(hours * 10) / 10} שעות`);
      setOpenShift(null);
      await loadShift();
    } finally {
      setShiftBusy(false);
    }
  };

  const onShift = Boolean(openShift);

  const menu = [
    {
      title: "סידור העבודה שלי",
      icon: CalendarDays,
      href: "/employee/schedule",
      color: "bg-primary",
      desc: openCount ? `${openCount} עבודות פתוחות` : "העבודות של היום",
    },
    {
      title: "היסטוריית המשימות שלי",
      icon: History,
      href: "/employee/history",
      color: "bg-[#2d6a4f]",
      desc: "כל העבודות שביצעת",
    },
    {
      title: "דיווח תדלוק",
      icon: Fuel,
      href: "/employee/fuel",
      color: "bg-[#8b4513]",
      desc: "רכב חברה, קבלן או מילוי מיכל",
    },
    {
      title: "הנוכחות שלי",
      icon: Clock,
      href: "/employee/attendance",
      color: "bg-[#2d4a8a]",
      desc: onShift ? "במשמרת — פרטים והיסטוריה" : "כניסה, יציאה והיסטוריה",
    },
    {
      title: "דיווחים",
      icon: FileText,
      href: "/employee/reports",
      color: "bg-[#c26a12]",
      desc: "יומן עבודה אישי",
    },
    {
      title: "הפרופיל שלי",
      icon: UserRound,
      href: "/employee/profile",
      color: "bg-[#5c4d7a]",
      desc: "פרטים אישיים",
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(165deg,#1e3318 0%,#3d6b2e 55%,#243d1c 100%)" }}>
      <header className="px-4 py-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#d4b44a] text-sm font-semibold">WALLED YEHYA GROUP</p>
            <h1 className="text-2xl font-extrabold mt-1">ממשק עובד</h1>
            {user && <p className="text-emerald-100/80 text-sm mt-1 font-medium">שלום, {user.firstName}</p>}
          </div>
          <button onClick={logout} className="p-2 rounded-lg bg-white/10" type="button">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-8 space-y-4">
        <section className="rounded-2xl bg-white/10 border border-white/15 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-emerald-100">נוכחות היום</p>
            <span
              className={`text-xs font-extrabold rounded-full px-2.5 py-1 ${
                onShift ? "bg-emerald-500 text-white" : "bg-white/15 text-emerald-100"
              }`}
            >
              {shiftLoading ? "..." : onShift ? "במשמרת" : "לא במשמרת"}
            </span>
          </div>

          {onShift && openShift && (
            <p className="text-xs text-emerald-100/90">
              כניסה:{" "}
              {new Date(openShift.checkIn).toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {shiftLoading ? (
            <SmallLoader className="py-4" />
          ) : !onShift ? (
            <button
              type="button"
              disabled={shiftBusy}
              onClick={checkIn}
              className="w-full rounded-2xl bg-emerald-500 text-white py-5 font-extrabold text-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg"
            >
              {shiftBusy ? <InlineLoader className="h-7 w-7" /> : <LogIn className="h-7 w-7" />}
              🟢 כניסה למשמרת
            </button>
          ) : (
            <button
              type="button"
              disabled={shiftBusy}
              onClick={checkOut}
              className="w-full rounded-2xl bg-red-600 text-white py-5 font-extrabold text-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg"
            >
              {shiftBusy ? <InlineLoader className="h-7 w-7" /> : <LogOut className="h-7 w-7" />}
              🔴 יציאה מהמשמרת
            </button>
          )}

          {shiftMsg && (
            <div className="space-y-2">
              <p
                className={`text-sm text-center font-semibold rounded-xl py-2 px-3 ${
                  shiftError ? "bg-red-500/20 text-red-100" : "bg-emerald-500/20 text-emerald-50"
                }`}
              >
                {shiftMsg}
              </p>
              {shiftError && /משימה פעילה/.test(shiftMsg) && (
                <Link
                  href="/employee/schedule"
                  className="block text-center rounded-xl bg-white text-primary-dark py-2.5 text-sm font-extrabold"
                >
                  מעבר לסידור העבודה
                </Link>
              )}
            </div>
          )}
        </section>

        {menu.map((action) => (
          <Link
            key={action.href + action.title}
            href={action.href}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 text-primary-dark active:scale-[0.98] transition-transform"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg font-extrabold block">{action.title}</span>
              <span className="text-xs text-muted">{action.desc}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted rotate-180" />
          </Link>
        ))}
      </main>
    </div>
  );
}
