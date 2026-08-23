"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Tractor,
  Fuel,
  MapPin,
  MessageCircle,
  Download,
  RefreshCw,
  AlertTriangle,
  Briefcase,
  Wallet,
  CircleDot,
  Users,
  UserRound,
} from "lucide-react";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { SmallLoader } from "@/components/ui/SmallLoader";
import { SYNC_LABELS } from "@/lib/constants";

const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

type ActivityItem = {
  id: string;
  type: "machinery" | "fuel";
  title: string;
  subtitle: string;
  time: string;
  syncStatus: string;
  gps?: { lat: number; lng: number } | null;
};

type Stats = {
  totalAcres: number;
  totalFuel: number;
  totalFuelCost: number;
  operators: number;
  workLogsCount: number;
  fuelLogsCount: number;
  attendanceCount: number;
  pendingSync: number;
  alerts: number;
  expiryAlerts: number;
  employeesCount: number;
  customersCount: number;
  vehiclesCount: number;
  pendingApprovals: number;
  ledgerMovements: number;
  tanksCount: number;
};

type ActiveShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: string | null;
};

type DeptCard = {
  href: string;
  title: string;
  icon: typeof Tractor;
  primary: string;
  secondary: string;
};

export function DashboardClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState<"month" | "today">("today");
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [fuelLevels, setFuelLevels] = useState<{ name: string; current: number; capacity: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = mode === "today" ? "" : `?year=${year}&month=${month}`;
      const res = await fetch(`/api/dashboard${params}`, { signal });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setStats(data.stats);
      setActivity(data.activity || []);
      setFuelLevels(data.fuelLevels || []);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setStats({
        totalAcres: 0,
        totalFuel: 0,
        totalFuelCost: 0,
        operators: 0,
        workLogsCount: 0,
        fuelLogsCount: 0,
        attendanceCount: 0,
        pendingSync: 0,
        alerts: 0,
        expiryAlerts: 0,
        employeesCount: 0,
        customersCount: 0,
        vehiclesCount: 0,
        pendingApprovals: 0,
        ledgerMovements: 0,
        tanksCount: 0,
      });
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, mode]);

  const loadActive = useCallback(async (signal?: AbortSignal) => {
    setActiveLoading(true);
    try {
      const res = await fetch("/api/attendance/active", { signal });
      const data = await res.json();
      if (res.ok) setActiveShifts(data.records || []);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    } finally {
      setActiveLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    const ac = new AbortController();
    loadActive(ac.signal);

    const onVis = () => {
      if (document.visibilityState === "visible") loadActive(ac.signal);
    };
    const onFocus = () => loadActive(ac.signal);
    const interval = setInterval(() => loadActive(ac.signal), 5_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      ac.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadActive]);

  if (loading || !stats) {
    return <SmallLoader />;
  }

  const activeCount = activeShifts.length;
  const activeSummary = activeCount ? `עובדים במשמרת (${activeCount})` : "עובדים במשמרת";

  const departments: DeptCard[] = [
    {
      href: "/operations",
      title: "תפעול",
      icon: Briefcase,
      primary: `${stats.fuelLogsCount} תדלוקים · ${stats.tanksCount} מיכלים`,
      secondary:
        stats.pendingApprovals > 0
          ? `${stats.pendingApprovals} ממתינים לאישור`
          : `₪${stats.totalFuelCost.toLocaleString("he-IL")} דלק`,
    },
    {
      href: "/finance",
      title: "כספים",
      icon: Wallet,
      primary: `${stats.ledgerMovements} תנועות`,
      secondary: "כרטסות · תשלומים · תקבולים",
    },
    {
      href: "/fleet",
      title: "כלי רכב",
      icon: CircleDot,
      primary: `${stats.vehiclesCount} כלים · ${stats.workLogsCount} יומנים`,
      secondary:
        stats.expiryAlerts > 0 ? `${stats.expiryAlerts} פקיעות קרובות` : "רכבים · מכונות · טיפולים",
    },
    {
      href: "/customers",
      title: "לקוחות",
      icon: UserRound,
      primary: `${stats.customersCount} לקוחות`,
      secondary: "רישום · כרטסת · התחשבנות",
    },
    {
      href: "/employees",
      title: "עובדים",
      icon: Users,
      primary: `${stats.employeesCount} עובדים`,
      secondary: `${stats.attendanceCount} נוכחו בטווח`,
    },
  ];

  return (
    <>
      <section className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("today")}
            className={`px-3 py-2 text-sm ${mode === "today" ? "bg-primary text-white" : "bg-card"}`}
          >
            היום
          </button>
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-2 text-sm ${mode === "month" ? "bg-primary text-white" : "bg-card"}`}
          >
            חודש
          </button>
        </div>
        {mode === "month" && (
          <>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2 text-sm bg-card"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2 text-sm bg-card"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={() => load()}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
        >
          <RefreshCw className="h-4 w-4" /> רענן
        </button>
        <a
          href="/api/export"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
        >
          <Download className="h-4 w-4" /> ייצוא CSV
        </a>
        <button
          onClick={async () => {
            const r = await fetch("/api/export", { method: "POST" });
            const d = await r.json();
            if (d.url) window.open(d.url, "_blank");
          }}
          className="flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white"
        >
          <MessageCircle className="h-4 w-4" /> סיכום WhatsApp
        </button>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-bold text-muted mb-3">סיכום לפי מחלקה</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="work-card work-card--detail hover:border-primary/40 transition-colors"
            >
              <header className="work-card-head">
                <div className="flex items-center gap-2 min-w-0">
                  <d.icon className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="work-card-title">{d.title}</h3>
                </div>
              </header>
              <div className="px-4 py-3">
                <p className="font-bold text-primary-dark">{d.primary}</p>
                <p className="text-xs text-muted mt-1">{d.secondary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-primary-dark flex items-center gap-2">
            <Users className="h-5 w-5" /> {activeSummary}
          </h3>
          <Link href="/employees" className="text-sm text-primary font-semibold">
            עובדים →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card card-shadow p-4">
          {activeLoading ? (
            <SmallLoader />
          ) : activeCount === 0 ? (
            <p className="text-sm text-muted text-center py-6">אין עובדים במשמרת כרגע</p>
          ) : (
            <div className="space-y-3">
              {activeShifts.map((r) => (
                <Link
                  key={r.id}
                  href={`/employees?q=${encodeURIComponent(r.employeeName)}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-primary-dark truncate">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-2 align-middle" />
                      {r.employeeName}
                    </p>
                    <p className="text-xs text-muted">
                      נכנס:{" "}
                      {r.checkIn
                        ? new Date(r.checkIn).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary">צפה</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {fuelLevels.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <Fuel className="h-5 w-5" /> מצב מיכלים
            </h3>
            <Link href="/operations" className="text-sm text-primary font-semibold">
              ניהול מיכלים →
            </Link>
          </div>
          <div className="work-card-grid">
            {fuelLevels.map((f) => {
              const pct = f.capacity ? Math.round((f.current / f.capacity) * 100) : null;
              return (
                <WorkCardDetail
                  key={f.name}
                  title={f.name}
                  fields={[
                    {
                      label: "קיבולת",
                      value: f.capacity != null ? `${f.capacity} ל׳` : "לא הוגדרה",
                    },
                    ...(pct != null ? [{ label: "אחוז", value: `${pct}%` }] : []),
                  ]}
                  qtyLabel="מלאי"
                  qty={`${f.current} ל׳`}
                  className={pct != null && pct < 25 ? "border-danger/40" : ""}
                />
              );
            })}
          </div>
        </section>
      )}

      {stats.expiryAlerts > 0 && (
        <section className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">
              {stats.expiryAlerts} כלי רכב — טסט/ביטוח עומדים לפוג
            </p>
            <Link href="/fleet" className="text-sm text-primary underline">
              צפה בכלי רכב →
            </Link>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xl font-bold text-primary-dark mb-4">פעילות אחרונה</h3>
        <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
          {activity.length === 0 ? (
            <p className="p-6 text-muted text-center">אין פעילות בטווח שנבחר</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    item.type === "machinery" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.type === "machinery" ? <Tractor className="h-5 w-5" /> : <Fuel className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-dark">{item.title}</p>
                  <p className="text-sm text-muted">{item.subtitle}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted">{new Date(item.time).toLocaleString("he-IL")}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background">
                      {SYNC_LABELS[item.syncStatus] || item.syncStatus}
                    </span>
                    {item.gps && (
                      <a
                        href={`https://maps.google.com/?q=${item.gps.lat},${item.gps.lng}`}
                        target="_blank"
                        rel="noopener"
                        className="text-xs text-primary flex items-center gap-0.5"
                      >
                        <MapPin className="h-3 w-3" /> GPS
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
