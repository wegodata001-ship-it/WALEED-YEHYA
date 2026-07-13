"use client";

import { useEffect, useState } from "react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { CheckCircle2, Loader2, MapPin, Play, Square } from "lucide-react";
import { formatTaskDate, formatTaskTime, TASK_STATUS_LABELS, resolveMeterKind, meterKindLabel } from "@/lib/field-task-utils";
import { MediaUploader } from "@/components/storage/MediaUploader";
import { deleteStoragePaths } from "@/components/storage/media-utils";
import type { StoredMediaRef } from "@/lib/storage/types";

type Task = {
  id: string;
  workDate: string;
  settlement: string | null;
  customerName: string | null;
  workType: string | null;
  plotName: string | null;
  vehiclePlate: string | null;
  managerNotes: string | null;
  material?: string | null;
  plot?: string | null;
  machineryUnit: { id?: string; name: string } | null;
  machineryUnitId?: string | null;
  meterKind?: "odometer_km" | "engine_hours" | null;
  status: string;
  startedAt: string | null;
};

function taskMeterKind(t: Task) {
  return t.meterKind ?? resolveMeterKind({ machineryUnitId: t.machineryUnitId, vehiclePlate: t.vehiclePlate });
}

export default function EmployeeSchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Task | null>(null);
  const [notes, setNotes] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [media, setMedia] = useState<StoredMediaRef[]>([]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const now = new Date();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=ASSIGNED,IN_PROGRESS`
      );
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startWork = async (task: Task) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelReport = async () => {
    if (media.length > 0) await deleteStoragePaths(media.map((m) => m.path));
    setActive(null);
    setNotes("");
    setMeterReading("");
    setMedia([]);
    setMsg("");
  };

  const finishWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    const kind = taskMeterKind(active);
    if (kind && (!meterReading.trim() || Number(meterReading) < 0)) {
      setMsg(kind === "engine_hours" ? "יש למלא שעות מנוע נוכחיות" : "יש למלא קילומטרים נוכחיים");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          action: "complete",
          actualNotes: notes,
          media,
          ...(kind ? { meterReading: Number(meterReading) } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setDone(true);
      setActive(null);
      setNotes("");
      setMeterReading("");
      setMedia([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <EmployeeShell title="סידור העבודה שלי" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  if (done) {
    return (
      <EmployeeShell title="העבודה הושלמה" subtitle="המנהל קיבל עדכון">
        <div className="text-center py-8">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <p className="text-muted mb-4">הדיווח נשלח למנהל עם שעות, הערות, תמונות וסרטון</p>
          <button type="button" onClick={() => setDone(false)} className="w-full rounded-xl bg-primary py-3 text-white font-bold">
            חזרה לסידור
          </button>
        </div>
      </EmployeeShell>
    );
  }

  if (active) {
    return (
      <EmployeeShell title="סיום עבודה" subtitle={active.customerName || "לקוח"}>
        <form onSubmit={finishWork} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="font-bold text-lg text-primary-dark">{active.customerName}</p>
            <p className="text-sm flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {active.settlement || "—"}
            </p>
            <p className="text-sm">{active.material || active.plot || active.plotName || "עבודה"}</p>
          </div>

          {taskMeterKind(active) && (
            <div>
              <label className="block text-sm font-bold mb-1">
                {meterKindLabel(taskMeterKind(active))} <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.1"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                className="field-input text-lg font-bold"
                placeholder={taskMeterKind(active) === "engine_hours" ? "שעות מנוע" : "קילומטרים"}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input min-h-[90px]"
              placeholder="מה בוצע? הערות לסיום"
            />
          </div>

          <MediaUploader
            module="tasks"
            entityId={active.id}
            value={media}
            onChange={setMedia}
            disabled={busy}
          />

          {msg && <p className="text-sm text-red-600 font-semibold">{msg}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 py-4 text-white font-extrabold text-lg disabled:opacity-50">
            {busy ? "שולח..." : "סיים עבודה"}
          </button>
          <button type="button" onClick={cancelReport} className="w-full rounded-xl border border-border py-3 font-bold">
            ביטול
          </button>
        </form>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell title="סידור העבודה שלי" subtitle="רק העבודות ששויכו אליך">
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-center text-muted py-10">אין עבודות פתוחות כרגע</p>
        ) : (
          tasks.map((t) => (
            <article key={t.id} className="rounded-xl border border-border bg-card p-4 card-shadow space-y-3">
              <div>
                <p className="text-xs text-muted">
                  {formatTaskDate(t.workDate)} · {formatTaskTime(t.workDate)}
                </p>
                <p className="font-extrabold text-xl text-primary-dark">{t.customerName || "לקוח"}</p>
                <p className="text-sm flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {t.settlement || "—"}
                </p>
                <p className="text-sm font-semibold mt-1">{t.workType || t.plotName || "עבודה"}</p>
                {(t.vehiclePlate || t.machineryUnit?.name) && (
                  <p className="text-xs text-muted mt-1">
                    {[t.vehiclePlate && `רכב ${t.vehiclePlate}`, t.machineryUnit?.name].filter(Boolean).join(" · ")}
                  </p>
                )}
                {t.managerNotes && <p className="text-xs text-muted mt-2">{t.managerNotes}</p>}
                <p className="text-xs font-bold text-primary mt-2">{TASK_STATUS_LABELS[t.status] || t.status}</p>
              </div>

              {t.status === "ASSIGNED" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startWork(t)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50"
                >
                  <Play className="h-5 w-5" />
                  התחל עבודה
                </button>
              )}

              {t.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={() => {
                    setActive(t);
                    setNotes("");
                    setMeterReading("");
                    setMedia([]);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-white font-extrabold"
                >
                  <Square className="h-5 w-5" />
                  סיים עבודה
                </button>
              )}
            </article>
          ))
        )}
        {msg && <p className="text-sm text-red-600 font-semibold text-center">{msg}</p>}
      </div>
    </EmployeeShell>
  );
}
