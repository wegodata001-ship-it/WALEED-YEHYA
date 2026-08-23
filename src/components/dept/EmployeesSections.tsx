"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { mapsLink } from "@/lib/geolocation";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import type { DayRow, Employee } from "@/components/dept/types";

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  phone: "",
  position: "",
  role: "FIELD_OPERATOR",
  password: "1234",
  salaryType: "HOURLY",
  hourlyRate: "45",
  monthlySalary: "",
});

export function EmployeesRegisterSection({
  employees,
  activeShifts,
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
  saving,
  msg,
}: {
  employees: Employee[];
  activeShifts?: Record<string, string>;
  form: Record<string, string>;
  setForm: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  modal: "add" | "edit" | "view" | null;
  viewing: Employee | null;
  onOpenAdd: () => void;
  onOpenEdit: (e: Employee) => void;
  onOpenView: (e: Employee) => void;
  onCloseModal: () => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  saving?: boolean;
  msg?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-primary-dark">רישום עובדים ושכר</h3>
        <button
          type="button"
          onClick={onOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          ➕ הוסף עובד
        </button>
      </div>

      <div className="work-card-grid">
        {employees.map((e) => (
          <WorkCardDetail
            key={e.id}
            title={`${e.firstName} ${e.lastName}`}
            subtitle={e.position || "עובד"}
            fields={[
              ...(e.phone ? [{ label: "טלפון", value: e.phone }] : []),
              {
                label: "שכר",
                value:
                  e.salaryType === "MONTHLY"
                    ? `חודשי ₪${Number(e.monthlySalary || 0).toLocaleString("he-IL")}`
                    : `שעתי ₪${Number(e.hourlyRate || 0)}`,
              },
              ...(activeShifts?.[e.id]
                ? [
                    { label: "סטטוס משמרת", value: "🟢 במשמרת" },
                    {
                      label: "כניסה",
                      value: new Date(activeShifts[e.id]).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    },
                  ]
                : [{ label: "סטטוס משמרת", value: "⚪ לא במשמרת" }]),
              { label: "סטטוס", value: e.isActive === false ? "מושבת" : "פעיל" },
            ]}
            onEdit={() => onOpenEdit(e)}
            className={e.isActive === false ? "opacity-60" : ""}
            footer={
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenView(e)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Eye className="h-3 w-3" /> צפייה
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEdit(e)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Pencil className="h-3 w-3" /> עריכה
                </button>
                {e.isActive !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`להשבית את ${e.firstName} ${e.lastName}?`)) onDelete(e.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                  >
                    <Trash2 className="h-3 w-3" /> מחיקה
                  </button>
                )}
              </div>
            }
          />
        ))}
      </div>
      {employees.length === 0 && <p className="text-center text-muted py-8">אין עובדים רשומים</p>}

      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <form onSubmit={onSave} className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-primary-dark">
                {modal === "edit" ? "עריכת עובד" : "הוספת עובד"}
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
                onChange={(ev) => setForm({ ...form, firstName: ev.target.value })}
                className="field-input"
              />
              <input
                required
                placeholder="שם משפחה"
                value={form.lastName}
                onChange={(ev) => setForm({ ...form, lastName: ev.target.value })}
                className="field-input"
              />
              <input
                required
                placeholder="טלפון"
                value={form.phone}
                onChange={(ev) => setForm({ ...form, phone: ev.target.value })}
                className="field-input"
                dir="ltr"
              />
              <input
                placeholder="תפקיד"
                value={form.position}
                onChange={(ev) => setForm({ ...form, position: ev.target.value })}
                className="field-input"
              />
              <select
                value={form.role}
                onChange={(ev) => setForm({ ...form, role: ev.target.value })}
                className="field-input"
              >
                <option value="FIELD_OPERATOR">מפעיל שטח</option>
                <option value="OFFICE_MANAGER">משרד</option>
              </select>
              <select
                value={form.salaryType}
                onChange={(ev) => setForm({ ...form, salaryType: ev.target.value })}
                className="field-input"
              >
                <option value="HOURLY">שכר שעתי</option>
                <option value="MONTHLY">שכר חודשי</option>
              </select>
              {form.salaryType === "HOURLY" ? (
                <input
                  placeholder="שכר לשעה"
                  value={form.hourlyRate}
                  onChange={(ev) => setForm({ ...form, hourlyRate: ev.target.value })}
                  className="field-input"
                />
              ) : (
                <input
                  placeholder="שכר חודשי"
                  value={form.monthlySalary}
                  onChange={(ev) => setForm({ ...form, monthlySalary: ev.target.value })}
                  className="field-input"
                />
              )}
              <input
                placeholder={modal === "edit" ? "סיסמה חדשה (אופציונלי)" : "סיסמה"}
                value={form.password}
                onChange={(ev) => setForm({ ...form, password: ev.target.value })}
                className="field-input"
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
              <h2 className="text-lg font-extrabold text-primary-dark">פרטי עובד</h2>
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
                <dt className="text-muted">תפקיד</dt>
                <dd>{viewing.position || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">שכר</dt>
                <dd>
                  {viewing.salaryType === "MONTHLY"
                    ? `חודשי ₪${Number(viewing.monthlySalary || 0).toLocaleString("he-IL")}`
                    : `שעתי ₪${Number(viewing.hourlyRate || 0)}`}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">סטטוס</dt>
                <dd>{viewing.isActive === false ? "מושבת" : "פעיל"}</dd>
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

export { emptyForm as emptyEmployeeForm };

export function EmployeesCardSection({
  days,
  pendingAttendance,
  verifiedAttendance,
  onApproveAttendance,
  onOpenEmployee,
}: {
  days: DayRow[];
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
    checkOut: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    checkOutGps?: { lat: number; lng: number } | null;
  }[];
  onApproveAttendance: (id: string) => void;
  onOpenEmployee: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      {verifiedAttendance.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-primary-dark">נוכחות — מיקומי GPS</h3>
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
                fields={[
                  ...(r.gpsLat != null && r.gpsLng != null
                    ? [
                        {
                          label: "GPS כניסה",
                          value: (
                            <a
                              href={mapsLink(r.gpsLat, r.gpsLng)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              צפה במפה
                            </a>
                          ),
                        },
                      ]
                    : []),
                  ...(r.checkOutGps
                    ? [
                        {
                          label: "GPS יציאה",
                          value: (
                            <a
                              href={mapsLink(r.checkOutGps.lat, r.checkOutGps.lng)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              צפה במפה
                            </a>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            ))}
          </div>
        </section>
      )}

      {pendingAttendance.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-amber-800">בקשות תיקון נוכחות לאישור</h3>
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
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-primary-dark">כרטסת שעות</h3>
        <div className="work-card-grid">
          {days.map((d, i) => (
            <WorkCardDetail
              key={`${d.employeeId}-${d.date}-${i}`}
              date={new Date(d.date).toLocaleDateString("he-IL")}
              title={d.employeeName}
              subtitle={d.customerName || "—"}
              fields={[
                { label: "ישוב", value: d.settlement || "—" },
                { label: "חלקה", value: d.plotName || "—" },
                { label: "מכונה", value: d.machinery },
              ]}
              qty={`${d.quantity} ${QUANTITY_UNIT_LABELS[d.quantityUnit] || ""}`}
              onClick={() => onOpenEmployee(d.employeeName)}
            />
          ))}
        </div>
        {days.length === 0 && <p className="text-center text-muted py-8">אין רשומות בטווח</p>}
      </section>
    </div>
  );
}
