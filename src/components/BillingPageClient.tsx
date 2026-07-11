"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppNav";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

type Row = {
  key: string;
  settlement: string;
  customerName: string;
  plotName: string;
  totalQuantity: number;
  workDays: number;
};

export function BillingPageClient() {
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(4);
  const [groupBy, setGroupBy] = useState("settlement");
  const [rows, setRows] = useState<Row[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/clients?year=${year}&month=${month}&groupBy=${groupBy}`);
      const data = await res.json();
      setRows(data.rows || []);
      setGrandTotal(data.grandTotal || 0);
    } finally {
      setLoading(false);
    }
  }, [year, month, groupBy]);

  useEffect(() => { load(); }, [load]);

  const prev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const next = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <AppShell title="התחשבנות לקוחות" subtitle="לפי ישובים, חלקות או שם לקוח" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={prev} className="p-2 rounded-lg border border-border bg-card"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="font-bold text-lg min-w-[140px] text-center">{MONTHS[month - 1]} {year}</h2>
          <button onClick={next} className="p-2 rounded-lg border border-border bg-card"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex gap-2 mr-auto">
            {[
              { k: "settlement", l: "לפי ישוב" },
              { k: "plot", l: "לפי חלקה" },
              { k: "customer", l: "לפי לקוח" },
            ].map((f) => (
              <button key={f.k} onClick={() => setGroupBy(f.k)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${groupBy === f.k ? "bg-primary text-white" : "bg-card border border-border"}`}>
                {f.l}
              </button>
            ))}
          </div>
          <p className="text-sm font-bold text-primary">סה״כ: {grandTotal.toLocaleString("he-IL")} דונם/יח׳</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="p-3 text-right font-semibold">ישוב</th>
                  <th className="p-3 text-right font-semibold">לקוח</th>
                  <th className="p-3 text-right font-semibold">חלקה</th>
                  <th className="p-3 text-right font-semibold">ימי עבודה</th>
                  <th className="p-3 text-right font-semibold">סה״כ כמות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-background/50">
                    <td className="p-3 font-medium">{r.settlement}</td>
                    <td className="p-3">{r.customerName}</td>
                    <td className="p-3">{r.plotName}</td>
                    <td className="p-3">{r.workDays}</td>
                    <td className="p-3 font-bold">{r.totalQuantity.toLocaleString("he-IL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-8 text-center text-muted">אין נתונים לחודש זה</p>}
          </div>
        )}

        <p className="text-xs text-muted">
          הנתונים נאספים מיומן העבודה בשטח — ישוב, לקוח וחלקה. לחיבור לחשבונית פלחה יש להגדיר תעריפים במודול CRM (בקרוב).
        </p>
      </div>
    </AppShell>
  );
}
