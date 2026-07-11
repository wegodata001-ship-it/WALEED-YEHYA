"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { FieldTaskRow } from "@/components/dept/types";

export function OpsApprovalsSection({
  pendingTasks,
  pendingAttendance,
  adjustQty,
  setAdjustQty,
  onApproveTask,
  onApproveAttendance,
}: {
  pendingTasks: FieldTaskRow[];
  pendingAttendance: {
    id: string;
    employee: { firstName: string; lastName: string };
    correctionNote: string | null;
    workDate: string;
  }[];
  adjustQty: Record<string, string>;
  setAdjustQty: (v: Record<string, string>) => void;
  onApproveTask: (id: string, qty?: number) => void;
  onApproveAttendance: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-primary-dark">אישורי כמויות משימות שטח</h3>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted">אין משימות ממתינות לאישור</p>
        ) : (
          <div className="work-card-grid">
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
                      אשר דיווח
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
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-primary-dark">אישורי תיקון נוכחות</h3>
        {pendingAttendance.length === 0 ? (
          <p className="text-sm text-muted">אין בקשות תיקון ממתינות</p>
        ) : (
          <div className="work-card-grid">
            {pendingAttendance.map((r) => (
              <WorkCardDetail
                key={r.id}
                date={new Date(r.workDate).toLocaleDateString("he-IL")}
                title={`${r.employee.firstName} ${r.employee.lastName}`}
                subtitle="בקשת תיקון"
                fields={[{ label: "הערה", value: r.correctionNote || "—" }]}
                footer={
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => onApproveAttendance(r.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
                    >
                      אשר
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
