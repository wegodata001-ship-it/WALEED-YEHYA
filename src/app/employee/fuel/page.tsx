"use client";

import { useEffect, useState } from "react";
import { EmployeeShell } from "@/components/EmployeeShell";
import { PhotoCapture } from "@/components/PhotoCapture";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { FUEL_SOURCE_LABELS } from "@/lib/constants";
import { formatFuelWhatsApp } from "@/lib/whatsapp";
import { addToOfflineQueue } from "@/lib/offline-sync";
import { CheckCircle2, Loader2 } from "lucide-react";

type FuelRecipient = {
  id: string;
  name: string;
  category: string;
  columnRole: string;
  vehicleId: string | null;
  fuelSourceId: string | null;
  pricePerLiter?: number | null;
  vehicle?: { licensePlate: string } | null;
};

type Lookup = {
  employees: { id: string; firstName: string; lastName: string }[];
  fuelSources: { id: string; name: string; sourceType: string; currentLevel: number }[];
  fuelRecipients: FuelRecipient[];
  vehicles: { id: string; licensePlate: string; make: string | null; model: string | null }[];
};

type Mode = "vehicle" | "external" | "tank_fill";

export default function MobileFuelPage() {
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("vehicle");
  const [form, setForm] = useState({
    recipientId: "",
    vehicleId: "",
    licensePlate: "",
    sourceId: "",
    liters: "",
    odometerKm: "",
    notes: "",
    tankSourceId: "",
  });

  useEffect(() => {
    Promise.all([fetch("/api/lookup").then((r) => r.json()), fetch("/api/auth/me").then((r) => r.json())]).then(
      ([lookupData, me]) => {
        setLookup(lookupData);
        if (me?.firstName) setOperatorName(`${me.firstName} ${me.lastName || ""}`.trim());
      }
    );
  }, []);

  const recipients = lookup?.fuelRecipients || [];
  const vehicles = recipients.filter((r) => r.category === "COMPANY_VEHICLE");
  const external = recipients.filter((r) => r.category === "EXTERNAL_CUSTOMER");
  const tanks = (lookup?.fuelSources || []).filter((s) => s.sourceType === "FIXED_TANK" || s.sourceType === "FIELD_CART");

  const selectedRecipient = recipients.find((r) => r.id === form.recipientId);
  const isExternal = mode === "external";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isFill = mode === "tank_fill";
    const payload = {
      recipientId: isFill ? null : form.recipientId || null,
      vehicleId: form.vehicleId || selectedRecipient?.vehicleId || null,
      licensePlate: form.licensePlate || selectedRecipient?.vehicle?.licensePlate || null,
      sourceId: isFill ? null : form.sourceId,
      fuelSourceId: isFill ? form.tankSourceId : undefined,
      liters: Number(form.liters),
      odometerKm: form.odometerKm ? Number(form.odometerKm) : null,
      pricePerLiter: isExternal && selectedRecipient?.pricePerLiter ? Number(selectedRecipient.pricePerLiter) : undefined,
      meterPhotoUrl,
      notes: form.notes || null,
      transactionType: isFill ? "TANK_FILL" : isExternal ? "SUBCONTRACTOR_CHARGE" : "REFUEL_VEHICLE",
      transactionDate: new Date().toISOString(),
    };

    // For tank fill, use recipient that matches tank or pass source via special field
    if (isFill) {
      const tankRecipient = recipients.find(
        (r) => r.category === "TANK" && (r.columnRole === "TANK_FILL" || r.fuelSourceId === form.tankSourceId)
      );
      (payload as { recipientId: string | null }).recipientId =
        recipients.find((r) => r.columnRole === "TANK_FILL")?.id || tankRecipient?.id || null;
      (payload as { sourceId: string | null }).sourceId = form.tankSourceId;
    }

    try {
      if (!navigator.onLine) {
        const clientId = crypto.randomUUID();
        addToOfflineQueue({ id: clientId, type: "fuel", payload });
        setSaved({ ...payload, id: clientId, offline: true });
        return;
      }
      const res = await fetch("/api/fuel", {
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

  if (!lookup) {
    return (
      <EmployeeShell title="תדלוק" subtitle="טוען...">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </EmployeeShell>
    );
  }

  if (saved) {
    const msg = formatFuelWhatsApp({
      operator: operatorName || selectedRecipient?.name || "",
      vehicle: form.licensePlate || selectedRecipient?.name || "",
      liters: Number(form.liters),
      source: lookup.fuelSources.find((s) => s.id === form.sourceId || s.id === form.tankSourceId)?.name || "",
      odometer: form.odometerKm ? Number(form.odometerKm) : null,
      date: new Date().toLocaleString("he-IL"),
      gps: null,
    });
    return (
      <EmployeeShell title="נשמר!" subtitle="דיווח דלק עודכן">
        <div className="text-center py-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <WhatsAppButton message={msg} entityType="FuelTransaction" entityId={saved.id as string} />
          <button
            onClick={() => {
              setSaved(null);
              setForm({ ...form, liters: "", odometerKm: "", notes: "" });
              setMeterPhotoUrl(null);
            }}
            className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-medium"
          >
            דיווח נוסף
          </button>
        </div>
      </EmployeeShell>
    );
  }

  return (
    <EmployeeShell title="דיווח תדלוק" subtitle="רכב חברה · קבלן · מילוי מיכל">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["vehicle", "רכב חברה"],
              ["external", "רכב קבלן"],
              ["tank_fill", "מילוי מיכל"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setMode(k);
                setForm({ ...form, recipientId: "", tankSourceId: "", sourceId: "" });
              }}
              className={`rounded-lg border px-2 py-2.5 text-xs font-bold ${
                mode === k ? "bg-primary text-white border-primary" : "bg-card border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "tank_fill" ? (
          <Field label="מיכל למילוי" required>
            <select
              required
              value={form.tankSourceId}
              onChange={(e) => setForm({ ...form, tankSourceId: e.target.value })}
              className="field-input"
            >
              <option value="">בחר מיכל</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (יתרה {Number(t.currentLevel).toFixed(0)} ל׳)
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={mode === "external" ? "קבלן / לקוח חיצוני" : "רכב חברה"} required>
            <select
              required
              value={form.recipientId}
              onChange={(e) => {
                const r = recipients.find((x) => x.id === e.target.value);
                setForm({
                  ...form,
                  recipientId: e.target.value,
                  licensePlate: r?.vehicle?.licensePlate || form.licensePlate,
                  vehicleId: r?.vehicleId || "",
                });
              }}
              className="field-input"
            >
              <option value="">בחר...</option>
              {(mode === "vehicle" ? vehicles : external).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.pricePerLiter ? ` · ₪${Number(r.pricePerLiter)}/ל׳` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {mode !== "tank_fill" && (
          <>
            <Field label="מספר רכב">
              <input
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                className="field-input"
                placeholder="מס׳ רישוי"
                list="plates"
              />
              <datalist id="plates">
                {(lookup.vehicles || []).map((v) => (
                  <option key={v.id} value={v.licensePlate} />
                ))}
              </datalist>
            </Field>
            <Field label="מקור דלק" required>
              <select
                required
                value={form.sourceId}
                onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
                className="field-input"
              >
                <option value="">בחר מקור</option>
                {lookup.fuelSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {FUEL_SOURCE_LABELS[s.sourceType]} ({Number(s.currentLevel).toFixed(0)} ל׳)
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <PhotoCapture
          onCapture={setMeterPhotoUrl}
          photoUrl={meterPhotoUrl}
          label="צילום מונה / סופר ליטרים"
          hint="צלם את המונה"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="ליטרים" required>
            <input
              type="number"
              step="0.1"
              required
              value={form.liters}
              onChange={(e) => setForm({ ...form, liters: e.target.value })}
              className="field-input text-lg font-bold"
            />
          </Field>
          <Field label="מד אוץ (ק״מ)">
            <input
              type="number"
              value={form.odometerKm}
              onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
              className="field-input"
            />
          </Field>
        </div>

        {isExternal && selectedRecipient?.pricePerLiter && (
          <p className="text-sm rounded-lg border border-border bg-card px-3 py-2">
            מחיר: <strong>₪{Number(selectedRecipient.pricePerLiter)}/ל׳</strong>
            {" · "}סה״כ: ₪{(Number(form.liters || 0) * Number(selectedRecipient.pricePerLiter)).toFixed(0)}
          </p>
        )}

        <Field label="הערות">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="field-input min-h-[70px]"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-4 text-white font-bold text-lg disabled:opacity-50"
        >
          {loading ? "שומר..." : mode === "tank_fill" ? "שמור מילוי מיכל" : "שמור תדלוק"}
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
