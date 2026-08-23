"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { InlineLoader, SmallLoader } from "@/components/ui/SmallLoader";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { SearchableSelect, type SelectOption } from "@/components/SearchableSelect";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";
import {
  TASK_STATUS_LABELS,
  formatTaskDate,
  formatTaskTime,
  isInTreatmentStatus,
  normalizeTaskStatus,
} from "@/lib/field-task-utils";
import { TaskMediaViewer } from "@/components/storage/TaskMediaViewer";
import { buildFieldTaskDetailFields, quantityCompletionBadge } from "@/components/dept/field-task-fields";
import { SCHEDULE_QUANTITY_UNITS } from "@/lib/constants";
import { normalizeLabel } from "@/lib/master-data";
import { VEHICLE_OWNERSHIP_LABELS } from "@/lib/vehicle-ownership";
import type { FieldTaskRow } from "@/components/dept/types";

type Lookup = {
  employees: { id: string; firstName: string; lastName: string }[];
  vehicles: {
    id: string;
    licensePlate: string;
    make: string | null;
    model: string | null;
    ownership?: "COMPANY" | "CONTRACTOR";
  }[];
  machineryUnits: { id: string; name: string }[];
};

type MasterData = {
  customers: { id: string; name: string }[];
  settlements: { id: string; name: string }[];
  plots: { id: string; name: string }[];
  materials: { id: string | null; name: string }[];
};

const emptyForm = () => ({
  customerName: "",
  settlement: "",
  plotName: "",
  material: "",
  plannedQuantity: "1",
  quantityUnitUi: "DUNAM",
  vehiclePlate: "",
  machineryUnitId: "",
  assigneeId: "",
  workDate: new Date().toISOString().slice(0, 10),
  workTime: "08:00",
  notes: "",
});

