"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { DayRow, Employee } from "@/components/dept/types";

export function EmployeesRegisterSection({
  employees,
  showAdd,
  setShowAdd,
  form,
  setForm,
  onAdd,
  onOpenEmployee,
}: {
  employees: Employee[];
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  form: Record<string, string>;
  setForm: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  onAdd: (e: React.FormEvent) => void;
  onOpenEmployee: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-primary-dark">רישום עובדים ושכר</h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          הוסף עובד
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
            required
            placeholder="טלפון"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="field-input"
            dir="ltr"
          />
          <input
            placeholder="תפקיד"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            className="field-input"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="field-input"
          >
            <option value="FIELD_OPERATOR">מפעיל שטח</option>
            <option value="WAREHOUSE_MANAGER">מחסנאי דלק</option>
            <option value="OFFICE_MANAGER">משרד</option>
          </select>
          <select
            value={form.salaryType}
            onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
            className="field-input"
          >
            <option value="HOURLY">שכר שעתי</option>
            <option value="MONTHLY">שכר חודשי</option>
          </select>
          {form.salaryType === "HOURLY" ? (
            <input
              placeholder="שכר לשעה"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              className="field-input"
            />
          ) : (
            <input
              placeholder="שכר חודשי"
              value={form.monthlySalary}
              onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
              className="field-input"
            />
          )}
          <input
            placeholder="סיסמה"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field-input"
          />
          <button type="submit" className="sm:col-span-2 rounded-md bg-primary py-2 text-white font-bold">
            שמור עובד
          </button>
        </form>
      )}

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
            ]}
            onClick={() => onOpenEmployee(`${e.firstName} ${e.lastName}`)}
          />
        ))}
      </div>
      {employees.length === 0 && <p className="text-center text-muted py-8">אין עובדים רשומים</p>}
    </div>
  );
}

export function EmployeesCardSection({
  days,
  pendingAttendance,
  onApproveAttendance,
  onOpenEmployee,
}: {
  days: DayRow[];
  pendingAttendance: {
    id: string;
    employee: { firstName: string; lastName: string };
    correctionNote: string | null;
    workDate: string;
  }[];
  onApproveAttendance: (id: string) => void;
  onOpenEmployee: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
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

      <h3 className="text-sm font-bold text-primary-dark">כרטסת שעות / מה בוצע</h3>
      <div className="work-card-grid">
        {days.map((d, i) => (
          <WorkCardDetail
            key={`${d.date}-${i}`}
            date={new Date(d.date).toLocaleDateString("he-IL")}
            title={d.employeeName}
            subtitle={d.machinery}
            fields={[
              { label: "ישוב", value: d.settlement },
              { label: "חלקה", value: d.plotName },
              { label: "לקוח", value: d.customerName },
            ]}
            qty={`${d.quantity} ${QUANTITY_UNIT_LABELS[d.quantityUnit] || ""}`}
            onClick={() => onOpenEmployee(d.employeeName)}
          />
        ))}
      </div>
      {days.length === 0 && <p className="text-center text-muted py-8">אין רשומות עבודה בטווח שנבחר</p>}
    </div>
  );
}
