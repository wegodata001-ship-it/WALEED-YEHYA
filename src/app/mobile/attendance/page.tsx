"use client";

import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { CheckCircle2, Loader2, LogIn, LogOut, Clock, MessageSquarePlus } from "lucide-react";

type RecordRow = {
  id: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  approvalStatus: string;
  correctionNote: string | null;
  notes: string | null;
  timeEntries: { hours: number; entryType: string }[];
};

export default function MobileAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [openToday, setOpenToday] = useState<RecordRow | null>(null);
  const [summary, setSummary] = useState({ days: 0, totalHours: 0, pendingApprovals: 0 });
  const [msg, setMsg] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState({ hours: "8", note: "", workDate: "" });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
      const data = await res.json();
      setRecords(data.records || []);
      setOpenToday(data.openToday || null);
      setSummary(data.summary || { days: 0, totalHours: 0, pendingApprovals: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const punch = async (action: "check_in" | "check_out") => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setMsg(action === "check_in" ? "כניסה נרשמה" : "יציאה נרשמה");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const submitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "correction",
          hours: Number(correction.hours),
          correctionNote: correction.note,
          workDate: correction.workDate || new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setShowCorrection(false);
      setMsg("בקשת תיקון נשלחה לאישור מנהל");
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <MobileShell title="נוכחות ושעות" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </MobileShell>
    );
  }

  return (
    <MobileShell title="נוכחות ושעות" subtitle="כניסה · יציאה · כרטסת חודשית">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="font-bold text-primary-dark">כרטסת החודש</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-extrabold text-primary">{summary.totalHours}</p>
              <p className="text-xs text-muted">שעות</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-primary">{summary.days}</p>
              <p className="text-xs text-muted">ימים</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-warning">{summary.pendingApprovals}</p>
              <p className="text-xs text-muted">ממתין</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy || !!openToday}
            onClick={() => punch("check_in")}
            className="rounded-xl bg-emerald-600 text-white py-5 font-extrabold text-lg disabled:opacity-40 flex flex-col items-center gap-1"
          >
            <LogIn className="h-6 w-6" />
            דיווח כניסה
          </button>
          <button
            type="button"
            disabled={busy || !openToday}
            onClick={() => punch("check_out")}
            className="rounded-xl bg-primary-dark text-white py-5 font-extrabold text-lg disabled:opacity-40 flex flex-col items-center gap-1"
          >
            <LogOut className="h-6 w-6" />
            דיווח יציאה
          </button>
        </div>

        {openToday?.checkIn && (
          <p className="text-sm text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2">
            כניסה פעילה מ־{new Date(openToday.checkIn).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {msg && (
          <p className="text-sm text-center rounded-lg border border-border bg-card py-2 font-semibold text-primary-dark flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {msg}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowCorrection(!showCorrection)}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          שכחתי לדווח — בקשת תיקון למנהל
        </button>

        {showCorrection && (
          <form onSubmit={submitCorrection} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <input
              type="date"
              value={correction.workDate}
              onChange={(e) => setCorrection({ ...correction, workDate: e.target.value })}
              className="field-input"
              required
            />
            <input
              type="number"
              step="0.5"
              value={correction.hours}
              onChange={(e) => setCorrection({ ...correction, hours: e.target.value })}
              className="field-input"
              placeholder="שעות"
              required
            />
            <textarea
              required
              value={correction.note}
              onChange={(e) => setCorrection({ ...correction, note: e.target.value })}
              className="field-input min-h-[80px]"
              placeholder="הסבר למנהל — למה לא דווח בזמן"
            />
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary py-3 text-white font-bold">
              שלח לאישור מנהל
            </button>
          </form>
        )}

        <div className="space-y-2">
          <p className="text-sm font-bold text-primary-dark">פירוט ימים</p>
          {records.map((r) => {
            const hours =
              r.timeEntries?.reduce((s, t) => s + Number(t.hours), 0) ||
              (r.checkIn && r.checkOut
                ? (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000
                : 0);
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">{new Date(r.workDate).toLocaleDateString("he-IL")}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.approvalStatus === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {r.approvalStatus === "PENDING" ? "ממתין לאישור" : "מאושר"}
                  </span>
                </div>
                <p className="text-muted mt-1">
                  {r.checkIn ? new Date(r.checkIn).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  {" → "}
                  {r.checkOut ? new Date(r.checkOut).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "פתוח"}
                  {" · "}
                  <strong>{Math.round(hours * 10) / 10} ש׳</strong>
                </p>
                {r.correctionNote && <p className="text-xs text-muted mt-1">{r.correctionNote}</p>}
              </div>
            );
          })}
          {records.length === 0 && <p className="text-center text-muted py-6">אין דיווחים החודש</p>}
        </div>
      </div>
    </MobileShell>
  );
}
