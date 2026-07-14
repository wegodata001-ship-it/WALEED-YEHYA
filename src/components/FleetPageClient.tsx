"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleDot, Eye, Plus, Trash2, RefreshCw, Search, X } from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS, MACHINERY_UNIT_LABELS } from "@/lib/constants";
import { formatDateIL, toInputDate, vehicleRowAlert } from "@/lib/vehicle-utils";
import { VEHICLE_OWNERSHIP_LABELS, type VehicleOwnership } from "@/lib/vehicle-ownership";

export type VehicleRow = {
  id: string;
  licensePlate: string;
  vehicleType: string;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  testExpiryDate: string | null;
  liftingInspectionExpiry: string | null;
  compulsoryInsurance: number | null;
  thirdPartyInsurance: number | null;
  insuranceValidUntil: string | null;
  towingValidUntil: string | null;
  windshieldInsurance: number | null;
  registeredTo: string | null;
  agentPhone: string | null;
  notes: string | null;
  displayNotes?: string | null;
  ownership?: VehicleOwnership;
  isActive: boolean;
};

type MachineryRow = {
  id: string;
  name: string;
  unitType: string;
  unitNumber: string | null;
  isActive?: boolean;
};

const emptyVehicle = (): Record<string, unknown> => ({
  licensePlate: "",
  vehicleType: "TRACTOR",
  ownership: "COMPANY",
  status: "ACTIVE",
  make: "",
  model: "",
  year: "",
  testExpiryDate: "",
  liftingInspectionExpiry: "",
  compulsoryInsurance: "",
  thirdPartyInsurance: "",
  insuranceValidUntil: "",
  towingValidUntil: "",
  windshieldInsurance: "",
  registeredTo: "",
  agentPhone: "",
  notes: "",
});

