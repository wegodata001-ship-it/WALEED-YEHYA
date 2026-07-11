"use client";

import { useEffect, useState } from "react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { PhotoCapture } from "@/components/PhotoCapture";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  MATERIAL_LABELS,
  BALE_LABELS,
  CHOPPING_LABELS,
  MACHINERY_UNIT_LABELS,
  QUANTITY_UNIT_LABELS,
} from "@/lib/constants";
import { formatMachineryWhatsApp } from "@/lib/whatsapp";
import { addToOfflineQueue } from "@/lib/offline-sync";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";

type MachineryUnit = {
  id: string;
  name: string;
  unitType: string;
  unitNumber: string | null;
};

type Lookup = {
  plots: { id: string; name: string; nameHe: string | null }[];
  employees: { id: string; firstName: string; lastName: string }[];
  machineryUnits: MachineryUnit[];
};

export default function MobileMachineryPage() {
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupError, setLookupError] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", unitType: "HARVESTER", unitNumber: "" });
  const [form, setForm] = useState({
    machineryUnitId: "",
    driverName: "",
    settlement: "",
    customerName: "",
    plotName: "",
    materialType: "",
    quantityUnit: "DUNAM",
    acresWorked: "",
    baleCategory: "",
    baleCount: "",
    choppingMechanism: "NONE",
    notes: "",
  });

  const loadLookup = () =>
    fetch("/api/lookup")
      .then((r) => {
        if (!r.ok) throw new Error("lookup failed");
        return r.json();
      })
      .then(setLookup)
      .catch(() => setLookupError(true));

  useEffect(() => {
    loadLookup();
  }, []);

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return;
    setAddingUnit(true);
    try {
      const res = await fetch("/api/machinery-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "שגיאה ביצירת מכונה");
        return;
      }
      await loadLookup();
      setForm((f) => ({
        ...f,
        machineryUnitId: data.id,
        quantityUnit: data.unitType === "BALER" ? "BALE" : "DUNAM",
      }));
      setShowAddUnit(false);
      setUnitForm({ name: "", unitType: "HARVESTER", unitNumber: "" });
    } finally {
      setAddingUnit(false);
    }
  };

  const selectedUnit = lookup?.machineryUnits.find((u) => u.id === form.machineryUnitId);
  const isBaler = selectedUnit?.unitType === "BALER";

  const groupedUnits = {
    harvesters: lookup?.machineryUnits.filter((u) => u.unitType === "HARVESTER") || [],
    balers: lookup?.machineryUnits.filter((u) => u.unitType === "BALER") || [],
    rakes: lookup?.machineryUnits.filter((u) => u.unitType === "RAKE") || [],
    combines: lookup?.machineryUnits.filter((u) => u.unitType === "COMBINE") || [],
    subcontractors: lookup?.machineryUnits.filter((u) => u.unitType === "SUBCONTRACTOR") || [],
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      machineryUnitId: form.machineryUnitId,
      driverName: form.driverName || null,
      settlement: form.settlement,
      customerName: form.customerName,
      plotName: form.plotName || null,
      materialType: form.materialType || null,
      quantityUnit: form.quantityUnit,
      acresWorked: Number(form.acresWorked),
      baleCategory: form.baleCategory || null,
      baleCount: form.baleCount ? Number(form.baleCount) : null,
      choppingMechanism: form.choppingMechanism,
      notes: form.notes || null,
      photoUrl,
      workDate: new Date().toISOString(),
    };

    try {
      if (!navigator.onLine) {
        const clientId = crypto.randomUUID();
        addToOfflineQueue({ id: clientId, type: "machinery", payload });
        setSaved({ ...payload, id: clientId, offline: true });
        return;
      }
      const res = await fetch("/api/machinery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) setSaved(data);
    } finally {
      setLoading(false);
    }
  };

  if (lookupError) {
    return (
      <EmployeeShell title="יומן עבודה" subtitle="שגיאת חיבור">
        <p className="text-center text-muted py-8">לא ניתן לטעון נתונים. רענן ונסה שוב.</p>
        <button onClick={() => window.location.reload()} className="w-full rounded-xl bg-primary py-3 text-white font-semibold">
          רענן
        </button>
      </EmployeeShell>
    );
  }

  if (!lookup) {
    return (
      <EmployeeShell title="יומן מכונה" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  if (saved) {
    const msg = formatMachineryWhatsApp({
      operator: form.driverName || selectedUnit?.name || "",
      vehicle: selectedUnit?.name || "",
      plot: form.plotName || form.settlement,
      material: form.materialType ? MATERIAL_LABELS[form.materialType] : "—",
      acres: Number(form.acresWorked),
      bales: form.baleCount ? Number(form.baleCount) : null,
      date: new Date().toLocaleString("he-IL"),
      gps: null,
    });

    return (
      <EmployeeShell title="נשמר בהצלחה!" subtitle={`${selectedUnit?.name} — עודכן ביומן`}>
        <div className="text-center py-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <WhatsAppButton message={msg} entityType="MachineryWorkLog" entityId={saved.id as string} />
          <button
            onClick={() => setSaved(null)}
            className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-medium"
          >
            רישום נוסף
          </button>
        </div>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell title="יומן עבודה" subtitle="מכונה · נהג · ישוב · לקוח · חלקה · כמות">
      <form onSubmit={submit} className="space-y-4">
        <PhotoCapture onCapture={setPhotoUrl} photoUrl={photoUrl} label="צילום מהשטח (אופציונלי)" />

        <Field label="מכונה / יחידה" required>
          <select
            required
            value={form.machineryUnitId}
            onChange={(e) => {
              const u = lookup.machineryUnits.find((x) => x.id === e.target.value);
              setForm({
                ...form,
                machineryUnitId: e.target.value,
                quantityUnit: u?.unitType === "BALER" ? "BALE" : "DUNAM",
              });
            }}
            className="field-input"
          >
            <option value="">בחר מכונה</option>
            {groupedUnits.harvesters.length > 0 && (
              <optgroup label={MACHINERY_UNIT_LABELS.HARVESTER}>
                {groupedUnits.harvesters.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.unitNumber && u.unitNumber !== "0" ? `(${u.unitNumber})` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedUnits.balers.length > 0 && (
              <optgroup label={MACHINERY_UNIT_LABELS.BALER}>
                {groupedUnits.balers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </optgroup>
            )}
            {groupedUnits.rakes.length > 0 && (
              <optgroup label={MACHINERY_UNIT_LABELS.RAKE}>
                {groupedUnits.rakes.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </optgroup>
            )}
            {groupedUnits.combines.length > 0 && (
              <optgroup label={MACHINERY_UNIT_LABELS.COMBINE}>
                {groupedUnits.combines.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </optgroup>
            )}
            {groupedUnits.subcontractors.length > 0 && (
              <optgroup label={MACHINERY_UNIT_LABELS.SUBCONTRACTOR}>
                {groupedUnits.subcontractors.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            type="button"
            onClick={() => setShowAddUnit(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary"
          >
            <Plus className="h-4 w-4" /> הוסף מכונה חדשה
          </button>
        </Field>

        {showAddUnit && (
          <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3 relative">
            <button type="button" onClick={() => setShowAddUnit(false)} className="absolute left-3 top-3 text-muted">
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-primary-dark">מכונה חדשה</h3>
            <input
              required
              placeholder="שם המכונה (למשל מקצרת 4995)"
              value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              className="field-input"
            />
            <select
              value={unitForm.unitType}
              onChange={(e) => setUnitForm({ ...unitForm, unitType: e.target.value })}
              className="field-input"
            >
              {Object.entries(MACHINERY_UNIT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              placeholder="מספר יחידה (אופציונלי)"
              value={unitForm.unitNumber}
              onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
              className="field-input"
            />
            <button
              type="button"
              disabled={addingUnit || !unitForm.name.trim()}
              onClick={addUnit}
              className="w-full rounded-xl bg-primary py-2.5 text-white font-bold disabled:opacity-50"
            >
              {addingUnit ? "שומר..." : "שמור מכונה ובחר"}
            </button>
          </div>
        )}

        <Field label="נהג" required>
          <input
            required
            value={form.driverName}
            onChange={(e) => setForm({ ...form, driverName: e.target.value })}
            className="field-input"
            placeholder="הקלד שם חדש או בחר מהרשימה"
            list="drivers-list"
          />
          <datalist id="drivers-list">
            {lookup.employees.map((e) => (
              <option key={e.id} value={`${e.firstName} ${e.lastName}`} />
            ))}
          </datalist>
          <p className="text-[11px] text-muted mt-1">אפשר להקליד נהג חדש ישירות</p>
        </Field>

        <Field label="ישוב" required>
          <input
            required
            value={form.settlement}
            onChange={(e) => setForm({ ...form, settlement: e.target.value })}
            className="field-input"
            placeholder="כפר יחזקאל, בית שאן..."
          />
        </Field>

        <Field label="לקוח" required>
          <input
            required
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="field-input"
            placeholder="שם לקוח — גם חדש"
          />
        </Field>

        <Field label="חלקה">
          <input
            value={form.plotName}
            onChange={(e) => setForm({ ...form, plotName: e.target.value })}
            className="field-input"
            placeholder="הקלד חלקה חדשה או קיימת"
            list="plots-list"
          />
          <datalist id="plots-list">
            {lookup.plots.map((p) => (
              <option key={p.id} value={p.nameHe || p.name} />
            ))}
          </datalist>
          <p className="text-[11px] text-muted mt-1">אין צורך לבחור מרשימה — אפשר לרשום חלקה חדשה</p>
        </Field>

        <Field label="חומר">
          <select
            value={form.materialType}
            onChange={(e) => setForm({ ...form, materialType: e.target.value })}
            className="field-input"
          >
            <option value="">ללא / לא רלוונטי</option>
            {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="כמות" required>
            <input
              type="number"
              step="0.1"
              required
              value={form.acresWorked}
              onChange={(e) => setForm({ ...form, acresWorked: e.target.value })}
              className="field-input text-lg font-bold"
            />
          </Field>
          <Field label="יחידה">
            <select
              value={form.quantityUnit}
              onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}
              className="field-input"
            >
              {Object.entries(QUANTITY_UNIT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        {isBaler && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג אשכול">
              <select
                value={form.baleCategory}
                onChange={(e) => setForm({ ...form, baleCategory: e.target.value })}
                className="field-input"
              >
                <option value="">ללא</option>
                {Object.entries(BALE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="מס׳ אשכולות">
              <input
                type="number"
                value={form.baleCount}
                onChange={(e) => setForm({ ...form, baleCount: e.target.value })}
                className="field-input"
              />
            </Field>
          </div>
        )}

        {!isBaler && selectedUnit?.unitType === "HARVESTER" && (
          <Field label="קיצוץ">
            <select
              value={form.choppingMechanism}
              onChange={(e) => setForm({ ...form, choppingMechanism: e.target.value })}
              className="field-input"
            >
              {Object.entries(CHOPPING_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="הערות">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="field-input min-h-[80px]"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-4 text-white font-bold text-lg hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "שומר..." : "שמור ביומן העבודה"}
        </button>
      </form>
    </EmployeeShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary-dark mb-1">
        {label}{required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}
