"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { EmployeeDateFilter } from "@/components/employee/EmployeeDateFilter";
import {
  TaskDetailModal,
  TaskHistoryCard,
  type HistoryTask,
} from "@/components/employee/TaskHistoryViews";
import { defaultDateRange } from "@/lib/dateRange";
import {
  buildEmployeeDateQuery,
  type EmployeeFilterMode,
} from "@/lib/employee-filters";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  formatTaskDate,
  formatTaskTime,
  formatWorkDuration,
  countTaskImages,
  taskHasVideo,
} from "@/lib/field-task-utils";

const PAGE_SIZE = 15;

export default function EmployeeTaskHistoryPage() {
  const now = new Date();
  const [filterMode, setFilterMode] = useState<EmployeeFilterMode>("month");
  const [rangeState, setRangeState] = useState(defaultDateRange(now.getFullYear(), now.getMonth() + 1));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"COMPLETED" | "ALL">("COMPLETED");
  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<HistoryTask | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildEmployeeDateQuery(filterMode, rangeState);
      params.set("mine", "1");
      if (statusFilter === "COMPLETED") {
        params.set("statuses", "COMPLETED");
      } else {
        params.set("statuses", "ASSIGNED,IN_PROGRESS,AWAITING_COMPLETION,COMPLETED");
      }
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      list.sort((a: HistoryTask, b: HistoryTask) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
      setTasks(list);
      setVisibleCount(PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [filterMode, rangeState, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const hay = [t.customerName, t.settlement, t.workType, t.plotName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <EmployeeShell title="היסטוריית המשימות שלי" subtitle="כל העבודות שביצעת" wide>
      <div className="space-y-4">
        <EmployeeDateFilter
          mode={filterMode}
          onModeChange={setFilterMode}
          rangeState={rangeState}
          onRangeStateChange={setRangeState}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="חיפוש לפי לקוח, כתובת או סוג עבודה"
        />

        <div className="flex gap-2">
          {(["COMPLETED", "ALL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                statusFilter === s ? "bg-primary-dark text-white" : "border border-border bg-card"
              }`}
            >
              {s === "COMPLETED" ? "הושלמו בלבד" : "כל הסטטוסים"}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted py-12">אין משימות בטווח שנבחר</p>
        ) : (
          <>
            <p className="text-sm text-muted">{filtered.length} משימות</p>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {visible.map((t) => (
                <TaskHistoryCard key={t.id} task={t} onOpen={() => setSelected(t)} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 text-right border-b border-border">
                    <th className="p-3 font-bold">תאריך</th>
                    <th className="p-3 font-bold">לקוח</th>
                    <th className="p-3 font-bold">כתובת</th>
                    <th className="p-3 font-bold">עבודה</th>
                    <th className="p-3 font-bold">מכונה</th>
                    <th className="p-3 font-bold">סטטוס</th>
                    <th className="p-3 font-bold">זמן</th>
                    <th className="p-3 font-bold">מדיה</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="border-b border-border hover:bg-muted/5 cursor-pointer"
                    >
                      <td className="p-3 whitespace-nowrap">
                        {formatTaskDate(t.workDate)}
                        <br />
                        <span className="text-xs text-muted">{formatTaskTime(t.workDate)}</span>
                      </td>
                      <td className="p-3 font-semibold">{t.customerName || "—"}</td>
                      <td className="p-3">{t.settlement || "—"}</td>
                      <td className="p-3">{t.workType || t.plotName || "—"}</td>
                      <td className="p-3">{t.machineryUnit?.name || "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${TASK_STATUS_COLORS[t.status] || ""}`}>
                          {TASK_STATUS_LABELS[t.status] || t.status}
                        </span>
                      </td>
                      <td className="p-3">{formatWorkDuration(t.startedAt, t.completedAt)}</td>
                      <td className="p-3 text-xs">
                        {countTaskImages(t.media || []) > 0 && `${countTaskImages(t.media || [])} תמ׳`}
                        {taskHasVideo(t.media || []) && " + סרטון"}
                      </td>
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
                טען עוד ({filtered.length - visibleCount} נותרו)
              </button>
            )}
          </>
        )}

        <Link
          href="/employee/schedule"
          className="block text-center text-sm font-bold text-primary hover:underline"
        >
          חזרה לסידור העבודה הפעיל
        </Link>
      </div>

      {selected && <TaskDetailModal task={selected} onClose={() => setSelected(null)} />}
    </EmployeeShell>
  );
}