async function ensureMaster(
  kind: "customer" | "settlement" | "plot" | "material",
  name: string,
  extra?: { settlementName?: string }
): Promise<SelectOption | null> {
  const res = await fetch("/api/master-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, name, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return { id: data.id, label: data.name };
}

export function WorkScheduleSection() {
  const [range, setRange] = useState<DateRangeState>(() => {
    const now = new Date();
    return defaultDateRange(now.getFullYear(), now.getMonth() + 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<FieldTaskRow[]>([]);
  const [lookup, setLookup] = useState<Lookup>({ employees: [], vehicles: [], machineryUnits: [] });
  const [master, setMaster] = useState<MasterData>({
    customers: [],
    settlements: [],
    plots: [],
    materials: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterVehiclePlate, setFilterVehiclePlate] = useState("");
  const [filterMachineryUnitId, setFilterMachineryUnitId] = useState("");
  const [msg, setMsg] = useState("");
  const [historyTask, setHistoryTask] = useState<FieldTaskRow | null>(null);

  const loadMaster = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/master-data", { signal });
    const data = await res.json();
    if (res.ok) {
      setMaster({
        customers: data.customers || [],
        settlements: data.settlements || [],
        plots: data.plots || [],
        materials: data.materials || [],
      });
    }
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      // Defer master-data until form open — schedule list only needs tasks + lookup
      const [tasksRes, lookupRes] = await Promise.all([
        fetch(`/api/tasks?${dq}`, { signal }),
        fetch("/api/lookup?scope=schedule", { signal }),
      ]);
      const [tasksData, lookupData] = await Promise.all([tasksRes.json(), lookupRes.json()]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setLookup({
        employees: lookupData.employees || [],
        vehicles: lookupData.vehicles || [],
        machineryUnits: lookupData.machineryUnits || [],
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    if (!showForm) return;
    const ac = new AbortController();
    loadMaster(ac.signal).catch(() => {});
    return () => ac.abort();
  }, [showForm, loadMaster]);

  const customerOpts: SelectOption[] = useMemo(
    () => master.customers.map((c) => ({ id: c.id, label: c.name })),
    [master.customers]
  );
  const settlementOpts: SelectOption[] = useMemo(
    () => master.settlements.map((s) => ({ id: s.id, label: s.name })),
    [master.settlements]
  );
  const plotOpts: SelectOption[] = useMemo(
    () => master.plots.map((p) => ({ id: p.id, label: p.name })),
    [master.plots]
  );
  const materialOpts: SelectOption[] = useMemo(
    () => master.materials.map((m, i) => ({ id: m.id || `mat-${i}-${m.name}`, label: m.name })),
    [master.materials]
  );
  const vehicleOpts: SelectOption[] = useMemo(
    () => [
      { id: "", label: "ללא" },
      ...lookup.vehicles.map((v) => {
        const ownership = VEHICLE_OWNERSHIP_LABELS[v.ownership || "COMPANY"];
        const base = v.model ? `${v.licensePlate} · ${v.model}` : v.licensePlate;
        return { id: v.licensePlate, label: `${ownership} · ${base}` };
      }),
    ],
    [lookup.vehicles]
  );
  const machineOpts: SelectOption[] = useMemo(
    () => [{ id: "", label: "ללא" }, ...lookup.machineryUnits.map((m) => ({ id: m.id, label: m.name }))],
    [lookup.machineryUnits]
  );
  const employeeOpts: SelectOption[] = useMemo(
    () =>
      lookup.employees.map((e) => ({
        id: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    [lookup.employees]
  );
  const unitOpts: SelectOption[] = useMemo(
    () => SCHEDULE_QUANTITY_UNITS.map((u) => ({ id: u.value, label: u.label })),
    []
  );

  const customerFilterOptions = useMemo(() => {
    const names = new Set(master.customers.map((c) => c.name));
    for (const t of tasks) {
      if (t.customerName?.trim()) names.add(t.customerName.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "he"));
  }, [tasks, master.customers]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all") {
        if (filterStatus === "IN_PROGRESS") {
          if (!isInTreatmentStatus(t.status)) return false;
        } else if (normalizeTaskStatus(t.status) !== filterStatus) {
          return false;
        }
      }
      if (filterEmployeeId) {
        const aid = t.assigneeId || t.assignee?.id;
        if (aid !== filterEmployeeId) return false;
      }
      if (filterCustomer && (t.customerName || "") !== filterCustomer) return false;
      if (filterVehiclePlate && (t.vehiclePlate || "") !== filterVehiclePlate) return false;
      if (filterMachineryUnitId && t.machineryUnitId !== filterMachineryUnitId) return false;
      return true;
    });
  }, [tasks, filterStatus, filterEmployeeId, filterCustomer, filterVehiclePlate, filterMachineryUnitId]);

  const counts = useMemo(
    () => ({
      assigned: tasks.filter((t) => t.status === "ASSIGNED").length,
      inProgress: tasks.filter((t) => isInTreatmentStatus(t.status)).length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
    }),
    [tasks]
  );

  const addToMasterLocal = (kind: keyof MasterData, id: string, name: string) => {
    setMaster((prev) => {
      const list = prev[kind] as { id: string; name: string }[];
      if (list.some((x) => x.name.toLowerCase() === name.toLowerCase())) return prev;
      return { ...prev, [kind]: [...list, { id, name }] };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerName = normalizeLabel(form.customerName);
    if (!form.assigneeId || !customerName) {
      setMsg("יש לבחור עובד ולמלא שם לקוח");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      // Persist free-typed values into master tables (deduped on server)
      const settlement = normalizeLabel(form.settlement);
      const plotName = normalizeLabel(form.plotName);
      const material = normalizeLabel(form.material);

      await Promise.all([
        ensureMaster("customer", customerName, { settlementName: settlement || undefined }),
        settlement ? ensureMaster("settlement", settlement) : Promise.resolve(null),
        plotName ? ensureMaster("plot", plotName, { settlementName: settlement || undefined }) : Promise.resolve(null),
        material ? ensureMaster("material", material) : Promise.resolve(null),
      ]);

      const plate =
        lookup.vehicles.find(
          (v) =>
            v.licensePlate === form.vehiclePlate ||
            `${v.licensePlate} · ${v.model || ""}`.trim() === form.vehiclePlate
        )?.licensePlate ||
        (form.vehiclePlate === "ללא" ? "" : form.vehiclePlate);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          settlement: settlement || null,
          plotName: plotName || null,
          material: material || null,
          plannedQuantity: Number(form.plannedQuantity || 1),
          quantityUnitUi: form.quantityUnitUi,
          vehiclePlate: plate || null,
          machineryUnitId: form.machineryUnitId || null,
          assigneeId: form.assigneeId,
          workDate: form.workDate,
          workTime: form.workTime,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה בשמירה");
        return;
      }
      setTasks((prev) => [data, ...prev]);
      setShowForm(false);
      setForm(emptyForm());
      await loadMaster();
    } finally {
      setSaving(false);
    }
  };

  const vehicleDisplayValue = () => {
    if (!form.vehiclePlate) return "";
    const v = lookup.vehicles.find((x) => x.licensePlate === form.vehiclePlate);
    if (!v) return form.vehiclePlate;
    return v.model ? `${v.licensePlate} · ${v.model}` : v.licensePlate;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter value={range} onChange={setRange} />
        <button
          type="button"
          onClick={() => {
            setMsg("");
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          סידור עבודה חדש
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { id: "all", label: `הכל (${tasks.length})` },
          { id: "ASSIGNED", label: `🟡 ממתין (${counts.assigned})` },
          { id: "IN_PROGRESS", label: `🟠 בטיפול (${counts.inProgress})` },
          { id: "COMPLETED", label: `🟢 הושלם (${counts.completed})` },
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          value={filterEmployeeId}
          onChange={(e) => setFilterEmployeeId(e.target.value)}
          className="field-input text-sm"
        >
          <option value="">כל העובדים</option>
          {lookup.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
        <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="field-input text-sm">
          <option value="">כל הלקוחות</option>
          {customerFilterOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={filterVehiclePlate}
          onChange={(e) => setFilterVehiclePlate(e.target.value)}
          className="field-input text-sm"
        >
          <option value="">כל כלי הרכב</option>
          {lookup.vehicles.map((v) => (
            <option key={v.id} value={v.licensePlate}>
              {v.licensePlate}
            </option>
          ))}
        </select>
        <select
          value={filterMachineryUnitId}
          onChange={(e) => setFilterMachineryUnitId(e.target.value)}
          className="field-input text-sm"
        >
          <option value="">כל המכונות</option>
          {lookup.machineryUnits.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SmallLoader />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted py-10 text-center">אין סידורי עבודה בטווח שנבחר</p>
      ) : (
        <div className="work-card-grid">
          {filtered.map((t) => (
            (() => {
              const unit = t.quantityUnitLabel || t.quantityUnit;
              const planned = Number(t.plannedQuantity || 0);
              const reported = t.reportedQuantity != null ? Number(t.reportedQuantity) : 0;
              const remaining =
                t.remainingQuantity != null
                  ? Number(t.remainingQuantity)
                  : planned
                    ? planned - reported
                    : null;
              const pctRaw =
                t.quantityComparison?.completionPct != null
                  ? Number(t.quantityComparison.completionPct)
                  : planned
                    ? Math.round((reported / planned) * 100)
                    : null;
              const pct = pctRaw != null ? Math.max(0, Math.min(100, pctRaw)) : null;
              const reports = t.progressReports || [];
              const lastReportAt =
                reports.length > 0
                  ? reports
                      .map((r) => r.at)
                      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
                  : null;
              const daysWorked = (() => {
                if (!reports.length) return reported > 0 ? 1 : 0;
                const set = new Set<string>();
                for (const r of reports) set.add(new Date(r.at).toISOString().slice(0, 10));
                return set.size;
              })();

              const ProgressBar = () =>
                pct == null ? null : (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                      <span>התקדמות</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                        aria-label={`התקדמות ${pct}%`}
                      />
                    </div>
                  </div>
                );

              return (
            <WorkCardDetail
              key={t.id}
              date={`${formatTaskDate(t.workDate)} · ${formatTaskTime(t.workDate)}`}
              title={t.customerName || "לקוח"}
              subtitle={[
                `${t.assignee.firstName} ${t.assignee.lastName}`,
                TASK_STATUS_LABELS[t.status] || t.status,
                quantityCompletionBadge(t),
                t.media && t.media.filter((m) => m.kind === "image").length
                  ? `📷 ${t.media.filter((m) => m.kind === "image").length}`
                  : null,
                t.media?.some((m) => m.kind === "video") ? "🎥" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              fields={[
                { label: "עובד", value: `${t.assignee.firstName} ${t.assignee.lastName}` },
                ...buildFieldTaskDetailFields(t),
                ...(t.startedAt
                  ? [{ label: "התחיל", value: new Date(t.startedAt).toLocaleString("he-IL") }]
                  : []),
                ...(t.completedAt
                  ? [{ label: "הסתיים", value: new Date(t.completedAt).toLocaleString("he-IL") }]
                  : []),
              ]}
              notes={t.employeeNotes || t.managerNotes}
              footer={
                <div className="border-t border-border bg-[var(--surface)]">
                  <div className="px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="text-muted font-bold">מתוכנן</div>
                        <div className="font-extrabold text-primary-dark">
                          {planned.toLocaleString("he-IL")} {unit}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="text-muted font-bold">בוצע</div>
                        <div className="font-extrabold text-primary-dark">
                          {reported.toLocaleString("he-IL")} {unit}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="text-muted font-bold">נותר</div>
                        <div className="font-extrabold text-primary-dark">
                          {remaining == null ? "—" : `${Number(remaining).toLocaleString("he-IL")} ${unit}`}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="text-muted font-bold">ימי עבודה</div>
                        <div className="font-extrabold text-primary-dark">{daysWorked || "—"}</div>
                      </div>
                    </div>

                    <ProgressBar />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-muted font-semibold">
                        דיווח אחרון:{" "}
                        {lastReportAt
                          ? new Date(lastReportAt).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryTask(t)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-extrabold hover:border-primary/40"
                        disabled={reports.length === 0}
                        title={reports.length === 0 ? "אין היסטוריה עדיין" : "היסטוריית ביצוע"}
                      >
                        היסטוריית ביצוע
                      </button>
                    </div>
                  </div>

                  {(t.status === "COMPLETED" || (t.media && t.media.length > 0)) && (
                    <div className="px-4 py-3 border-t border-border">
                      <TaskMediaViewer
                        media={t.media}
                        legacyUrls={t.photoUrls}
                        showEmpty={t.status === "COMPLETED"}
                      />
                    </div>
                  )}
                </div>
              }
            />
              );
            })()
          ))}
        </div>
      )}

      {historyTask && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-card border border-border p-5 card-shadow space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-primary-dark truncate">היסטוריית ביצוע</h3>
                <p className="text-xs text-muted truncate">
                  {historyTask.customerName || "לקוח"} · {historyTask.assignee.firstName} {historyTask.assignee.lastName}
                </p>
              </div>
              <button type="button" onClick={() => setHistoryTask(null)} className="p-1 rounded hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(!historyTask.progressReports || historyTask.progressReports.length === 0) ? (
              <p className="text-sm text-muted text-center py-10">אין דיווחים עדיין</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-background">
                <table className="w-full min-w-[720px] text-sm text-right">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs text-muted">
                      <th className="px-3 py-2.5 font-bold">תאריך</th>
                      <th className="px-3 py-2.5 font-bold">עובד</th>
                      <th className="px-3 py-2.5 font-bold">בוצע</th>
                      <th className="px-3 py-2.5 font-bold">סה״כ אחרי</th>
                      <th className="px-3 py-2.5 font-bold">הערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTask.progressReports
                      .slice()
                      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
                      .map((r, idx) => (
                        <tr key={`${r.at}-${idx}`} className="border-b border-border/70 last:border-0">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {new Date(r.at).toLocaleDateString("he-IL")}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {historyTask.assignee.firstName} {historyTask.assignee.lastName}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-primary-dark whitespace-nowrap">
                            {Number(r.quantity).toLocaleString("he-IL")} {historyTask.quantityUnitLabel || historyTask.quantityUnit}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {Number(r.totalAfter).toLocaleString("he-IL")}
                          </td>
                          <td className="px-3 py-2.5 text-muted">
                            {r.notes || "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary-dark">סידור עבודה חדש</h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            <SearchableSelect
              label="לקוח"
              required
              value={form.customerName}
              options={customerOpts}
              placeholder="חפש לקוח או הוסף חדש"
              onChange={(label) => setForm((f) => ({ ...f, customerName: label }))}
              onCreate={async (name) => {
                const created = await ensureMaster("customer", name, {
                  settlementName: form.settlement || undefined,
                });
                if (created) addToMasterLocal("customers", created.id, created.label);
                return created;
              }}
            />

            <SearchableSelect
              label="ישוב"
              value={form.settlement}
              options={settlementOpts}
              placeholder="חפש ישוב או הוסף חדש"
              onChange={(label) => setForm((f) => ({ ...f, settlement: label }))}
              onCreate={async (name) => {
                const created = await ensureMaster("settlement", name);
                if (created) addToMasterLocal("settlements", created.id, created.label);
                return created;
              }}
            />

            <SearchableSelect
              label="חלקה"
              value={form.plotName}
              options={plotOpts}
              placeholder="חפש חלקה או הוסף חדשה"
              onChange={(label) => setForm((f) => ({ ...f, plotName: label }))}
              onCreate={async (name) => {
                const created = await ensureMaster("plot", name, {
                  settlementName: form.settlement || undefined,
                });
                if (created) addToMasterLocal("plots", created.id, created.label);
                return created;
              }}
            />

            <SearchableSelect
              label="חומר"
              value={form.material}
              options={materialOpts}
              placeholder="חפש חומר או הוסף חדש"
              onChange={(label) => setForm((f) => ({ ...f, material: label }))}
              onCreate={async (name) => {
                const created = await ensureMaster("material", name);
                if (created) {
                  setMaster((prev) => {
                    if (prev.materials.some((m) => m.name.toLowerCase() === created.label.toLowerCase())) {
                      return prev;
                    }
                    return {
                      ...prev,
                      materials: [...prev.materials, { id: created.id, name: created.label }],
                    };
                  });
                }
                return created;
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">כמות</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.plannedQuantity}
                  onChange={(e) => setForm({ ...form, plannedQuantity: e.target.value })}
                  className="field-input"
                />
              </div>
              <SearchableSelect
                label="יחידת מידה"
                value={SCHEDULE_QUANTITY_UNITS.find((u) => u.value === form.quantityUnitUi)?.label || form.quantityUnitUi}
                options={unitOpts}
                allowCreate={false}
                onChange={(label, opt) => {
                  const byLabel = SCHEDULE_QUANTITY_UNITS.find((u) => u.label === label);
                  setForm((f) => ({
                    ...f,
                    quantityUnitUi: opt?.id || byLabel?.value || f.quantityUnitUi,
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                label="כלי רכב"
                value={vehicleDisplayValue()}
                options={vehicleOpts}
                allowCreate={false}
                onChange={(label, opt) => {
                  if (!label || label === "ללא" || opt?.id === "") {
                    setForm((f) => ({ ...f, vehiclePlate: "" }));
                    return;
                  }
                  const v = lookup.vehicles.find((x) => x.id === opt?.id);
                  setForm((f) => ({ ...f, vehiclePlate: v?.licensePlate || label.split(" · ")[0] }));
                }}
              />
              <SearchableSelect
                label="מכונה"
                value={
                  form.machineryUnitId
                    ? lookup.machineryUnits.find((m) => m.id === form.machineryUnitId)?.name || ""
                    : ""
                }
                options={machineOpts}
                allowCreate={false}
                onChange={(label, opt) => {
                  if (!label || label === "ללא" || !opt?.id) {
                    setForm((f) => ({ ...f, machineryUnitId: "" }));
                    return;
                  }
                  setForm((f) => ({ ...f, machineryUnitId: opt.id }));
                }}
              />
            </div>

            <SearchableSelect
              label="עובד"
              required
              value={
                form.assigneeId
                  ? employeeOpts.find((e) => e.id === form.assigneeId)?.label || ""
                  : ""
              }
              options={employeeOpts}
              allowCreate={false}
              placeholder="חפש עובד..."
              onChange={(_label, opt) => {
                if (opt?.id) setForm((f) => ({ ...f, assigneeId: opt.id }));
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">תאריך *</label>
                <input
                  type="date"
                  required
                  value={form.workDate}
                  onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                  className="field-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">שעה *</label>
                <input
                  type="time"
                  required
                  value={form.workTime}
                  onChange={(e) => setForm({ ...form, workTime: e.target.value })}
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">הערות</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="field-input min-h-[70px]"
                placeholder="הערות למפעיל"
              />
            </div>

            {msg && <p className="text-sm text-red-600 font-semibold">{msg}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <InlineLoader />
                  שומר...
                </>
              ) : (
                "שמור סידור עבודה"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
