"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppNav";
import { Loader2, ChevronRight, ChevronLeft, Plus, UserPlus } from "lucide-react";
import { QUANTITY_UNIT_LABELS } from "@/lib/constants";

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

type DayRow = {
  date: string;
  employeeName: string;
  settlement: string;
  plotName: string;
  customerName: string;
  quantity: number;
  quantityUnit: string;
  machinery: string;
  status: string;
};

type Employee = { id: string; firstName: string; lastName: string; position: string | null };

export function HrPageClient() {
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(4);
  const [employeeId, setEmployeeId] = useState("");
  const [days, setDays] = useState<DayRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", position: "", role: "FIELD_OPERATOR", password: "1234" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (employeeId) params.set("employeeId", employeeId);
      const res = await fetch(`/api/reports/employees?${params}`);
      const data = await res.json();
      setDays(data.days || []);
      setEmployees(data.employees || []);
    } finally {
      setLoading(false);
    }
  }, [year, month, employeeId]);

  useEffect(() => { load(); }, [load]);

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", phone: "", position: "", role: "FIELD_OPERATOR", password: "1234" });
      load();
    }
  };

  const prev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const next = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <AppShell title="עובדים וימי עבודה" subtitle="פירוט לפי חלקות, ישובים ומכונות" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={prev} className="p-2 rounded-lg border border-border bg-card"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="font-bold text-base min-w-[140px] text-center">{MONTHS[month - 1]} {year}</h2>
          <button onClick={next} className="p-2 rounded-lg border border-border bg-card"><ChevronLeft className="h-4 w-4" /></button>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm bg-card">
            <option value="">כל העובדים</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </select>
          <button onClick={() => setShowAdd(!showAdd)} className="mr-auto flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-white">
            <UserPlus className="h-4 w-4" /> הוסף עובד + משתמש
          </button>
        </div>

        {showAdd && (
          <form onSubmit={addEmployee} className="rounded-xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-2 card-shadow">
            <input required placeholder="שם פרטי" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="field-input" />
            <input required placeholder="שם משפחה" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="field-input" />
            <input required placeholder="טלפון (050...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field-input" dir="ltr" />
            <input placeholder="תפקיד" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="field-input" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="field-input">
              <option value="FIELD_OPERATOR">מפעיל שטח</option>
              <option value="WAREHOUSE_MANAGER">מחסנאי דלק</option>
              <option value="OFFICE_MANAGER">משרד</option>
            </select>
            <input placeholder="סיסמה" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input" />
            <button type="submit" className="sm:col-span-2 rounded-xl bg-primary py-2 text-white font-semibold flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> שמור עובד
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="p-3 text-right font-semibold">תאריך</th>
                  <th className="p-3 text-right font-semibold">עובד</th>
                  <th className="p-3 text-right font-semibold">ישוב</th>
                  <th className="p-3 text-right font-semibold">חלקה</th>
                  <th className="p-3 text-right font-semibold">לקוח</th>
                  <th className="p-3 text-right font-semibold">מכונה/סוג</th>
                  <th className="p-3 text-right font-semibold">כמות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {days.map((d, i) => (
                  <tr key={`${d.date}-${i}`} className="hover:bg-background/50">
                    <td className="p-3 whitespace-nowrap">{new Date(d.date).toLocaleDateString("he-IL")}</td>
                    <td className="p-3 font-medium">{d.employeeName}</td>
                    <td className="p-3">{d.settlement}</td>
                    <td className="p-3">{d.plotName}</td>
                    <td className="p-3">{d.customerName}</td>
                    <td className="p-3">{d.machinery}</td>
                    <td className="p-3 font-bold">{d.quantity} {QUANTITY_UNIT_LABELS[d.quantityUnit] || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {days.length === 0 && <p className="p-8 text-center text-muted">אין רשומות לחודש זה</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
