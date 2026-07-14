"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SmallLoader } from "@/components/ui/SmallLoader";
import { FUEL_RECIPIENT_LABELS } from "@/lib/constants";

type Recipient = {
  id: string;
  name: string;
  category: string;
  columnRole: string;
};

type GridData = {
  year: number;
  month: number;
  recipients: Recipient[];
  categories: {
    tanks: Recipient[];
    internal: Recipient[];
    external: Recipient[];
  };
  days: number[];
  matrix: Record<string, Record<string, number>>;
  columnTotals: Record<string, number>;
  rowTotals: Record<string, number>;
  grandTotal: number;
};

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function categoryColor(category: string) {
  switch (category) {
    case "TANK": return "bg-slate-100";
    case "COMPANY_VEHICLE": return "bg-emerald-50";
    case "COMPANY_EMPLOYEE": return "bg-blue-50";
    case "EXTERNAL_CUSTOMER": return "bg-orange-50";
    default: return "bg-white";
  }
}

export function FuelGridClient({ initialYear, initialMonth }: { initialYear?: number; initialMonth?: number }) {
  const now = new Date();
  const [year, setYear] = useState(initialYear || now.getFullYear());
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1);
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`/api/fuel/grid?year=${year}&month=${month}`, { signal: controller.signal });
      if (!res.ok) throw new Error("שגיאת שרת");
      setData(await res.json());
    } catch (e) {
      const msg = e instanceof DOMException && e.name === "AbortError"
        ? "הטעינה ארכה יותר מדי — נסה שוב"
        : "לא ניתן לטעון את טבלת הדלק";
      setError(msg);
      setData(null);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  if (loading || !data) {
    return <SmallLoader label="טוען טבלת דלק..." />;
  }

  const dateKey = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-border hover:bg-background">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h3 className="text-lg font-bold text-primary-dark min-w-[140px] text-center">
            {MONTHS[month - 1]} {year}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-border hover:bg-background">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(FUEL_RECIPIENT_LABELS).map(([k, v]) => (
            <span key={k} className={`px-2 py-1 rounded-full ${categoryColor(k)}`}>{v}</span>
          ))}
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            סה״כ: {data.grandTotal.toLocaleString("he-IL", { maximumFractionDigits: 1 })} ל׳
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-2 text-sm text-danger flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="text-xs font-semibold underline shrink-0">נסה שוב</button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            <tr className="bg-background">
              <th className="sticky right-0 z-20 bg-background border border-border p-2 font-bold min-w-[90px]">
                תאריך
              </th>
              {data.recipients.map((r) => (
                <th
                  key={r.id}
                  className={`border border-border p-1.5 font-semibold min-w-[72px] max-w-[90px] text-center leading-tight ${categoryColor(r.category)}`}
                  title={FUEL_RECIPIENT_LABELS[r.category]}
                >
                  {r.name}
                </th>
              ))}
              <th className="border border-border p-2 font-bold bg-amber-50 min-w-[60px]">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((day) => {
              const key = dateKey(day);
              const rowTotal = data.rowTotals[key] || 0;
              return (
                <tr key={day} className={day === 15 ? "border-t-2 border-t-primary/30" : ""}>
                  <td className="sticky right-0 z-10 bg-card border border-border p-2 font-mono font-medium whitespace-nowrap">
                    {String(day).padStart(2, "0")}/{String(month).padStart(2, "0")}/{year}
                  </td>
                  {data.recipients.map((r) => {
                    const val = data.matrix[key]?.[r.id];
                    return (
                      <td
                        key={r.id}
                        className={`border border-border p-1.5 text-center tabular-nums ${val ? "font-semibold text-primary-dark" : "text-muted/40"} ${categoryColor(r.category)}`}
                      >
                        {val ? val.toLocaleString("he-IL", { maximumFractionDigits: 1 }) : ""}
                      </td>
                    );
                  })}
                  <td className="border border-border p-1.5 text-center font-bold bg-amber-50 tabular-nums">
                    {rowTotal > 0 ? rowTotal.toLocaleString("he-IL", { maximumFractionDigits: 1 }) : ""}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-background font-bold">
              <td className="sticky right-0 z-10 bg-background border border-border p-2">סה״כ חודשי</td>
              {data.recipients.map((r) => (
                <td key={r.id} className={`border border-border p-1.5 text-center tabular-nums ${categoryColor(r.category)}`}>
                  {(data.columnTotals[r.id] || 0) > 0
                    ? data.columnTotals[r.id].toLocaleString("he-IL", { maximumFractionDigits: 1 })
                    : ""}
                </td>
              ))}
              <td className="border border-border p-1.5 text-center bg-amber-100 tabular-nums">
                {data.grandTotal.toLocaleString("he-IL", { maximumFractionDigits: 1 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        הטבלה משחזרת את גיליון הדלק הישן — שורות לפי תאריך, עמודות לפי מיכל / כלי חברה / לקוח חיצוני.
        קו מפריד ב-15 לחודש כמו בגיליון המקורי.
      </p>
    </div>
  );
}
