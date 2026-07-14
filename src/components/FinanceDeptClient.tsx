"use client";

import { LoadingArea } from "@/components/ui/SmallLoader";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { AccountsSection } from "@/components/dept/AccountsSection";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { DayRow, Movement } from "@/components/dept/types";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";
import { LEDGER_CATEGORY_LABELS } from "@/lib/constants";

const TABS = [
  { id: "cards", label: "כרטסות" },
  { id: "movements", label: "תנועות" },
  { id: "entry", label: "תשלום / תקבול" },
];

type EmpOpt = { id: string; firstName: string; lastName: string };
type FarmerOpt = { id: string; firstName: string; lastName: string };

export function FinanceDeptClient() {
  const [tab, setTab] = useState("cards");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 6));
  const [q, setQ] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [employees, setEmployees] = useState<EmpOpt[]>([]);
  const [farmers, setFarmers] = useState<FarmerOpt[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    targetType: "employee",
    employeeId: "",
    farmerId: "",
    customerName: "",
    entryType: "DEBIT",
    category: "ADVANCE",
    amount: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const [ledgerRes, empRes, empListRes, farmersRes] = await Promise.all([
        fetch(`/api/ledger?${dq}&type=all`),
        fetch(`/api/reports/employees?${dq}`),
        fetch("/api/employees"),
        fetch("/api/farmers"),
      ]);
      const [ledger, empReport, empList, farmersData] = await Promise.all([
        ledgerRes.json(),
        empRes.json(),
        empListRes.json(),
        farmersRes.json(),
      ]);
      setMovements(ledger.movements || []);
      setDays(empReport.days || []);
      setEmployees(Array.isArray(empList) ? empList : empReport.employees || []);
      setFarmers(Array.isArray(farmersData) ? farmersData : farmersData.farmers || []);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const accountEntities = useMemo(() => {
    const map = new Map<string, { name: string; type: string; total: number; count: number }>();
    for (const m of movements) {
      const cur = map.get(m.entityName) || { name: m.entityName, type: m.entityType, total: 0, count: 0 };
      cur.total += m.entryType === "DEBIT" ? m.amount : -m.amount;
      cur.count += 1;
      map.set(m.entityName, cur);
    }
    for (const d of days) {
      if (!d.customerName || d.customerName === "—") continue;
      if (!map.has(d.customerName)) {
        map.set(d.customerName, { name: d.customerName, type: "customer", total: 0, count: 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [movements, days]);

  const filteredMovements = useMemo(() => {
    const term = q.trim();
    let list = movements;
    if (selectedEntity) list = list.filter((m) => m.entityName === selectedEntity.name);
    if (entityFilter) {
      list = list.filter((m) => m.entityName.includes(entityFilter) || m.entityType === entityFilter);
    }
    if (term) list = list.filter((m) => m.entityName.includes(term) || m.description.includes(term));
    return list;
  }, [movements, q, entityFilter, selectedEntity]);

  const filteredEntities = accountEntities.filter((e) => {
    if (!entityFilter) return true;
    if (entityFilter === "customer") return e.type === "customer" || e.type === "fuel";
    return e.type === entityFilter || e.name.includes(entityFilter);
  });

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: form.targetType,
          employeeId: form.employeeId || undefined,
          farmerId: form.farmerId || undefined,
          customerName: form.customerName || undefined,
          entryType: form.entryType,
          category: form.category,
          amount: Number(form.amount),
          description: form.description,
          entryDate: form.entryDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה");
        return;
      }
      setMsg("התנועה נשמרה");
      setForm((f) => ({ ...f, amount: "", description: "" }));
      await load();
      setTab("movements");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DepartmentLayout
      title="כספים"
      subtitle="כרטסות · תנועות · תשלום / תקבול / מפרעה"
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id);
        if (id === "movements") setSelectedEntity(null);
      }}
      filter={
        tab !== "entry" ? (
          <DateRangeFilter
            value={range}
            onChange={setRange}
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="חיפוש שם / תיאור"
          >
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">הכל</option>
              <option value="employee">עובדים</option>
              <option value="fuel">דלק חיצוני</option>
              <option value="subcontractor">קבלנים</option>
              <option value="customer">לקוחות</option>
            </select>
          </DateRangeFilter>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingArea label="טוען..." minHeightClass="min-h-[160px]" />
      ) : tab === "entry" ? (
        <form onSubmit={submitEntry} className="work-card p-4 max-w-xl space-y-3">
          <h3 className="font-bold text-primary-dark">רישום תשלום / תקבול</h3>
          <p className="text-xs text-muted">
            מפרעה לעובד = חיוב (DEBIT). תקבול מלקוח = זיכוי (CREDIT). תשלום ללקוח/ספק = חיוב.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={form.targetType}
              onChange={(e) => setForm({ ...form, targetType: e.target.value })}
              className="field-input"
            >
              <option value="employee">כרטסת עובד</option>
              <option value="customer">כרטסת לקוח</option>
            </select>
            <select
              value={form.entryType}
              onChange={(e) => setForm({ ...form, entryType: e.target.value })}
              className="field-input"
            >
              <option value="DEBIT">תשלום / מפרעה (חיוב)</option>
              <option value="CREDIT">תקבול (זיכוי)</option>
            </select>
          </div>

          {form.targetType === "employee" ? (
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="field-input"
            >
              <option value="">בחר עובד</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={form.farmerId}
                onChange={(e) => {
                  const f = farmers.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    farmerId: e.target.value,
                    customerName: f ? `${f.firstName} ${f.lastName}` : form.customerName,
                  });
                }}
                className="field-input"
              >
                <option value="">לקוח רשום (אופציונלי)</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>
              <input
                required={!form.farmerId}
                placeholder="שם לקוח"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="field-input"
              />
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="field-input"
            >
              {Object.entries(LEDGER_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              className="field-input"
            />
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="סכום ₪"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="field-input"
            />
            <input
              placeholder="תיאור (למשל: מפרעה לחודש)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="field-input"
            />
          </div>

          {msg && <p className="text-sm font-semibold text-primary">{msg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-2.5 text-white font-bold disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור תנועה"}
          </button>
        </form>
      ) : tab === "cards" ? (
        <AccountsSection
          entities={filteredEntities.filter((e) => !q.trim() || e.name.includes(q))}
          movements={filteredMovements}
          selected={selectedEntity}
          onSelect={setSelectedEntity}
          onClear={() => {
            setSelectedEntity(null);
            setQ("");
          }}
          workDays={days.filter(
            (d) => !selectedEntity || d.customerName === selectedEntity.name || d.employeeName === selectedEntity.name
          )}
        />
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTab("entry")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> הוסף תשלום / תקבול
          </button>
          <div className="work-card-grid">
            {filteredMovements.map((m) => (
              <WorkCardDetail
                key={m.id}
                date={new Date(m.date).toLocaleDateString("he-IL")}
                title={m.entityName}
                subtitle={m.entityType}
                fields={[
                  {
                    label: "סוג",
                    value: `${m.entryType === "DEBIT" ? "חיוב" : "זיכוי"} · ${LEDGER_CATEGORY_LABELS[m.category] || m.category}`,
                  },
                  { label: "תיאור", value: m.description || "—" },
                ]}
                qtyLabel="סכום"
                qty={`₪${m.amount.toLocaleString("he-IL")}`}
              />
            ))}
            {filteredMovements.length === 0 && (
              <p className="text-center text-muted py-8 col-span-full">אין תנועות בטווח שנבחר</p>
            )}
          </div>
        </div>
      )}
    </DepartmentLayout>
  );
}
