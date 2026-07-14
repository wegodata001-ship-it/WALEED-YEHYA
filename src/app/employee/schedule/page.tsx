"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmployeeShell } from "@/components/EmployeeShell";
import { CheckCircle2, Loader2, Play, Square } from "lucide-react";
import {
  formatTaskDate,
  formatTaskTime,
  TASK_STATUS_LABELS,
  resolveMeterKind,
  meterKindLabel,
  EMPLOYEE_ACTIVE_TASK_STATUSES,
  isInTreatmentStatus,
} from "@/lib/field-task-utils";
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
  plannedQuantity?: number;
  reportedQuantity?: number | null;
  remainingQuantity?: number | null;
  quantityUnit?: string;
  quantityUnitLabel?: string;
  machineryUnit: { id?: string; name: string } | null;
  machineryUnitId?: string | null;
  meterKind?: "odometer_km" | "engine_hours" | null;
  status: string;
  startedAt: string | null;
};

function plannedUnitLabel(t: Task) {
  return t.quantityUnitLabel || t.quantityUnit || "";
}

function doneQty(t: Task) {
  return t.reportedQuantity != null && Number.isFinite(t.reportedQuantity) ? Number(t.reportedQuantity) : 0;
}

function remainingQty(t: Task) {
  if (t.remainingQuantity != null && Number.isFinite(t.remainingQuantity)) {
    return Math.max(0, Number(t.remainingQuantity));
  }
  const planned = Number(t.plannedQuantity || 0);
  return Math.max(0, Math.round((planned - doneQty(t)) * 1000) / 1000);
}

