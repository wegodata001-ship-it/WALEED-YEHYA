"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { TaskMediaViewer } from "@/components/storage/TaskMediaViewer";
import { MediaGallery } from "@/components/storage/MediaGallery";
import type { FieldTaskRow } from "@/components/dept/types";

export function OpsApprovalsSection({
  pendingTasks,
  pendingAttendance,
  verifiedAttendance,
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
    photoUrl?: string | null;
  }[];
  verifiedAttendance: {
    id: string;
    employee: { firstName: string; lastName: string };
    workDate: string;
    checkIn: string | null;
    photoUrl: string | null;
  }[];
  adjustQty: Record<string, string>;
  setAdjustQty: (v: Record<string, string>) => void;
  onApproveTask: (id: string, qty?: number) => void;
  onApproveAttendance: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-primary-dark">אימות נוכחות — צילומי כניסה</h3>
        {verifiedAttendance.length === 0 ? (
          <p className="text-sm text-muted">אין רישומי כניסה עם תמונה בטווח שנבחר</p>
        ) : (
          <div className="work-card-grid">
            {verifiedAttendance.map((r) => (
              <WorkCardDetail
                key={r.id}
                date={new Date(r.workDate).toLocaleDateString("he-IL")}
                title={`${r.employee.firstName} ${r.employee.lastName}`}
                subtitle={
                  r.checkIn
                    ? `כניסה ${new Date(r.checkIn).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
                    : "כניסה"
                }
                fields={[{ label: "אימות", value: r.photoUrl ? "תמונה צורפה" : "ללא תמונה" }]}
                footer={
                  r.photoUrl ? (
                    <div className="px-4 pb-3">
                      <MediaGallery legacyUrls={[r.photoUrl]} />
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

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
                  { label: "סוג עבודה", value: t.workType || t.plotName || "—" },
                  { label: "רכב", value: t.vehiclePlate || "—" },
                  { label: "מכונה", value: t.machineryUnit?.name || "—" },
                  ...(t.startedAt
                    ? [{ label: "התחיל", value: new Date(t.startedAt).toLocaleString("he-IL") }]
                    : []),
                  ...(t.completedAt
                    ? [{ label: "הסתיים", value: new Date(t.completedAt).toLocaleString("he-IL") }]
                    : []),
                  {
                    label: "תוכנן",
                    value: `${t.plannedQuantity} ${QUANTITY_UNIT_LABELS[t.quantityUnit] || ""}`,
                  },
                  {
                    label: "דווח",
                    value: `${t.reportedQuantity ?? "—"} ${QUANTITY_UNIT_LABELS[t.quantityUnit] || ""}`,
                  },
                ]}
                notes={t.employeeNotes || t.actualNotes}
                footer={
                  <>
                    <div className="px-4 pb-2">
                      <TaskMediaViewer media={t.media} legacyUrls={t.photoUrls} />
                    </div>
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
                  </>
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
