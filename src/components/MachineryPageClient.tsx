"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { InlineLoader, SmallLoader } from "@/components/ui/SmallLoader";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { MACHINERY_UNIT_LABELS, MATERIAL_LABELS, QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";

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
  machineryUnitId?: string | null;
  operator: { firstName: string; lastName: string } | null;
  plot: { name: string; nameHe: string | null } | null;
};

type GridData = {
  year: number;
  month: number;
  units: Unit[];
  byUnit: Record<string, WorkLog[]>;
  unitTotals: Record<string, number>;
  grandTotal: number;
};

const TABS = [
  { id: "journal", label: "יומן עבודה" },
  { id: "edit", label: "רישום ועריכה" },
];

export function MachineryPageClient({ embedded }: { embedded?: boolean }) {
  const [tab, setTab] = useState("journal");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 4));
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = dateRangeQuery(range);
      if (unitFilter !== "ALL") params.set("unitType", unitFilter);
      const res = await fetch(`/api/machinery/grid?${params}`);
      if (!res.ok) throw new Error("fail");
      const json = await res.json();
      for (const id of Object.keys(json.byUnit || {})) {
        json.byUnit[id] = json.byUnit[id].map((l: WorkLog & { acresWorked: unknown }) => ({
          ...l,
          acresWorked: Number(l.acresWorked),
          machineryUnitId: id,
        }));
      }
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, unitFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(() => {
    if (!data) return [];
    const rows: (WorkLog & { unitName: string; unitType: string })[] = [];
    for (const unit of data.units) {
      for (const log of data.byUnit[unit.id] || []) {
        rows.push({ ...log, unitName: unit.name, unitType: unit.unitType });
      }
    }
    const term = q.trim();
    return rows
      .filter((r) => {
        if (!term) return true;
        return [r.driverName, r.settlement, r.customerName, r.plotName, r.unitName]
          .filter(Boolean)
          .some((v) => String(v).includes(term));
      })
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  }, [data, q]);

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/machinery/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: fd.get("driverName"),
          settlement: fd.get("settlement"),
          customerName: fd.get("customerName"),
          plotName: fd.get("plotName"),
          acresWorked: Number(fd.get("acresWorked")),
          notes: fd.get("notes"),
        }),
      });
      if (res.ok) {
        setEditing(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const filterBar = (
    <DateRangeFilter
      value={range}
      onChange={setRange}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder="חיפוש נהג / ישוב / לקוח / חלקה"
    >
      <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
        <option value="ALL">כל המכונות</option>
        {Object.entries(MACHINERY_UNIT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <span className="text-xs font-semibold text-primary mr-auto">
        {data ? `${cards.length} כרטסות · סה״כ ${data.grandTotal.toLocaleString("he-IL")}` : ""}
      </span>
    </DateRangeFilter>
  );

  const body = (
    <>
      {loading ? (
        <SmallLoader />
      ) : tab === "edit" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            לחץ על עיפרון בכרטסת לעריכה. דיווחי שטח מתקבלים מממשק העובד.
          </p>
          <div className="work-card-grid">
            {cards.map((log) => (
              <WorkCardDetail
                key={log.id}
                date={new Date(log.workDate).toLocaleDateString("he-IL")}
                title={log.unitName}
                subtitle={MACHINERY_UNIT_LABELS[log.unitType]}
                fields={[
                  {
                    label: "נהג",
                    value:
                      log.driverName ||
                      (log.operator ? `${log.operator.firstName} ${log.operator.lastName}` : "—"),
                  },
                  { label: "לקוח", value: log.customerName || "—" },
                ]}
                qty={`${Number(log.acresWorked).toLocaleString("he-IL")} ${QUANTITY_UNIT_LABELS[log.quantityUnit] || ""}`}
                onEdit={() => setEditing(log)}
              />
            ))}
          </div>
          {cards.length === 0 && (
            <p className="rounded-lg border border-border bg-card p-10 text-center text-muted">
              אין רשומות בטווח שנבחר
            </p>
          )}
        </div>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-10 text-center text-muted">
          אין רשומות בטווח שנבחר — הוסף מרישום שטח
        </p>
      ) : (
        <div className="work-card-grid">
          {cards.map((log) => (
            <WorkCardDetail
              key={log.id}
              date={new Date(log.workDate).toLocaleDateString("he-IL")}
              title={log.unitName}
              subtitle={MACHINERY_UNIT_LABELS[log.unitType]}
              fields={[
                {
                  label: "נהג",
                  value:
                    log.driverName ||
                    (log.operator ? `${log.operator.firstName} ${log.operator.lastName}` : "—"),
                },
                { label: "ישוב", value: log.settlement || "—" },
                { label: "לקוח", value: log.customerName || "—" },
                {
                  label: "חלקה",
                  value: log.plotName || log.plot?.nameHe || log.plot?.name || "—",
                },
                {
                  label: "חומר",
                  value: log.materialType ? MATERIAL_LABELS[log.materialType] : "—",
                },
              ]}
              qty={`${Number(log.acresWorked).toLocaleString("he-IL")} ${QUANTITY_UNIT_LABELS[log.quantityUnit] || ""}`}
              notes={log.notes}
              onEdit={() => {
                setEditing(log);
                setTab("edit");
              }}
            />
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-xl bg-card p-5 card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary-dark">עריכת כרטסת</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input name="driverName" defaultValue={editing.driverName || ""} placeholder="נהג" className="field-input" />
            <input name="settlement" defaultValue={editing.settlement || ""} placeholder="ישוב" className="field-input" />
            <input name="customerName" defaultValue={editing.customerName || ""} placeholder="לקוח" className="field-input" />
            <input name="plotName" defaultValue={editing.plotName || ""} placeholder="חלקה" className="field-input" />
            <input
              name="acresWorked"
              type="number"
              step="0.1"
              defaultValue={editing.acresWorked}
              placeholder="כמות"
              className="field-input"
              required
            />
            <textarea
              name="notes"
              defaultValue={editing.notes || ""}
              placeholder="הערות"
              className="field-input min-h-[70px]"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary py-2.5 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <InlineLoader />
                  שומר...
                </>
              ) : (
                "שמור שינויים"
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                tab === t.id
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {filterBar}
        {body}
      </div>
    );
  }

  return (
    <DepartmentLayout
      title="יומן עבודה"
      subtitle="יומן עבודה · רישום ועריכה לפי מכונה"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      filter={filterBar}
    >
      {body}
    </DepartmentLayout>
  );
}