function TaskSummaryFields({ t }: { t: Task }) {
  const material = t.material || t.workType || (!t.plot ? t.plotName : null) || "—";
  const plot = t.plot || (t.material ? t.plotName : null) || "—";
  return (
    <dl className="space-y-1 text-sm mt-2">
      <div className="flex justify-between gap-2">
        <dt className="text-muted">לקוח</dt>
        <dd className="font-bold text-primary-dark">{t.customerName || "—"}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted">ישוב</dt>
        <dd>{t.settlement || "—"}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted">חלקה</dt>
        <dd>{plot}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted">חומר</dt>
        <dd>{material}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted">{t.quantityUnit === "HOUR" ? "שעות מתוכננות" : "כמות מתוכננת"}</dt>
        <dd className="font-bold">
          {t.plannedQuantity != null
            ? `${t.plannedQuantity} ${plannedUnitLabel(t)}`.trim()
            : "—"}
        </dd>
      </div>
      {doneQty(t) > 0 && (
        <div className="flex justify-between gap-2">
          <dt className="text-muted">בוצע עד כה</dt>
          <dd className="font-bold text-emerald-700">
            {doneQty(t)} {plannedUnitLabel(t)}
          </dd>
        </div>
      )}
      {remainingQty(t) > 0 && (isInTreatmentStatus(t.status) || doneQty(t) > 0) && (
        <div className="flex justify-between gap-2">
          <dt className="text-muted font-bold text-amber-800">נותר להשלים</dt>
          <dd className="font-extrabold text-amber-800">
            {remainingQty(t)} {plannedUnitLabel(t)}
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <dt className="text-muted">כלי רכב</dt>
        <dd>{t.vehiclePlate || "—"}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted">מכונה</dt>
        <dd>{t.machineryUnit?.name || "—"}</dd>
      </div>
      {t.managerNotes ? (
        <div className="pt-1">
          <dt className="text-muted text-xs">הערות</dt>
          <dd className="text-xs mt-0.5">{t.managerNotes}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function taskMeterKind(t: Task) {
  return t.meterKind ?? resolveMeterKind({ machineryUnitId: t.machineryUnitId, vehiclePlate: t.vehiclePlate });
}

export default function EmployeeSchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [onShift, setOnShift] = useState(false);
  const [needsAttendance, setNeedsAttendance] = useState(false);
  const [active, setActive] = useState<Task | null>(null);
  const [notes, setNotes] = useState("");
  const [reportedQuantity, setReportedQuantity] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [media, setMedia] = useState<StoredMediaRef[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lastReportPartial, setLastReportPartial] = useState<{ remaining: number; unit: string } | null>(
    null
  );
  const [msg, setMsg] = useState("");

  const now = new Date();

  const load = async () => {
    setLoading(true);
    try {
      const statuses = EMPLOYEE_ACTIVE_TASK_STATUSES.join(",");
      const [tasksRes, attRes] = await Promise.all([
        fetch(`/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&statuses=${statuses}`),
        fetch(`/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
      ]);
      const [tasksData, attData] = await Promise.all([tasksRes.json(), attRes.json()]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setOnShift(Boolean(attData.openToday?.checkIn && !attData.openToday?.checkOut));
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
    setNeedsAttendance(false);
    if (!onShift) {
      setNeedsAttendance(true);
      setMsg(
        'לא ניתן להתחיל משימה לפני שביצעת כניסה למשמרת. יש לבצע תחילה "התחל יום עבודה" במסך הנוכחות.'
      );
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NO_OPEN_SHIFT" || res.status === 409) {
          setOnShift(false);
          setNeedsAttendance(true);
          setMsg(
            'לא ניתן להתחיל משימה לפני שביצעת כניסה למשמרת. יש לבצע תחילה "התחל יום עבודה" במסך הנוכחות.'
          );
        } else {
          setMsg(data.error || "שגיאה");
        }
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
    setReportedQuantity("");
    setMeterReading("");
    setMedia([]);
    setMsg("");
  };

  const finishWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (reportedQuantity.trim() === "" || !Number.isFinite(Number(reportedQuantity)) || Number(reportedQuantity) <= 0) {
      setMsg("יש למלא כמות שבוצעה במקטע הנוכחי (גדולה מאפס)");
      return;
    }
    if (mediaBusy) {
      setMsg("נא להמתין לסיום העלאת התמונות/סרטון לפני שליחת הדיווח");
      return;
    }
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
          action: "progress",
          reportedQuantity: Number(reportedQuantity),
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
      if (data.status === "COMPLETED") {
        setLastReportPartial(null);
      } else {
        setLastReportPartial({
          remaining: Math.max(0, Number(data.remainingQuantity ?? remainingQty(data))),
          unit: data.quantityUnitLabel || plannedUnitLabel(active),
        });
      }
      setDone(true);
      setActive(null);
      setNotes("");
      setReportedQuantity("");
      setMeterReading("");
      setMedia([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const openProgressForm = (t: Task) => {
    setActive(t);
    setNotes("");
    setReportedQuantity("");
    setMeterReading("");
    setMedia([]);
    setMsg("");
  };

  if (loading) {
    return (
      <EmployeeShell title="סידור העבודה שלי" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  if (done) {
    const isPartial = Boolean(lastReportPartial && lastReportPartial.remaining > 0);
    return (
      <EmployeeShell
        title={isPartial ? "דיווח נשמר" : "העבודה הושלמה"}
        subtitle={isPartial ? "המשימה עדיין בטיפול" : "המנהל קיבל עדכון"}
      >
        <div className="text-center py-8 space-y-3">
          <CheckCircle2
            className={`h-16 w-16 mx-auto mb-2 ${isPartial ? "text-orange-500" : "text-emerald-500"}`}
          />
          {isPartial ? (
            <>
              <p className="text-muted">הדיווח נשמר. סטטוס: 🟠 בטיפול</p>
              <p className="text-lg font-extrabold text-orange-800">
                נותר להשלים: {lastReportPartial!.remaining} {lastReportPartial!.unit}
              </p>
            </>
          ) : (
            <p className="text-muted mb-4">🟢 המשימה הושלמה במלואה ונשלחה למנהל</p>
          )}
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setLastReportPartial(null);
            }}
            className="w-full rounded-xl bg-primary py-3 text-white font-bold"
          >
            חזרה לסידור
          </button>
        </div>
      </EmployeeShell>
    );
  }

  if (active) {
    const already = doneQty(active);
    const remaining = remainingQty(active);
    return (
      <EmployeeShell title="דיווח ביצוע" subtitle={active.customerName || "לקוח"}>
        <form onSubmit={finishWork} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <TaskSummaryFields t={active} />
          </div>

          {already > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm space-y-1">
              <p>
                בוצע עד כה: <strong>{already}</strong> {plannedUnitLabel(active)}
              </p>
              <p className="font-extrabold text-amber-900">
                נותר להשלים: {remaining} {plannedUnitLabel(active)}
              </p>
              <p className="text-xs text-amber-800">דווח רק את הכמות שביצעת עכשיו — היא תתווסף לסכום הקיים.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">
              {already > 0
                ? active.quantityUnit === "HOUR"
                  ? "שעות שנוספו עכשיו"
                  : "כמות שנוספה עכשיו"
                : active.quantityUnit === "HOUR"
                  ? "שעות שבוצעו"
                  : "כמות שבוצעה"}{" "}
              <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2 items-stretch">
              <input
                type="number"
                required
                min={0.1}
                step="0.1"
                value={reportedQuantity}
                onChange={(e) => setReportedQuantity(e.target.value)}
                className="field-input text-lg font-bold flex-1"
                placeholder={remaining > 0 ? String(remaining) : "לדוגמה: 10"}
              />
              <div className="flex items-center rounded-lg border border-border bg-muted/10 px-3 text-sm font-bold text-primary-dark whitespace-nowrap">
                {plannedUnitLabel(active) || "יחידה"}
              </div>
            </div>
            <p className="text-xs text-muted mt-1">
              מתוכנן: {active.plannedQuantity ?? "—"} {plannedUnitLabel(active)} · היחידה מהסידור
            </p>
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
            onBusyChange={setMediaBusy}
            disabled={busy}
          />

          {mediaBusy && (
            <p className="text-sm text-amber-800 font-semibold text-center">
              מעלה מדיה ל-Storage — לא ניתן לסיים לפני שההעלאה מסתיימת
            </p>
          )}
          {media.length > 0 && (
            <p className="text-xs text-muted text-center">
              📷 {media.filter((m) => m.kind === "image").length} תמונות
              {media.some((m) => m.kind === "video") ? " · 🎥 סרטון" : ""} מוכנות לשליחה
            </p>
          )}

          {msg && <p className="text-sm text-red-600 font-semibold">{msg}</p>}

          <button
            type="submit"
            disabled={busy || mediaBusy}
            className="w-full rounded-xl bg-emerald-600 py-4 text-white font-extrabold text-lg disabled:opacity-50"
          >
            {busy ? "שולח..." : mediaBusy ? "מעלה מדיה..." : "שלח דיווח ביצוע"}
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
        {!onShift && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-bold text-amber-900">
              לא ניתן להתחיל משימה לפני שביצעת כניסה למשמרת.
            </p>
            <p className="text-xs text-amber-800">
              יש לבצע תחילה &quot;התחל יום עבודה&quot; במסך הנוכחות.
            </p>
            <Link
              href="/employee/attendance"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-extrabold text-white"
            >
              מעבר לנוכחות
            </Link>
          </div>
        )}

        {tasks.length === 0 ? (
          <p className="text-center text-muted py-10">אין עבודות פתוחות כרגע</p>
        ) : (
          tasks.map((t) => (
            <article key={t.id} className="rounded-xl border border-border bg-card p-4 card-shadow space-y-3">
              <div>
                <p className="text-xs text-muted">
                  {formatTaskDate(t.workDate)} · {formatTaskTime(t.workDate)}
                </p>
                <TaskSummaryFields t={t} />
                <p className="text-xs font-bold text-primary mt-2">
                  {TASK_STATUS_LABELS[t.status] || t.status}
                </p>
                {isInTreatmentStatus(t.status) && remainingQty(t) > 0 && (
                  <p className="text-sm font-extrabold text-orange-800 mt-1">
                    נותר: {remainingQty(t)} {plannedUnitLabel(t)}
                  </p>
                )}
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

              {isInTreatmentStatus(t.status) && (
                <button
                  type="button"
                  onClick={() => openProgressForm(t)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-white font-extrabold"
                >
                  <Square className="h-5 w-5" />
                  דווח ביצוע
                </button>
              )}
            </article>
          ))
        )}

        {msg && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-semibold text-center">{msg}</p>
            {needsAttendance && (
              <Link
                href="/employee/attendance"
                className="inline-flex w-full items-center justify-center rounded-xl border border-primary text-primary py-2.5 text-sm font-extrabold"
              >
                מעבר לנוכחות
              </Link>
            )}
          </div>
        )}
      </div>
    </EmployeeShell>
  );
}
