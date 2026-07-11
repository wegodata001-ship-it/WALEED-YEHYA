"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { ClientRow, DayRow, FarmerRow, FieldTaskRow } from "@/components/dept/types";

export function CustomersRegisterSection({
  farmers,
  showAdd,
  setShowAdd,
  form,
  setForm,
  onAdd,
  onToggle,
}: {
  farmers: FarmerRow[];
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  form: Record<string, string>;
  setForm: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  onAdd: (e: React.FormEvent) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-primary-dark">רישום לקוחות (בעלי שדה)</h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          הוסף לקוח
        </button>
      </div>

      {showAdd && (
        <form onSubmit={onAdd} className="work-card p-4 grid gap-2 sm:grid-cols-2">
          <input
            required
            placeholder="שם פרטי"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="field-input"
          />
          <input
            required
            placeholder="שם משפחה"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="field-input"
          />
          <input
            placeholder="טלפון"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="field-input"
            dir="ltr"
          />
          <input
            placeholder="מושב / ישוב"
            value={form.moshavName}
            onChange={(e) => setForm({ ...form, moshavName: e.target.value })}
            className="field-input"
          />
          <input
            placeholder="הערות"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="field-input sm:col-span-2"
          />
          <button type="submit" className="sm:col-span-2 rounded-md bg-primary py-2 text-white font-bold">
            שמור לקוח
          </button>
        </form>
      )}

      <div className="work-card-grid">
        {farmers.map((f) => (
          <WorkCardDetail
            key={f.id}
            title={`${f.firstName} ${f.lastName}`}
            subtitle={f.moshav?.nameHe || f.moshav?.name || "ללא מושב"}
            fields={[
              ...(f.phone ? [{ label: "טלפון", value: f.phone }] : []),
              ...(f.notes ? [{ label: "הערות", value: f.notes }] : []),
              { label: "סטטוס", value: f.isActive ? "פעיל" : "מושבת" },
            ]}
            footer={
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={() => onToggle(f.id, !f.isActive)}
                  className="text-xs font-bold text-primary"
                >
                  {f.isActive ? "השבת" : "הפעל מחדש"}
                </button>
              </div>
            }
            className={!f.isActive ? "opacity-60" : ""}
          />
        ))}
      </div>
      {farmers.length === 0 && (
        <p className="text-center text-muted py-8">אין לקוחות רשומים — הוסף לקוח חדש</p>
      )}
    </div>
  );
}

export function CustomersCardSection({
  rows,
  pendingTasks,
  adjustQty,
  setAdjustQty,
  onApproveTask,
  onOpenCustomer,
  workDays,
}: {
  rows: ClientRow[];
  pendingTasks: FieldTaskRow[];
  adjustQty: Record<string, string>;
  setAdjustQty: (v: Record<string, string>) => void;
  onApproveTask: (id: string, qty?: number) => void;
  onOpenCustomer: (name: string) => void;
  workDays: DayRow[];
}) {
  return (
    <div className="space-y-5">
      {pendingTasks.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-amber-800">פער כמויות — מנהל תכנן / עובד דיווח</h3>
          <p className="text-xs text-muted">אשר את דיווח העובד או עדכן כמות סופית להתחשבנות מול הלקוח.</p>
          {pendingTasks.map((t) => (
            <WorkCardDetail
              key={t.id}
              date={new Date(t.workDate).toLocaleDateString("he-IL")}
              title={t.customerName || "לקוח"}
              subtitle={`${t.assignee.firstName} ${t.assignee.lastName}`}
              fields={[
                { label: "ישוב", value: t.settlement || "—" },
                { label: "חלקה", value: t.plotName || "—" },
                {
                  label: "תוכנן",
                  value: `${t.plannedQuantity} ${QUANTITY_UNIT_LABELS[t.quantityUnit] || ""}`,
                },
                {
                  label: "דווח",
                  value: `${t.reportedQuantity ?? "—"} ${QUANTITY_UNIT_LABELS[t.quantityUnit] || ""}`,
                },
              ]}
              notes={t.actualNotes}
              footer={
                <div className="flex flex-wrap gap-2 items-center px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => onApproveTask(t.id, t.reportedQuantity ?? undefined)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    אשר דיווח עובד
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="כמות סופית"
                    value={adjustQty[t.id] || ""}
                    onChange={(e) => setAdjustQty({ ...adjustQty, [t.id]: e.target.value })}
                    className="w-28 rounded border border-border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onApproveTask(t.id, Number(adjustQty[t.id] || t.plannedQuantity))}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
                  >
                    עדכן ואשר
                  </button>
                </div>
              }
            />
          ))}
        </section>
      )}

      <h3 className="text-sm font-extrabold text-primary-dark">כרטסת לפי לקוח</h3>
      <div className="work-card-grid">
        {rows.map((r) => (
          <WorkCardDetail
            key={r.key}
            title={r.customerName}
            subtitle={r.settlement}
            fields={[
              { label: "חלקה", value: r.plotName !== "ללא חלקה" ? r.plotName : "—" },
              { label: "ימי עבודה", value: String(r.workDays) },
            ]}
            qty={`${r.totalQuantity.toLocaleString("he-IL")} דונם/יח׳`}
            onClick={() => onOpenCustomer(r.customerName)}
          />
        ))}
      </div>
      {rows.length === 0 && <p className="text-center text-muted py-8">אין עבודות ללקוחות בטווח שנבחר</p>}

      <h3 className="text-sm font-extrabold text-primary-dark pt-2">פירוט עבודות</h3>
      <div className="work-card-grid">
        {workDays
          .filter((d) => d.customerName && d.customerName !== "—")
          .map((d, i) => (
            <WorkCardDetail
              key={`${d.date}-${i}`}
              date={new Date(d.date).toLocaleDateString("he-IL")}
              title={d.customerName}
              subtitle={`${d.settlement} · ${d.plotName}`}
              fields={[
                { label: "עובד", value: d.employeeName },
                { label: "מכונה", value: d.machinery },
              ]}
              qty={`${d.quantity} ${QUANTITY_UNIT_LABELS[d.quantityUnit] || ""}`}
              onClick={() => onOpenCustomer(d.customerName)}
            />
          ))}
      </div>
    </div>
  );
}
