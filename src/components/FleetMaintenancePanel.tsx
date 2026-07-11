"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, Wrench, Plus, X } from "lucide-react";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

type Alert = {
  vehicleId: string;
  licensePlate: string;
  alertType: string;
  expiryDate: string;
  expired: boolean;
  daysLeft: number;
};

type ServiceRecord = {
  id: string;
  serviceDate: string;
  serviceType: string;
  description: string | null;
  totalCost: number | null;
  vehicle: { licensePlate: string };
};

type VehicleOpt = { id: string; licensePlate: string; make: string | null; model: string | null };

export function FleetMaintenancePanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    serviceType: "GENERAL_MAINTENANCE",
    serviceDate: new Date().toISOString().slice(0, 10),
    description: "",
    totalCost: "",
    performedBy: "",
    odometerKm: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      const d = await res.json();
      setAlerts(d.alerts || []);
      setVehicles(d.vehicles || []);
      setRecords(
        (d.records || []).map((r: ServiceRecord & { totalCost?: unknown }) => ({
          ...r,
          totalCost: r.totalCost ? Number(r.totalCost) : null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          serviceType: form.serviceType,
          serviceDate: form.serviceDate,
          description: form.description || null,
          totalCost: form.totalCost ? Number(form.totalCost) : null,
          performedBy: form.performedBy || null,
          odometerKm: form.odometerKm ? Number(form.odometerKm) : null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          vehicleId: "",
          serviceType: "GENERAL_MAINTENANCE",
          serviceDate: new Date().toISOString().slice(0, 10),
          description: "",
          totalCost: "",
          performedBy: "",
          odometerKm: "",
        });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <section>
          <h3 className="font-bold text-primary-dark mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> התראות פקיעה — 30 יום
          </h3>
          <div className="work-card-grid">
            {alerts.map((a, i) => (
              <WorkCardDetail
                key={`${a.vehicleId}-${i}`}
                title={a.licensePlate}
                subtitle={a.alertType}
                fields={[
                  {
                    label: "תאריך",
                    value: new Date(a.expiryDate).toLocaleDateString("he-IL"),
                  },
                  {
                    label: "סטטוס",
                    value: a.expired ? "פג תוקף" : `עוד ${a.daysLeft} ימים`,
                  },
                ]}
                className={a.expired ? "border-danger/50" : "border-amber-300"}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-primary-dark flex items-center gap-2">
            <Wrench className="h-5 w-5" /> יומן טיפולים
          </h3>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> הוסף טיפול
          </button>
        </div>

        {showForm && (
          <form onSubmit={save} className="work-card p-4 grid gap-2 sm:grid-cols-2 relative">
            <button type="button" className="absolute left-3 top-3 text-muted" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </button>
            <h4 className="sm:col-span-2 font-bold">טיפול חדש</h4>
            <select
              required
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="field-input"
            >
              <option value="">בחר כלי רכב</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} {v.model ? `· ${v.model}` : ""}
                </option>
              ))}
            </select>
            <select
              value={form.serviceType}
              onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
              className="field-input"
            >
              {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              required
              value={form.serviceDate}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
              className="field-input"
            />
            <input
              type="number"
              placeholder="עלות (₪)"
              value={form.totalCost}
              onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
              className="field-input"
            />
            <input
              type="number"
              placeholder="ק״מ במד"
              value={form.odometerKm}
              onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
              className="field-input"
            />
            <input
              placeholder="בוצע ע״י"
              value={form.performedBy}
              onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
              className="field-input"
            />
            <input
              placeholder="תיאור"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="field-input sm:col-span-2"
            />
            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 rounded-md bg-primary py-2 text-white font-bold disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור טיפול"}
            </button>
          </form>
        )}

        <div className="work-card-grid">
          {records.map((r) => (
            <WorkCardDetail
              key={r.id}
              date={new Date(r.serviceDate).toLocaleDateString("he-IL")}
              title={r.vehicle.licensePlate}
              subtitle={SERVICE_TYPE_LABELS[r.serviceType] || r.serviceType}
              fields={[{ label: "תיאור", value: r.description || "—" }]}
              qtyLabel="עלות"
              qty={r.totalCost != null ? `₪${r.totalCost.toLocaleString("he-IL")}` : "—"}
            />
          ))}
        </div>
        {records.length === 0 && (
          <p className="p-6 text-center text-muted">אין טיפולים מתועדים — הוסף טיפול חדש</p>
        )}
      </section>
    </div>
  );
}