const vehicleFields = [
  { key: "licensePlate", label: "מס׳ רישוי", required: true },
  {
    key: "ownership",
    label: "סוג בעלות",
    type: "select" as const,
    required: true,
    options: Object.entries(VEHICLE_OWNERSHIP_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "vehicleType",
    label: "סוג כלי",
    type: "select" as const,
    required: true,
    options: Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: "model", label: "דגם", required: true },
  { key: "make", label: "יצרן" },
  { key: "year", label: "שנת ייצור", type: "number" as const },
  {
    key: "status",
    label: "סטטוס",
    type: "select" as const,
    options: Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: "testExpiryDate", label: "עד תאריך (טסט)", type: "date" as const },
  { key: "liftingInspectionExpiry", label: "בדיקת הרמה", type: "date" as const },
  { key: "compulsoryInsurance", label: "חובה (₪)", type: "number" as const },
  { key: "thirdPartyInsurance", label: 'צד "ג" (₪)', type: "number" as const },
  { key: "insuranceValidUntil", label: "תוקף ביטוח עד", type: "date" as const },
  { key: "towingValidUntil", label: "גרירה עד", type: "date" as const },
  { key: "windshieldInsurance", label: "שמשות (₪)", type: "number" as const },
  { key: "registeredTo", label: "על שם", colSpan: 2 as const },
  { key: "agentPhone", label: "טלפון סוכן" },
  { key: "notes", label: "הערות", type: "textarea" as const, colSpan: 2 as const },
];

function serialize(v: VehicleRow): Record<string, unknown> {
  return {
    licensePlate: v.licensePlate,
    ownership: v.ownership || "COMPANY",
    vehicleType: v.vehicleType,
    status: v.status,
    make: v.make || "",
    model: v.model || "",
    year: v.year || "",
    testExpiryDate: toInputDate(v.testExpiryDate),
    liftingInspectionExpiry: toInputDate(v.liftingInspectionExpiry),
    compulsoryInsurance: v.compulsoryInsurance ?? "",
    thirdPartyInsurance: v.thirdPartyInsurance ?? "",
    insuranceValidUntil: toInputDate(v.insuranceValidUntil),
    towingValidUntil: toInputDate(v.towingValidUntil),
    windshieldInsurance: v.windshieldInsurance ?? "",
    registeredTo: v.registeredTo || "",
    agentPhone: v.agentPhone || "",
    notes: v.displayNotes ?? v.notes ?? "",
  };
}

function normalizeVehicle(v: Record<string, unknown>): VehicleRow {
  return {
    id: String(v.id),
    licensePlate: String(v.licensePlate),
    vehicleType: String(v.vehicleType),
    status: String(v.status),
    make: (v.make as string) || null,
    model: (v.model as string) || null,
    year: v.year != null ? Number(v.year) : null,
    testExpiryDate: v.testExpiryDate ? String(v.testExpiryDate) : null,
    liftingInspectionExpiry: v.liftingInspectionExpiry ? String(v.liftingInspectionExpiry) : null,
    compulsoryInsurance: v.compulsoryInsurance != null ? Number(v.compulsoryInsurance) : null,
    thirdPartyInsurance: v.thirdPartyInsurance != null ? Number(v.thirdPartyInsurance) : null,
    insuranceValidUntil: v.insuranceValidUntil ? String(v.insuranceValidUntil) : null,
    towingValidUntil: v.towingValidUntil ? String(v.towingValidUntil) : null,
    windshieldInsurance: v.windshieldInsurance != null ? Number(v.windshieldInsurance) : null,
    registeredTo: (v.registeredTo as string) || null,
    agentPhone: (v.agentPhone as string) || null,
    notes: (v.notes as string) || null,
    displayNotes: (v.displayNotes as string) || null,
    ownership: (v.ownership as VehicleOwnership) || "COMPANY",
    isActive: v.isActive !== false,
  };
}

function alertClass(alert: ReturnType<typeof vehicleRowAlert>) {
  if (alert === "sold") return "border-danger/50";
  if (alert === "expired") return "border-orange-400";
  if (alert === "warning") return "border-amber-300";
  return "";
}

export function FleetPageClient({
  initialVehicles,
  embedded,
}: {
  initialVehicles: VehicleRow[];
  embedded?: boolean;
}) {
  const [vehicles, setVehicles] = useState(initialVehicles.map((v) => normalizeVehicle(v as unknown as Record<string, unknown>)));
  const [machines, setMachines] = useState<MachineryRow[]>([]);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [addKind, setAddKind] = useState<"choose" | "vehicle" | "machine" | null>(null);
  const [vehicleModal, setVehicleModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<VehicleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [machineForm, setMachineForm] = useState({ name: "", unitType: "HARVESTER", unitNumber: "" });
  const [editingMachine, setEditingMachine] = useState<MachineryRow | null>(null);
  const [machineModal, setMachineModal] = useState<"add" | "edit" | "view" | null>(null);
  const [machineMsg, setMachineMsg] = useState("");
  const [machineSaving, setMachineSaving] = useState(false);

  const loadVehicles = useCallback(async () => {
    const res = await fetch(`/api/vehicles?all=${showAll}`);
    const data = await res.json();
    if (Array.isArray(data)) setVehicles(data.map(normalizeVehicle));
  }, [showAll]);

  const loadMachines = useCallback(async () => {
    const res = await fetch("/api/machinery-units");
    const data = await res.json();
    if (Array.isArray(data)) setMachines(data);
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const filtered = vehicles.filter(
    (v) =>
      !search ||
      v.licensePlate.includes(search) ||
      v.model?.includes(search) ||
      v.registeredTo?.includes(search) ||
      VEHICLE_TYPE_LABELS[v.vehicleType]?.includes(search) ||
      VEHICLE_OWNERSHIP_LABELS[v.ownership || "COMPANY"]?.includes(search)
  );

  const filteredMachines = machines.filter(
    (m) =>
      !search ||
      m.name.includes(search) ||
      MACHINERY_UNIT_LABELS[m.unitType]?.includes(search) ||
      (m.unitNumber || "").includes(search)
  );

  const saveVehicle = async (data: Record<string, unknown>) => {
    if (!data.ownership) throw new Error("ownership required");
    const url = vehicleModal === "edit" && editing ? `/api/vehicles/${editing.id}` : "/api/vehicles";
    const method = vehicleModal === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("fail");
    const saved = normalizeVehicle(await res.json());
    if (vehicleModal === "add") {
      setVehicles((prev) => [saved, ...prev]);
    } else {
      setVehicles((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
    }
    setAddKind(null);
  };

  const deleteVehicle = async (id: string) => {
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isActive: false, status: "RETIRED" } : v)).filter((v) => showAll || v.isActive)
    );
  };

  const openAddChooser = () => {
    setAddKind("choose");
    setEditing(null);
    setVehicleModal(null);
    setMachineModal(null);
  };

  const startVehicleAdd = () => {
    setAddKind("vehicle");
    setEditing(null);
    setVehicleModal("add");
  };

  const startMachineAdd = () => {
    setAddKind("machine");
    setEditingMachine(null);
    setMachineForm({ name: "", unitType: "HARVESTER", unitNumber: "" });
    setMachineMsg("");
    setMachineModal("add");
  };

  const saveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setMachineSaving(true);
    setMachineMsg("");
    try {
      const url = machineModal === "edit" && editingMachine ? `/api/machinery-units/${editingMachine.id}` : "/api/machinery-units";
      const method = machineModal === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(machineForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setMachineMsg(data.error || "שגיאה");
        return;
      }
      if (machineModal === "add") {
        setMachines((prev) => [...prev, data]);
      } else {
        setMachines((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      }
      setMachineModal(null);
      setAddKind(null);
    } finally {
      setMachineSaving(false);
    }
  };

  const deleteMachine = async (id: string) => {
    const res = await fetch(`/api/machinery-units/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setMachines((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className={embedded ? "" : "min-h-screen gradient-hero"}>
      {!embedded && (
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-4 sm:px-6 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                <CircleDot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-dark">כלי רכב ומכונות</h1>
                <p className="text-xs text-muted">
                  {vehicles.length} רכבים · {machines.length} מכונות
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={openAddChooser}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> הוסף
              </button>
              <button
                onClick={() => {
                  loadVehicles();
                  loadMachines();
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <Link href="/" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
                לוח בקרה
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={embedded ? "space-y-6" : "mx-auto max-w-[1800px] px-4 py-6 sm:px-6 space-y-6"}>
        <div className="flex flex-wrap gap-3 items-center">
          {embedded && (
            <button
              type="button"
              onClick={openAddChooser}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> הוסף חדש
            </button>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש רישוי, דגם, מכונה..."
              className="field-input pr-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            הצג גם נמכרו / לא פעילים
          </label>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-extrabold text-primary-dark">כלי רכב</h3>
          <div className="work-card-grid">
            {filtered.map((v) => {
              const alert = vehicleRowAlert(v);
              return (
                <WorkCardDetail
                  key={v.id}
                  title={v.licensePlate}
                  subtitle={`${VEHICLE_OWNERSHIP_LABELS[v.ownership || "COMPANY"]} · ${VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType}`}
                  fields={[
                    { label: "דגם", value: v.model || v.make || "—" },
                    { label: "סטטוס", value: VEHICLE_STATUS_LABELS[v.status] || v.status },
                    { label: "טסט עד", value: formatDateIL(v.testExpiryDate) || "—" },
                    { label: "ביטוח עד", value: formatDateIL(v.insuranceValidUntil) || "—" },
                    { label: "על שם", value: v.registeredTo || "—" },
                  ]}
                  notes={v.displayNotes || undefined}
                  className={alertClass(alert)}
                  onEdit={() => {
                    setEditing(v);
                    setVehicleModal("edit");
                    setAddKind("vehicle");
                  }}
                  footer={
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingVehicle(v)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                      >
                        <Eye className="h-3 w-3" /> צפייה
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(v.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                      >
                        <Trash2 className="h-3 w-3" /> מחיקה
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
          {filtered.length === 0 && <p className="p-4 text-center text-muted text-sm">לא נמצאו כלי רכב</p>}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-primary-dark">מכונות</h3>
            <button
              type="button"
              onClick={startMachineAdd}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> הוסף מכונה
            </button>
          </div>
          <div className="work-card-grid">
            {filteredMachines.map((m) => (
              <WorkCardDetail
                key={m.id}
                title={m.name}
                subtitle={MACHINERY_UNIT_LABELS[m.unitType] || m.unitType}
                fields={[
                  { label: "מספר יחידה", value: m.unitNumber || "—" },
                  { label: "סוג", value: MACHINERY_UNIT_LABELS[m.unitType] || m.unitType },
                ]}
                onEdit={() => {
                  setEditingMachine(m);
                  setMachineForm({
                    name: m.name,
                    unitType: m.unitType,
                    unitNumber: m.unitNumber || "",
                  });
                  setMachineModal("edit");
                  setAddKind("machine");
                }}
                footer={
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMachine(m);
                        setMachineModal("view");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                    >
                      <Eye className="h-3 w-3" /> צפייה
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`להשבית את המכונה ${m.name}?`)) deleteMachine(m.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                    >
                      <Trash2 className="h-3 w-3" /> מחיקה
                    </button>
                  </div>
                }
              />
            ))}
          </div>
          {filteredMachines.length === 0 && <p className="p-4 text-center text-muted text-sm">אין מכונות — הוסף מכונה חדשה</p>}
        </section>
      </main>

      {addKind === "choose" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddKind(null)} />
          <div className="relative bg-card rounded-2xl border p-6 max-w-sm w-full card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">מה להוסיף?</h3>
              <button type="button" onClick={() => setAddKind(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={startVehicleAdd}
              className="w-full rounded-xl bg-primary py-3 text-white font-extrabold"
            >
              ➕ כלי רכב
            </button>
            <button
              type="button"
              onClick={startMachineAdd}
              className="w-full rounded-xl border border-border py-3 font-extrabold"
            >
              ➕ מכונה
            </button>
          </div>
        </div>
      )}

      <CrudModal
        open={vehicleModal !== null}
        title={vehicleModal === "edit" ? `עריכת ${editing?.licensePlate}` : "הוספת כלי רכב"}
        fields={vehicleFields}
        initial={vehicleModal === "edit" && editing ? serialize(editing) : emptyVehicle()}
        onClose={() => {
          setVehicleModal(null);
          setEditing(null);
          setAddKind(null);
        }}
        onSave={saveVehicle}
      />

      {(machineModal === "add" || machineModal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setMachineModal(null);
              setAddKind(null);
            }}
          />
          <form onSubmit={saveMachine} className="relative bg-card rounded-2xl border p-5 max-w-md w-full card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{machineModal === "edit" ? "עריכת מכונה" : "הוספת מכונה"}</h3>
              <button
                type="button"
                onClick={() => {
                  setMachineModal(null);
                  setAddKind(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              required
              placeholder="שם מכונה"
              value={machineForm.name}
              onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
              className="field-input"
            />
            <select
              required
              value={machineForm.unitType}
              onChange={(e) => setMachineForm({ ...machineForm, unitType: e.target.value })}
              className="field-input"
            >
              {Object.entries(MACHINERY_UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              placeholder="מספר יחידה (אופציונלי)"
              value={machineForm.unitNumber}
              onChange={(e) => setMachineForm({ ...machineForm, unitNumber: e.target.value })}
              className="field-input"
            />
            {machineMsg && <p className="text-sm text-red-600 font-semibold">{machineMsg}</p>}
            <button type="submit" disabled={machineSaving} className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50">
              {machineSaving ? "שומר..." : "שמור מכונה"}
            </button>
          </form>
        </div>
      )}

      {machineModal === "view" && editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMachineModal(null)} />
          <div className="relative bg-card rounded-2xl border p-5 max-w-sm w-full card-shadow space-y-3">
            <h3 className="font-bold text-lg">פרטי מכונה</h3>
            <p className="font-extrabold text-primary-dark">{editingMachine.name}</p>
            <p className="text-sm">{MACHINERY_UNIT_LABELS[editingMachine.unitType] || editingMachine.unitType}</p>
            <p className="text-sm text-muted">מס׳ יחידה: {editingMachine.unitNumber || "—"}</p>
            <button type="button" onClick={() => setMachineModal(null)} className="w-full rounded-xl border py-2 font-bold">
              סגור
            </button>
          </div>
        </div>
      )}

      {viewingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewingVehicle(null)} />
          <div className="relative bg-card rounded-2xl border p-5 max-w-sm w-full card-shadow space-y-2 text-sm">
            <h3 className="font-bold text-lg mb-2">פרטי כלי רכב</h3>
            <p>
              <span className="text-muted">רישוי: </span>
              <strong>{viewingVehicle.licensePlate}</strong>
            </p>
            <p>
              <span className="text-muted">בעלות: </span>
              {VEHICLE_OWNERSHIP_LABELS[viewingVehicle.ownership || "COMPANY"]}
            </p>
            <p>
              <span className="text-muted">סוג: </span>
              {VEHICLE_TYPE_LABELS[viewingVehicle.vehicleType] || viewingVehicle.vehicleType}
            </p>
            <p>
              <span className="text-muted">דגם: </span>
              {viewingVehicle.model || "—"}
            </p>
            <button type="button" onClick={() => setViewingVehicle(null)} className="w-full mt-3 rounded-xl border py-2 font-bold">
              סגור
            </button>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-card rounded-2xl border p-6 max-w-sm w-full card-shadow">
            <h3 className="font-bold text-lg mb-2">מחיקת כלי רכב?</h3>
            <p className="text-sm text-muted mb-4">הכלי יסומן כלא פעיל. ניתן לשחזר בעריכה.</p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteVehicle(deleteId)}
                className="flex-1 bg-danger text-white rounded-xl py-2 font-semibold"
              >
                מחק
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border rounded-xl py-2">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
