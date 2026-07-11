"use client";

import { QUANTITY_UNIT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { DayRow, Movement } from "@/components/dept/types";

export function AccountsSection({
  entities,
  movements,
  selected,
  onClear,
  onSelect,
  workDays,
}: {
  entities: { name: string; type: string; total: number; count: number }[];
  movements: Movement[];
  selected: { type: string; name: string } | null;
  onSelect: (e: { type: string; name: string }) => void;
  onClear: () => void;
  workDays: DayRow[];
}) {
  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted">
              כרטסת פתוחה · {selected.type === "customer" ? "לקוח שדה" : selected.type}
            </p>
            <h3 className="text-lg font-extrabold text-primary-dark">{selected.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-bold"
          >
            חזרה לרשימה
          </button>
        </div>

        {workDays.length > 0 && (
          <>
            <h4 className="text-sm font-bold">עבודות בשדה</h4>
            <div className="work-card-grid">
              {workDays.map((d, i) => (
                <WorkCardDetail
                  key={`w-${i}`}
                  date={new Date(d.date).toLocaleDateString("he-IL")}
                  title={`${d.settlement} · ${d.plotName}`}
                  fields={[
                    { label: "עובד", value: d.employeeName },
                    { label: "מכונה", value: d.machinery },
                  ]}
                  qty={`${d.quantity} ${QUANTITY_UNIT_LABELS[d.quantityUnit] || ""}`}
                />
              ))}
            </div>
          </>
        )}

        <h4 className="text-sm font-bold">תנועות כספיות / דלק</h4>
        <div className="work-card-grid">
          {movements.map((m) => (
            <WorkCardDetail
              key={m.id}
              date={new Date(m.date).toLocaleDateString("he-IL")}
              title={m.entryType === "DEBIT" ? "חיוב" : "זיכוי"}
              subtitle={m.category}
              fields={[{ label: "תיאור", value: m.description || "—" }]}
              qtyLabel="סכום"
              qty={`₪${m.amount.toLocaleString("he-IL")}`}
            />
          ))}
        </div>
        {movements.length === 0 && workDays.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted">
            אין תנועות לכרטסת זו בטווח שנבחר
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted font-medium">לחץ על שם עובד / לקוח / קבלן לפתיחת הכרטסת.</p>
      <div className="work-card-grid">
        {entities.map((e) => (
          <WorkCardDetail
            key={`${e.type}-${e.name}`}
            title={e.name}
            subtitle={e.type === "customer" ? "לקוח שדה" : e.type}
            fields={[{ label: "תנועות", value: String(e.count) }]}
            qtyLabel="יתרה"
            qty={`₪${e.total.toLocaleString("he-IL")}`}
            onClick={() => onSelect({ type: e.type, name: e.name })}
          />
        ))}
      </div>
      {entities.length === 0 && <p className="text-center text-muted py-8">אין כרטסות בטווח שנבחר</p>}
    </div>
  );
}
