"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppNav";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

type Movement = {
  id: string;
  date: string;
  entityType: string;
  entityName: string;
  entryType: string;
  category: string;
  amount: number;
  description: string;
};

export function LedgerPageClient() {
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(6);
  const [type, setType] = useState("all");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelPrices, setFuelPrices] = useState<{ id: string; name: string; pricePerLiter: number | null }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, lookupRes] = await Promise.all([
        fetch(`/api/ledger?year=${year}&month=${month}&type=${type}`),
        fetch("/api/lookup"),
      ]);
      const ledger = await ledgerRes.json();
      const lookup = await lookupRes.json();
      setMovements(ledger.movements || []);
      setFuelPrices(
        (lookup.fuelRecipients || [])
          .filter((r: { category: string }) => r.category === "EXTERNAL_CUSTOMER")
          .map((r: { id: string; name: string; pricePerLiter?: number }) => ({
            id: r.id,
            name: r.name,
            pricePerLiter: r.pricePerLiter ? Number(r.pricePerLiter) : null,
          }))
      );
    } finally {
      setLoading(false);
    }
  }, [year, month, type]);

  useEffect(() => { load(); }, [load]);

  const updatePrice = async (id: string, price: number) => {
    await fetch(`/api/fuel-recipients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerLiter: price }),
    });
    load();
  };

  const prev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const next = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <AppShell title="כרטסות ותנועות" subtitle="עובדים, לקוחות חיצוניים ודלק" wide>
      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-card p-4 card-shadow">
          <h3 className="font-bold text-primary-dark mb-3 text-sm">מחיר ליטר — לקוחות חיצוניים</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fuelPrices.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="text-sm flex-1">{f.name}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={f.pricePerLiter ?? 7.2}
                  onBlur={(e) => updatePrice(f.id, Number(e.target.value))}
                  className="field-input w-24 text-center"
                  dir="ltr"
                />
                <span className="text-xs text-muted">₪/ל׳</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={prev} className="p-2 rounded-lg border border-border bg-card"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="font-bold text-lg min-w-[140px] text-center">{MONTHS[month - 1]} {year}</h2>
          <button onClick={next} className="p-2 rounded-lg border border-border bg-card"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex gap-2">
            {[
              { k: "all", l: "הכל" },
              { k: "fuel", l: "דלק חיצוני" },
              { k: "employee", l: "עובדים" },
              { k: "subcontractor", l: "קבלנים" },
            ].map((f) => (
              <button key={f.k} onClick={() => setType(f.k)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${type === f.k ? "bg-primary text-white" : "bg-card border border-border"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="p-3 text-right font-semibold">תאריך</th>
                  <th className="p-3 text-right font-semibold">ישות</th>
                  <th className="p-3 text-right font-semibold">סוג</th>
                  <th className="p-3 text-right font-semibold">חיוב/זיכוי</th>
                  <th className="p-3 text-right font-semibold">סכום</th>
                  <th className="p-3 text-right font-semibold">פירוט</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-background/50">
                    <td className="p-3">{new Date(m.date).toLocaleDateString("he-IL")}</td>
                    <td className="p-3 font-medium">{m.entityName}</td>
                    <td className="p-3 text-xs">{m.entityType}</td>
                    <td className="p-3">{m.entryType === "DEBIT" ? "חיוב" : "זיכוי"}</td>
                    <td className="p-3 font-bold">₪{m.amount.toLocaleString("he-IL")}</td>
                    <td className="p-3 text-muted text-xs">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements.length === 0 && <p className="p-8 text-center text-muted">אין תנועות לחודש זה</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
