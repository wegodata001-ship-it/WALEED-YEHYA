"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SmallLoader } from "@/components/ui/SmallLoader";
import { MACHINERY_UNIT_LABELS, MATERIAL_LABELS, QUANTITY_UNIT_LABELS } from "@/lib/constants";

type Unit = {
  id: string;
  name: string;
  unitNumber: string | null;
  unitType: string;
  headerColor: string | null;
};

type WorkLog = {
  id: string;
  workDate: string;
  driverName: string | null;
  settlement: string | null;
  customerName: string | null;
  plotName: string | null;
  materialType: string | null;
  quantityUnit: string;
  acresWorked: number;
  notes: string | null;
  operator: { firstName: string; lastName: string } | null;
  plot: { name: string; nameHe: string | null } | null;
};

type GridData = {
  year: number;
  month: number;
  units: Unit[];
  grouped: Record<string, Unit[]>;
  byUnit: Record<string, WorkLog[]>;
  unitTotals: Record<string, number>;
  grandTotal: number;
};

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const HEADER_COLORS: Record<string, string> = {
  "#dc2626": "bg-red-100 border-red-300",
  "#16a34a": "bg-green-100 border-green-300",
  "#84cc16": "bg-lime-100 border-lime-300",
  "#eab308": "bg-yellow-100 border-yellow-300",
  "#92400e": "bg-amber-100 border-amber-400",
  "#1d4ed8": "bg-blue-100 border-blue-300",
  "#7c3aed": "bg-violet-100 border-violet-300",
};

function headerClass(color: string | null) {
  return color ? HEADER_COLORS[color] || "bg-emerald-50 border-emerald-200" : "bg-emerald-50 border-emerald-200";
}

function UnitTable({ unit, logs, total }: { unit: Unit; logs: WorkLog[]; total: number }) {
  const driver = (log: WorkLog) =>
    log.driverName || (log.operator ? `${log.operator.firstName} ${log.operator.lastName}` : "—");

  return (
    <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden min-w-[720px] flex-shrink-0">
      <div className={`px-4 py-3 border-b flex items-center justify-between ${headerClass(unit.headerColor)}`}>
        <div>
          <h4 className="font-bold text-primary-dark">{unit.name}</h4>
          <p className="text-xs text-muted">{MACHINERY_UNIT_LABELS[unit.unitType]}</p>
        </div>
        <div className="text-left">
          {unit.unitNumber && unit.unitNumber !== "0" && (
            <p className="text-xs text-muted">מס׳ {unit.unitNumber}</p>
          )}
          <p className="text-lg font-bold text-primary-dark">
            סה״כ: {total.toLocaleString("he-IL", { maximumFractionDigits: 1 })}
          </p>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-background">
          <tr>
            <th className="p-2 border border-border font-semibold">תאריך</th>
            <th className="p-2 border border-border font-semibold">נהג</th>
            <th className="p-2 border border-border font-semibold">ישוב</th>
            <th className="p-2 border border-border font-semibold">לקוח</th>
            <th className="p-2 border border-border font-semibold">חלקה</th>
            <th className="p-2 border border-border font-semibold">חומר</th>
            <th className="p-2 border border-border font-semibold">כמות</th>
            <th className="p-2 border border-border font-semibold">הערות</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-4 text-center text-muted">אין רשומות בחודש זה</td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="hover:bg-background/50">
                <td className="p-2 border border-border whitespace-nowrap font-mono">
                  {new Date(log.workDate).toLocaleDateString("he-IL")}
                </td>
                <td className="p-2 border border-border">{driver(log)}</td>
                <td className="p-2 border border-border">{log.settlement || "—"}</td>
                <td className="p-2 border border-border">{log.customerName || "—"}</td>
                <td className="p-2 border border-border">{log.plotName || log.plot?.nameHe || log.plot?.name || "—"}</td>
                <td className="p-2 border border-border">
                  {log.materialType ? MATERIAL_LABELS[log.materialType] : "—"}
                </td>
                <td className="p-2 border border-border font-bold tabular-nums">
                  {Number(log.acresWorked).toLocaleString("he-IL")}
                  <span className="text-muted font-normal mr-1">
                    {QUANTITY_UNIT_LABELS[log.quantityUnit] || ""}
                  </span>
                </td>
                <td className="p-2 border border-border text-muted max-w-[120px] truncate">{log.notes || ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MachineryLogGridClient({ initialYear, initialMonth }: { initialYear?: number; initialMonth?: number }) {
  const now = new Date();
  const [year, setYear] = useState(initialYear || now.getFullYear());
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1);
  const [filter, setFilter] = useState<string>("ALL");
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (filter !== "ALL") params.set("unitType", filter);
      const res = await fetch(`/api/machinery/grid?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("שגיאת שרת");
      const json = await res.json();
      for (const id of Object.keys(json.byUnit || {})) {
        json.byUnit[id] = json.byUnit[id].map((l: WorkLog & { acresWorked: unknown }) => ({
          ...l,
          acresWorked: Number(l.acresWorked),
          workDate: l.workDate,
        }));
      }
      setData(json);
    } catch (e) {
      const msg = e instanceof DOMException && e.name === "AbortError"
        ? "הטעינה ארכה יותר מדי — נסה שוב"
        : "לא ניתן לטעון את יומן העבודה";
      setError(msg);
      setData({ year, month, units: [], grouped: {}, byUnit: {}, unitTotals: {}, grandTotal: 0 });
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [year, month, filter]);

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
    return <SmallLoader label="טוען יומן עבודה..." />;
  }

  const filters = [
    { key: "ALL", label: "הכל" },
    { key: "HARVESTER", label: MACHINERY_UNIT_LABELS.HARVESTER },
    { key: "BALER", label: MACHINERY_UNIT_LABELS.BALER },
    { key: "RAKE", label: MACHINERY_UNIT_LABELS.RAKE },
    { key: "COMBINE", label: MACHINERY_UNIT_LABELS.COMBINE },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <p className="text-sm font-semibold text-primary">
          סה״כ חודשי: {data.grandTotal.toLocaleString("he-IL", { maximumFractionDigits: 1 })}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-2 text-sm text-danger flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="text-xs font-semibold underline shrink-0">נסה שוב</button>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary text-white" : "bg-background border border-border hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {data.units.map((unit) => (
          <UnitTable
            key={unit.id}
            unit={unit}
            logs={data.byUnit[unit.id] || []}
            total={data.unitTotals[unit.id] || 0}
          />
        ))}
      </div>

      <p className="text-xs text-muted">
        מבנה כמו הגיליון הישן — עמודה לכל מכונה: תאריך, נהג, ישוב, לקוח, חלקה, חומר, כמות, הערות.
        תומך במקצרות, מכבשים, מגובים וקומביין.
      </p>
    </div>
  );
}
