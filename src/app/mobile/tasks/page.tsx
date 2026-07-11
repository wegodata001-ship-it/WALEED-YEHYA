"use client";

import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { CheckCircle2, Loader2, ClipboardCheck } from "lucide-react";
import { QUANTITY_UNIT_LABELS } from "@/lib/constants";

type Task = {
  id: string;
  workDate: string;
  settlement: string | null;
  customerName: string | null;
  plotName: string | null;
  plannedQuantity: number;
  reportedQuantity: number | null;
  quantityUnit: string;
  taskDescription: string | null;
  status: string;
  approvalStatus: string;
  machineryUnit: { name: string } | null;
};

export default function MobileTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Task | null>(null);
  const [reported, setReported] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const now = new Date();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?mine=1&year=${now.getFullYear()}&month=${now.getMonth() + 1}&status=ASSIGNED`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const complete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          action: "complete",
          reportedQuantity: Number(reported),
          actualNotes: notes,
        }),
      });
      if (res.ok) {
        setDone(true);
        setActive(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <MobileShell title="המשימות שלי" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </MobileShell>
    );
  }

  if (done) {
    return (
      <MobileShell title="המשימה הושלמה" subtitle="נשלח למנהל">
        <div className="text-center py-8">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <p className="text-muted mb-4">אם הכמות שונה מהתכנון — המנהל יאשר או יעדכן</p>
          <button type="button" onClick={() => setDone(false)} className="w-full rounded-xl bg-primary py-3 text-white font-bold">
            חזרה למשימות
          </button>
        </div>
      </MobileShell>
    );
  }

  if (active) {
    return (
      <MobileShell title="סימון השלמה" subtitle="מה בוצע בפועל">
        <form onSubmit={complete} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">{new Date(active.workDate).toLocaleDateString("he-IL")}</p>
            <p className="font-bold text-lg text-primary-dark">{active.customerName || "לקוח"}</p>
            <p className="text-sm">{active.settlement} · {active.plotName || "—"}</p>
            <p className="text-sm mt-2">
              תוכנן: <strong>{active.plannedQuantity}</strong> {QUANTITY_UNIT_LABELS[active.quantityUnit]}
            </p>
            {active.taskDescription && <p className="text-xs text-muted mt-1">{active.taskDescription}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">מה בוצע בפועל (כמות) *</label>
            <input
              type="number"
              step="0.1"
              required
              value={reported}
              onChange={(e) => setReported(e.target.value)}
              className="field-input text-xl font-extrabold"
              placeholder={String(active.plannedQuantity)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">הערה / מה בוצע</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input min-h-[90px]"
              placeholder="למשל: הושלם חלקית בגלל גשם"
            />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 py-4 text-white font-extrabold text-lg disabled:opacity-50">
            {busy ? "שומר..." : "סמן משימה כהושלמה"}
          </button>
          <button type="button" onClick={() => setActive(null)} className="w-full rounded-xl border border-border py-3 font-bold">
            ביטול
          </button>
        </form>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="המשימות שלי" subtitle="סמן השלמה — בלי למלא טופס מלא">
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-center text-muted py-10">אין משימות פתוחות מהמנהל</p>
        ) : (
          tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActive(t);
                setReported(String(t.plannedQuantity));
                setNotes("");
              }}
              className="w-full text-right rounded-xl border border-border bg-card p-4 card-shadow"
            >
              <div className="flex items-start gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">{new Date(t.workDate).toLocaleDateString("he-IL")}</p>
                  <p className="font-extrabold text-primary-dark">{t.customerName || "לקוח שדה"}</p>
                  <p className="text-sm">{t.settlement} · {t.plotName || "—"}</p>
                  <p className="text-sm mt-1">
                    {t.machineryUnit?.name || "מכונה"} · תוכנן {t.plannedQuantity}{" "}
                    {QUANTITY_UNIT_LABELS[t.quantityUnit]}
                  </p>
                  <p className="text-xs text-primary font-bold mt-2">לחץ לסימון השלמה ←</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </MobileShell>
  );
}
