"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";
import { TASK_STATUS_LABELS, formatTaskDate, formatTaskTime } from "@/lib/field-task-utils";
import { MediaGallery } from "@/components/storage/MediaGallery";
import type { FieldTaskRow } from "@/components/dept/types";

type Lookup = {
  employees: { id: string; firstName: string; lastName: string }[];
  vehicles: { id: string; licensePlate: string; make: string | null; model: string | null }[];
  machineryUnits: { id: string; name: string }[];
};

const emptyForm = () => ({
  workDate: new Date().toISOString().slice(0, 10),
  workTime: "08:00",
  customerName: "",
  settlement: "",
  workType: "",
  vehiclePlate: "",
  machineryUnitId: "",
  assigneeId: "",
  notes: "",
});

export function WorkScheduleSection() {
  const [range, setRange] = useState<DateRangeState>(() => {
    const now = new Date();
    return defaultDateRange(now.getFullYear(), now.getMonth() + 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<FieldTaskRow[]>([]);
  const [lookup, setLookup] = useState<Lookup>({ employees: [], vehicles: [], machineryUnits: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("all");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const [tasksRes, lookupRes] = await Promise.all([fetch(`/api/tasks?${dq}`), fetch("/api/lookup")]);
      const [tasksData, lookupData] = await Promise.all([tasksRes.json(), lookupRes.json()]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setLookup({
        employees: lookupData.employees || [],
        vehicles: lookupData.vehicles || [],
        machineryUnits: lookupData.machineryUnits || [],
      });
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return tasks;
    return tasks.filter((t) => t.status === filterStatus);
  }, [tasks, filterStatus]);

  const counts = useMemo(
    () => ({
      assigned: tasks.filter((t) => t.status === "ASSIGNED").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
    }),
    [tasks]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assigneeId || !form.customerName.trim()) {
      setMsg("יש לבחור עובד ולמלא שם לקוח");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: form.workDate,
          workTime: form.workTime,
          customerName: form.customerName.trim(),
          settlement: form.settlement.trim() || null,
          workType: form.workType.trim() || null,
          vehiclePlate: form.vehiclePlate || null,
          machineryUnitId: form.machineryUnitId || null,
          assigneeId: form.assigneeId,
          notes: form.notes.trim() || null,
          plannedQuantity: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה בשמירה");
        return;
      }
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          סידור עבודה חדש
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { id: "all", label: `הכל (${tasks.length})` },
          { id: "ASSIGNED", label: `ממתין (${counts.assigned})` },
          { id: "IN_PROGRESS", label: `בביצוע (${counts.inProgress})` },
          { id: "COMPLETED", label: `הושלם (${counts.completed})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterStatus(f.id)}
            className={`rounded-full px-3 py-1 font-semibold ${filterStatus === f.id ? "bg-primary text-white" : "bg-card border border-border"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted py-10 text-center">אין סידורי עבודה בטווח שנבחר</p>
      ) : (
        <div className="work-card-grid">
          {filtered.map((t) => (
            <WorkCardDetail
              key={t.id}
              date={`${formatTaskDate(t.workDate)} · ${formatTaskTime(t.workDate)}`}
              title={t.customerName || "לקוח"}
              subtitle={`${t.assignee.firstName} ${t.assignee.lastName} · ${TASK_STATUS_LABELS[t.status] || t.status}`}
              fields={[
                { label: "כתובת", value: t.settlement || "—" },
                { label: "סוג עבודה", value: t.workType || t.plotName || "—" },
                { label: "רכב", value: t.vehiclePlate || "—" },
                { label: "מכונה", value: t.machineryUnit?.name || "—" },
                ...(t.startedAt
                  ? [{ label: "התחיל", value: new Date(t.startedAt).toLocaleString("he-IL") }]
                  : []),
                ...(t.completedAt
                  ? [{ label: "הסתיים", value: new Date(t.completedAt).toLocaleString("he-IL") }]
                  : []),
              ]}
              notes={t.employeeNotes || t.managerNotes}
              footer={
                (t.media?.length || t.photoUrls?.length) ? (
                  <div className="px-4 pb-3">
                    <MediaGallery media={t.media} legacyUrls={t.photoUrls} />
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary-dark">סידור עבודה חדש</h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">תאריך *</label>
                <input type="date" required value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} className="field-input" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">שעה *</label>
                <input type="time" required value={form.workTime} onChange={(e) => setForm({ ...form, workTime: e.target.value })} className="field-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">לקוח *</label>
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="field-input" placeholder="למשל: משק כהן" required />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">כתובת / ישוב</label>
              <input value={form.settlement} onChange={(e) => setForm({ ...form, settlement: e.target.value })} className="field-input" placeholder="למשל: אשקלון" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">סוג עבודה</label>
              <input value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} className="field-input" placeholder="למשל: ריסוס" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">רכב</label>
                <select value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} className="field-input">
                  <option value="">ללא</option>
                  {lookup.vehicles.map((v) => (
                    <option key={v.id} value={v.licensePlate}>
                      {v.licensePlate}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">מכונה</label>
                <select value={form.machineryUnitId} onChange={(e) => setForm({ ...form, machineryUnitId: e.target.value })} className="field-input">
                  <option value="">ללא</option>
                  {lookup.machineryUnits.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">שייך לעובד *</label>
              <select required value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="field-input">
                <option value="">בחר עובד</option>
                {lookup.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">הערות</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="field-input min-h-[70px]" placeholder="הערות למפעיל" />
            </div>

            {msg && <p className="text-sm text-red-600 font-semibold">{msg}</p>}

            <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50">
              {saving ? "שומר..." : "שמור סידור עבודה"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
