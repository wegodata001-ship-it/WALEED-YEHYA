"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Play } from "lucide-react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { EmployeeDateFilter } from "@/components/employee/EmployeeDateFilter";
import { defaultDateRange } from "@/lib/dateRange";
import {
  buildEmployeeDateQuery,
  type EmployeeFilterMode,
} from "@/lib/employee-filters";

type RecordRow = {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  timeEntries: { hours: number; entryType: string }[];
};

const PAGE_SIZE = 20;

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function computeRowHours(r: RecordRow) {
  const fromEntries = (r.timeEntries || []).reduce((s, t) => s + Number(t.hours), 0);
  if (fromEntries > 0) return Math.round(fromEntries * 10) / 10;
  if (r.checkIn && r.checkOut) {
    const h = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000;
    return Math.round(h * 10) / 10;
  }
  return 0;
}

export default function EmployeeMyAttendancePage() {
  const now = new Date();
  const [filterMode, setFilterMode] = useState<EmployeeFilterMode>("month");
  const [rangeState, setRangeState] = useState(defaultDateRange(now.getFullYear(), now.getMonth() + 1));
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildEmployeeDateQuery(filterMode, rangeState);
      const res = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      const list = (data.records || []).filter((r: RecordRow) => r.checkIn);
      setRecords(list);
      setVisibleCount(PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [filterMode, rangeState]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let totalHours = 0;
    let completedDays = 0;
    for (const r of records) {
      const h = computeRowHours(r);
      if (r.checkOut) {
        completedDays += 1;
        totalHours += h;
      }
    }
    return {
      days: completedDays,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [records]);

  const visible = records.slice(0, visibleCount);
  const hasMore = visibleCount < records.length;

  return (
    <EmployeeShell title="הנוכחות שלי" subtitle="היסטוריה וסיכום" wide>
      <div className="space-y-4">
        <Link
          href="/employee/attendance"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 font-bold"
        >
          <Play className="h-5 w-5" />
          התחל / סיים יום עבודה
        </Link>

        <EmployeeDateFilter
          mode={filterMode}
          onModeChange={setFilterMode}
          rangeState={rangeState}
          onRangeStateChange={setRangeState}
        />

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="ימי עבודה" value={String(totals.days)} />
          <SummaryCard label="שעות עבודה" value={String(totals.totalHours)} />
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        ) : records.length === 0 ? (
          <p className="text-center text-muted py-12">אין רישומי נוכחות בטווח שנבחר</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {visible.map((r) => (
                <article key={r.id} className="rounded-xl border border-border bg-card p-4 card-shadow">
                  <p className="font-extrabold text-lg mb-2">
                    {new Date(r.workDate).toLocaleDateString("he-IL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm text-center">
                    <div>
                      <p className="text-xs text-muted">כניסה</p>
                      <p className="font-bold">{formatTime(r.checkIn)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">יציאה</p>
                      <p className="font-bold">{formatTime(r.checkOut)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">שעות</p>
                      <p className="font-bold text-primary">{computeRowHours(r)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 text-right border-b border-border">
                    <th className="p-3 font-bold">תאריך</th>
                    <th className="p-3 font-bold">שעת כניסה</th>
                    <th className="p-3 font-bold">שעת יציאה</th>
                    <th className="p-3 font-bold">סך שעות</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="p-3 font-semibold whitespace-nowrap">
                        {new Date(r.workDate).toLocaleDateString("he-IL")}
                      </td>
                      <td className="p-3">{formatTime(r.checkIn)}</td>
                      <td className="p-3">{formatTime(r.checkOut)}</td>
                      <td className="p-3 font-bold text-primary">{computeRowHours(r)} ש׳</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full rounded-xl border border-border py-3 font-bold text-primary"
              >
                טען עוד ({records.length - visibleCount} נותרו)
              </button>
            )}
          </>
        )}
      </div>
    </EmployeeShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center card-shadow">
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
