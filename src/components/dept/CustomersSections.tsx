"use client";

import { buildFieldTaskDetailFields } from "@/components/dept/field-task-fields";
import { quantityUnitDisplayLabel, QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { TaskMediaViewer } from "@/components/storage/TaskMediaViewer";
import type { ClientRow, DayRow, FarmerRow, FieldTaskRow } from "@/components/dept/types";

import { Eye, Pencil, Trash2, X } from "lucide-react";

export function CustomersRegisterSection({
  farmers,
  form,
  setForm,
  modal,
  viewing,
  onOpenAdd,
  onOpenEdit,
  onOpenView,
  onCloseModal,
  onSave,
  onDelete,
  onActivate,
  saving,
  msg,
}: {
  farmers: FarmerRow[];
  form: Record<string, string>;
  setForm: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  modal: "add" | "edit" | "view" | null;
  viewing: FarmerRow | null;
  onOpenAdd: () => void;
  onOpenEdit: (f: FarmerRow) => void;
  onOpenView: (f: FarmerRow) => void;
  onCloseModal: () => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  saving?: boolean;
  msg?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-primary-dark">רישום לקוחות (בעלי שדה)</h3>
        <button
          type="button"
          onClick={onOpenAdd}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          ➕ הוסף לקוח
        </button>
      </div>

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
            onEdit={() => onOpenEdit(f)}
            className={!f.isActive ? "opacity-60" : ""}
            footer={
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenView(f)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Eye className="h-3 w-3" /> צפייה
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEdit(f)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Pencil className="h-3 w-3" /> עריכה
                </button>
                {f.isActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`להשבית את ${f.firstName} ${f.lastName}?`)) onDelete(f.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                  >
                    <Trash2 className="h-3 w-3" /> מחיקה
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onActivate(f.id)}
                    className="text-xs font-bold text-primary"
                  >
                    הפעל מחדש
                  </button>
                )}
              </div>
            }
          />
        ))}
      </div>
      {farmers.length === 0 && (
        <p className="text-center text-muted py-8">אין לקוחות רשומים — הוסף לקוח חדש</p>
      )}

      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <form onSubmit={onSave} className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary-dark">
                {modal === "edit" ? "עריכת לקוח" : "הוספת לקוח"}
              </h2>
              <button type="button" onClick={onCloseModal} className="p-1 rounded hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
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
            </div>
            {msg && <p className="text-sm text-red-600 font-semibold">{msg}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50">
              {saving ? "שומר..." : "שמור"}
            </button>
          </form>
        </div>
      )}

      {modal === "view" && viewing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary-dark">פרטי לקוח</h2>
              <button type="button" onClick={onCloseModal} className="p-1 rounded hover:bg-muted/20">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">שם</dt>
                <dd className="font-bold">
                  {viewing.firstName} {viewing.lastName}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">טלפון</dt>
                <dd dir="ltr">{viewing.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">מושב</dt>
                <dd>{viewing.moshav?.nameHe || viewing.moshav?.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">הערות</dt>
                <dd>{viewing.notes || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">סטטוס</dt>
                <dd>{viewing.isActive ? "פעיל" : "מושבת"}</dd>
              </div>
            </dl>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenEdit(viewing)}
                className="flex-1 rounded-xl bg-primary py-2.5 text-white font-bold text-sm"
              >
                עריכה
              </button>
              <button type="button" onClick={onCloseModal} className="flex-1 rounded-xl border border-border py-2.5 font-bold text-sm">
                סגור
              </button>
            </div>
          </div>
        </div>
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
                ...buildFieldTaskDetailFields(t, { includeQuantities: false }),
                {
                  label: "תוכנן",
                  value: `${t.plannedQuantity} ${t.quantityUnitLabel || quantityUnitDisplayLabel(t.quantityUnit, t.unitLabel)}`,
                },
                {
                  label: "דווח",
                  value: `${t.reportedQuantity ?? "—"} ${t.quantityUnitLabel || quantityUnitDisplayLabel(t.quantityUnit, t.unitLabel)}`,
                },
              ]}
              notes={t.employeeNotes || undefined}
              footer={
                <>
                  <div className="px-4 pb-2">
                    <TaskMediaViewer media={t.media} legacyUrls={t.photoUrls} showEmpty />
                  </div>
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
                </>
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
