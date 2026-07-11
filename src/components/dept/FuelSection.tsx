"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Smartphone, Pencil, Trash2, X } from "lucide-react";
import { FUEL_SOURCE_LABELS, FUEL_RECIPIENT_LABELS } from "@/lib/constants";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import type { FuelTx, Source } from "@/components/dept/types";

type TankForm = {
  name: string;
  sourceType: string;
  capacityLiters: string;
  currentLevel: string;
  location: string;
};

const emptyTank = (): TankForm => ({
  name: "",
  sourceType: "FIXED_TANK",
  capacityLiters: "",
  currentLevel: "0",
  location: "",
});

export function FuelSection({
  sources,
  fuel,
  fuelPrices,
  onPrice,
  onEdit,
  onReload,
}: {
  sources: Source[];
  fuel: FuelTx[];
  fuelPrices: { id: string; name: string; pricePerLiter: number | null }[];
  onPrice: (id: string, price: number) => void;
  onEdit: (t: FuelTx) => void;
  onReload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState<TankForm>(emptyTank());
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyTank());
    setShowForm(true);
  };

  const openEdit = (s: Source) => {
    setEditing(s);
    setForm({
      name: s.name,
      sourceType: s.sourceType,
      capacityLiters: s.capacityLiters != null ? String(s.capacityLiters) : "",
      currentLevel: String(s.currentLevel),
      location: "",
    });
    setShowForm(true);
  };

  const saveTank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        sourceType: form.sourceType,
        capacityLiters: form.capacityLiters === "" ? null : Number(form.capacityLiters),
        currentLevel: Number(form.currentLevel || 0),
        location: form.location || null,
      };
      const res = await fetch(editing ? `/api/fuel-sources/${editing.id}` : "/api/fuel-sources", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        onReload();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteTank = async (id: string) => {
    if (!confirm("להשבית את המיכל?")) return;
    await fetch(`/api/fuel-sources/${id}`, { method: "DELETE" });
    onReload();
  };

  const activeSources = sources.filter((s) => (s as Source & { isActive?: boolean }).isActive !== false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-primary-dark">מיכלים ומלאי</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> הוסף מיכל
          </button>
          <Link
            href="/mobile/fuel"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold"
          >
            <Smartphone className="h-3.5 w-3.5" /> דיווח דלק
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={saveTank} className="work-card p-4 grid gap-2 sm:grid-cols-2 relative">
          <button
            type="button"
            className="absolute left-3 top-3 text-muted"
            onClick={() => setShowForm(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <h4 className="sm:col-span-2 font-bold text-primary-dark">
            {editing ? "עריכת מיכל" : "מיכל חדש"}
          </h4>
          <input
            required
            placeholder="שם המיכל"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input"
          />
          <select
            value={form.sourceType}
            onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
            className="field-input"
          >
            {Object.entries(FUEL_SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="1"
            placeholder="קיבולת מקסימלית (ליטר)"
            value={form.capacityLiters}
            onChange={(e) => setForm({ ...form, capacityLiters: e.target.value })}
            className="field-input"
          />
          <input
            type="number"
            step="0.1"
            placeholder="מלאי נוכחי (ליטר)"
            value={form.currentLevel}
            onChange={(e) => setForm({ ...form, currentLevel: e.target.value })}
            className="field-input"
          />
          <input
            placeholder="מיקום (אופציונלי)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="field-input sm:col-span-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-primary py-2 text-white font-bold disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור מיכל"}
          </button>
        </form>
      )}

      <div className="work-card-grid">
        {activeSources.map((s) => {
          const pct = s.capacityLiters ? Math.round((s.currentLevel / s.capacityLiters) * 100) : null;
          return (
            <WorkCardDetail
              key={s.id}
              title={s.name}
              subtitle={FUEL_SOURCE_LABELS[s.sourceType]}
              fields={[
                {
                  label: "קיבולת",
                  value: s.capacityLiters != null ? `${s.capacityLiters} ל׳` : "לא הוגדרה",
                },
                ...(pct != null ? [{ label: "אחוז", value: `${pct}%` }] : []),
              ]}
              qtyLabel="מלאי"
              qty={`${s.currentLevel.toFixed(0)} ל׳`}
              className={pct != null && pct < 25 ? "border-danger/40" : ""}
              footer={
                <div className="flex gap-2 px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-bold"
                  >
                    <Pencil className="h-3 w-3" /> עריכה
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTank(s.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-bold text-danger"
                  >
                    <Trash2 className="h-3 w-3" /> השבת
                  </button>
                </div>
              }
            />
          );
        })}
      </div>
      {activeSources.length === 0 && (
        <p className="text-center text-muted py-6">אין מיכלים — הוסף מיכל והגדר קיבולת מקסימלית</p>
      )}

      {fuelPrices.length > 0 && (
        <section className="work-card p-4">
          <h4 className="text-sm font-bold mb-2">מחיר ליטר — לקוחות / קבלנים חיצוניים</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            {fuelPrices.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{f.name}</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={f.pricePerLiter ?? 7.2}
                  onBlur={(e) => onPrice(f.id, Number(e.target.value))}
                  className="w-20 rounded border border-border px-2 py-1 text-center"
                  dir="ltr"
                />
                <span className="text-xs text-muted">₪/ל׳</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <h3 className="text-sm font-bold text-primary-dark">כרטסות תדלוק</h3>
      <div className="work-card-grid">
        {fuel.map((t) => (
          <WorkCardDetail
            key={t.id}
            date={new Date(t.transactionDate).toLocaleDateString("he-IL")}
            title={t.recipient?.name || "תדלוק"}
            subtitle={
              t.recipient ? FUEL_RECIPIENT_LABELS[t.recipient.category] || t.recipient.category : undefined
            }
            fields={[
              { label: "רכב", value: t.licensePlate || t.vehicle?.licensePlate || "—" },
              { label: "מקור", value: t.source?.name || "—" },
              { label: "נהג", value: t.operator ? t.operator.firstName : "—" },
              ...(t.totalCost != null
                ? [{ label: "עלות", value: `₪${Number(t.totalCost).toFixed(0)}` }]
                : []),
            ]}
            qtyLabel="ליטרים"
            qty={`${t.liters} ל׳`}
            onClick={() => onEdit(t)}
          />
        ))}
      </div>
      {fuel.length === 0 && <p className="text-center text-muted py-8">אין תדלוקים בטווח שנבחר</p>}
    </div>
  );
}
