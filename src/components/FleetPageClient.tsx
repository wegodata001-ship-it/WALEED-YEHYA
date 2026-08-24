"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleDot, Eye, Plus, Trash2, RefreshCw, Search, X, Pencil } from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { InlineLoader } from "@/components/ui/SmallLoader";
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
  fuelLiters?: number | null;
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
  vehicleId?: string | null;
  vehicleLicensePlate?: string | null;
  vehicleFuelLiters?: number | null;
  isActive?: boolean;
};

type TypeFilter = "all" | "COMPANY" | "CONTRACTOR" | "MACHINE";

type FuelTx = {
  id: string;
  transactionDate: string;
  liters: number;
  transactionType: string;
  source: { name: string } | null;
  operator: { firstName: string; lastName: string } | null;
};

type UnifiedRow =
  | {
      key: string;
      kind: "vehicle";
      typeLabel: string;
      name: string;
      number: string;
      statusLabel: string;
      vehicle: VehicleRow;
    }
  | {
      key: string;
      kind: "machine";
      typeLabel: string;
      name: string;
      number: string;
      statusLabel: string;
      machine: MachineryRow;
    };

const emptyVehicle = (): Record<string, unknown> => ({
  licensePlate: "",
  vehicleType: "TRACTOR",
  ownership: "COMPANY",
  status: "ACTIVE",
  make: "",
  model: "",
  year: "",
  fuelLiters: "",
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
  { key: "vehicleType", label: "סוג כלי", type: "select" as const, required: true, options: Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "customVehicleType", label: "שם סוג חדש (כשנבחר אחר)", },
  { key: "model", label: "דגם", required: true },
  { key: "make", label: "יצרן" },
  { key: "year", label: "שנת ייצור", type: "number" as const },
  { key: "fuelLiters", label: "דלק נוכחי (ל׳)", type: "number" as const },
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

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "COMPANY", label: "רכבי חברה" },
  { id: "CONTRACTOR", label: "רכבי קבלן" },
  { id: "MACHINE", label: "מכונות" },
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
    fuelLiters: v.fuelLiters ?? "",
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
    fuelLiters: v.fuelLiters != null ? Number(v.fuelLiters) : null,
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

export function FleetPageClient({
  initialVehicles,
  embedded,
}: {
  initialVehicles: VehicleRow[];
  embedded?: boolean;
}) {
  const [vehicles, setVehicles] = useState(
    initialVehicles.map((v) => normalizeVehicle(v as unknown as Record<string, unknown>))
  );
  const [machines, setMachines] = useState<MachineryRow[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAll, setShowAll] = useState(true);
  const [addKind, setAddKind] = useState<"choose" | "vehicle" | "machine" | null>(null);
  const [vehicleModal, setVehicleModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<VehicleRow | null>(null);
  const [fuelHistoryTarget, setFuelHistoryTarget] = useState<{ vehicleId: string; label: string } | null>(null);
  const [fuelHistoryTx, setFuelHistoryTx] = useState<FuelTx[]>([]);
  const [fuelHistoryLoading, setFuelHistoryLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMachineId, setDeleteMachineId] = useState<string | null>(null);
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
    const res = await fetch(`/api/machinery-units?all=${showAll}`);
    const data = await res.json();
    if (Array.isArray(data)) setMachines(data);
  }, [showAll]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  useEffect(() => {
    if (!fuelHistoryTarget) return;
    const ac = new AbortController();
    setFuelHistoryLoading(true);
    fetch(`/api/fuel?limit=120&vehicleId=${encodeURIComponent(fuelHistoryTarget.vehicleId)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFuelHistoryTx(
            data.map((t: FuelTx & { liters: unknown }) => ({
              ...t,
              liters: Number(t.liters),
            }))
          );
        } else {
          setFuelHistoryTx([]);
        }
      })
      .catch(() => {})
      .finally(() => setFuelHistoryLoading(false));
    return () => ac.abort();
  }, [fuelHistoryTarget]);

  const rows: UnifiedRow[] = useMemo(() => {
    const term = search.trim();
    const vehicleRows: UnifiedRow[] = vehicles
      .filter((v) => {
        if (typeFilter === "MACHINE") return false;
        if (typeFilter === "COMPANY" && (v.ownership || "COMPANY") !== "COMPANY") return false;
        if (typeFilter === "CONTRACTOR" && v.ownership !== "CONTRACTOR") return false;
        if (!term) return true;
        return (
          v.licensePlate.includes(term) ||
          !!v.model?.includes(term) ||
          !!v.make?.includes(term) ||
          !!v.registeredTo?.includes(term) ||
          !!VEHICLE_TYPE_LABELS[v.vehicleType]?.includes(term) ||
          !!VEHICLE_OWNERSHIP_LABELS[v.ownership || "COMPANY"]?.includes(term)
        );
      })
      .map((v) => ({
        key: `v-${v.id}`,
        kind: "vehicle" as const,
        typeLabel: VEHICLE_OWNERSHIP_LABELS[v.ownership || "COMPANY"],
        name: v.model || v.make || VEHICLE_TYPE_LABELS[v.vehicleType] || "רכב",
        number: v.licensePlate,
        statusLabel: VEHICLE_STATUS_LABELS[v.status] || v.status,
        vehicle: v,
      }));

    const machineRows: UnifiedRow[] = machines
      .filter((m) => {
        if (typeFilter === "COMPANY" || typeFilter === "CONTRACTOR") return false;
        if (!showAll && m.isActive === false) return false;
        if (!term) return true;
        return (
          m.name.includes(term) ||
          !!MACHINERY_UNIT_LABELS[m.unitType]?.includes(term) ||
          (m.unitNumber || "").includes(term)
        );
      })
      .map((m) => ({
        key: `m-${m.id}`,
        kind: "machine" as const,
        typeLabel: "מכונה",
        name: m.name,
        number: m.unitNumber || "—",
        statusLabel: m.isActive === false ? "לא פעילה" : "פעילה",
        machine: m,
      }));

    return [...vehicleRows, ...machineRows];
  }, [vehicles, machines, search, typeFilter, showAll]);

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

  const deleteVehicle = async (id: string, mode: "archive" | "hard" = "archive") => {
    if (mode === "hard" && !confirm("מחיקה לצמיתות של כלי הרכב?")) return;
    const res = await fetch(`/api/vehicles/${id}?mode=${mode}`, { method: "DELETE" });
    if (!res.ok) return;
    setDeleteId(null);
    if (mode === "hard") {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      return;
    }
    setVehicles((prev) =>
      prev
        .map((v) => (v.id === id ? { ...v, isActive: false, status: "RETIRED" } : v))
        .filter((v) => showAll || v.isActive)
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
      const url =
        machineModal === "edit" && editingMachine
          ? `/api/machinery-units/${editingMachine.id}`
          : "/api/machinery-units";
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
        setMachines((prev) => [...prev, { ...data, isActive: true }]);
      } else {
        setMachines((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
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
    setDeleteMachineId(null);
    if (showAll) {
      setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: false } : m)));
    } else {
      setMachines((prev) => prev.filter((m) => m.id !== id));
    }
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
                <h1 className="text-lg font-bold text-primary-dark">כלי רכב</h1>
                <p className="text-xs text-muted">
                  {vehicles.filter((v) => v.isActive).length} רכבים · {machines.filter((m) => m.isActive !== false).length}{" "}
                  מכונות
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={openAddChooser}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> הוסף
              </button>
              <button
                type="button"
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

      <main className={embedded ? "space-y-4" : "mx-auto max-w-[1800px] px-4 py-6 sm:px-6 space-y-4"}>
        <div className="flex flex-wrap gap-3 items-center">
          {embedded && (
            <button
              type="button"
              onClick={openAddChooser}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> הוסף
            </button>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש שם / מספר / סוג..."
              className="field-input pr-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            הצג גם לא פעילים
          </label>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="סינון סוג ציוד">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={typeFilter === f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                typeFilter === f.id
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
          <table className="w-full min-w-[720px] text-sm text-right">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted">
                <th className="px-3 py-2.5 font-bold">סוג</th>
                <th className="px-3 py-2.5 font-bold">שם</th>
                <th className="px-3 py-2.5 font-bold">מספר</th>
                <th className="px-3 py-2.5 font-bold">דלק נוכחי</th>
                <th className="px-3 py-2.5 font-bold">סטטוס</th>
                <th className="px-3 py-2.5 font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{row.typeLabel}</td>
                  <td className="px-3 py-2.5 font-bold text-primary-dark">{row.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.number}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {row.kind === "vehicle" ? (
                      row.vehicle.fuelLiters != null ? (
                        <span className={Number(row.vehicle.fuelLiters) < 15 ? "text-danger" : ""}>
                          {Number(row.vehicle.fuelLiters).toFixed(0)} ל׳
                        </span>
                      ) : (
                        "—"
                      )
                    ) : row.machine.vehicleFuelLiters != null ? (
                      <span className={Number(row.machine.vehicleFuelLiters) < 15 ? "text-danger" : ""}>
                        {Number(row.machine.vehicleFuelLiters).toFixed(0)} ל׳
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">{row.statusLabel}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2 justify-end">
                      {row.kind === "vehicle" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setViewingVehicle(row.vehicle)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                          >
                            <Eye className="h-3 w-3" /> צפייה
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFuelHistoryTarget({
                                vehicleId: row.vehicle.id,
                                label: `${row.vehicle.licensePlate}${row.vehicle.model ? ` · ${row.vehicle.model}` : ""}`,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                          >
                            <CircleDot className="h-3 w-3" /> היסטוריית תדלוקים
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(row.vehicle);
                              setVehicleModal("edit");
                              setAddKind("vehicle");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                          >
                            <Pencil className="h-3 w-3" /> עריכה
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(row.vehicle.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                          >
                            <Trash2 className="h-3 w-3" /> מחיקה
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMachine(row.machine);
                              setMachineModal("view");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                          >
                            <Eye className="h-3 w-3" /> צפייה
                          </button>
                          {row.machine.vehicleId && (
                            <button
                              type="button"
                              onClick={() =>
                                setFuelHistoryTarget({
                                  vehicleId: row.machine.vehicleId as string,
                                  label: `${row.machine.name}${row.machine.vehicleLicensePlate ? ` · ${row.machine.vehicleLicensePlate}` : ""}`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                            >
                              <CircleDot className="h-3 w-3" /> היסטוריית תדלוקים
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMachine(row.machine);
                              setMachineForm({
                                name: row.machine.name,
                                unitType: row.machine.unitType,
                                unitNumber: row.machine.unitNumber || "",
                              });
                              setMachineModal("edit");
                              setAddKind("machine");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                          >
                            <Pencil className="h-3 w-3" /> עריכה
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteMachineId(row.machine.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                          >
                            <Trash2 className="h-3 w-3" /> מחיקה
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-8 text-center text-muted text-sm">לא נמצאו פריטים לפי הסינון</p>
          )}
        </div>

        {typeFilter === "all" && rows.some((r) => r.kind === "vehicle") && (
          <p className="text-[11px] text-muted">
            התראות טסט/ביטוח מוצגות בלשונית טיפולים.{" "}
            {vehicles.filter((v) => vehicleRowAlert(v) === "expired" || vehicleRowAlert(v) === "warning").length >
              0 &&
              `${vehicles.filter((v) => vehicleRowAlert(v) === "expired" || vehicleRowAlert(v) === "warning").length} כלים דורשים תשומת לב.`}
          </p>
        )}
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
              🚗 הוסף כלי רכב
            </button>
            <button
              type="button"
              onClick={startMachineAdd}
              className="w-full rounded-xl border border-border py-3 font-extrabold"
            >
              🚜 הוסף מכונה
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
            <button
              type="submit"
              disabled={machineSaving}
              className="w-full rounded-xl bg-primary py-3 text-white font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {machineSaving ? (
                <>
                  <InlineLoader />
                  שומר...
                </>
              ) : (
                "שמור מכונה"
              )}
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
            <p className="text-sm text-muted">
              דלק נוכחי:{" "}
              <span className="font-bold text-foreground">
                {editingMachine.vehicleFuelLiters != null ? `${Number(editingMachine.vehicleFuelLiters).toFixed(0)} ל׳` : "—"}
              </span>
            </p>
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
            <p>
              <span className="text-muted">דלק נוכחי: </span>
              <strong>{viewingVehicle.fuelLiters != null ? `${Number(viewingVehicle.fuelLiters).toFixed(0)} ל׳` : "—"}</strong>
            </p>
            <p>
              <span className="text-muted">טסט עד: </span>
              {formatDateIL(viewingVehicle.testExpiryDate) || "—"}
            </p>
            <button type="button" onClick={() => setViewingVehicle(null)} className="w-full mt-3 rounded-xl border py-2 font-bold">
              סגור
            </button>
          </div>
        </div>
      )}

      {fuelHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFuelHistoryTarget(null)} />
          <div className="relative bg-card rounded-2xl border p-5 max-w-lg w-full card-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">היסטוריית תדלוקים</h3>
                <p className="text-sm text-muted">
                  {fuelHistoryTarget.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFuelHistoryTarget(null)}
                className="rounded-lg border px-2 py-1 text-xs font-bold"
              >
                סגור
              </button>
            </div>

            {fuelHistoryLoading ? (
              <div className="py-8 flex justify-center">
                <InlineLoader />
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted">
                    <tr>
                      <th className="p-2 text-right font-bold">תאריך</th>
                      <th className="p-2 text-right font-bold">מקור</th>
                      <th className="p-2 text-right font-bold">ליטרים</th>
                      <th className="p-2 text-right font-bold">עובד</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fuelHistoryTx.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="p-2 whitespace-nowrap">
                          {new Date(t.transactionDate).toLocaleString("he-IL")}
                        </td>
                        <td className="p-2">{t.source?.name || "—"}</td>
                        <td className="p-2 font-bold tabular-nums">{Number(t.liters).toFixed(0)} ל׳</td>
                        <td className="p-2">
                          {t.operator ? `${t.operator.firstName} ${t.operator.lastName || ""}`.trim() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fuelHistoryTx.length === 0 && <p className="p-6 text-center text-muted">אין תדלוקים לרכב זה</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-card rounded-2xl border p-6 max-w-sm w-full card-shadow space-y-3">
            <h3 className="font-bold text-lg">הסרת כלי רכב</h3>
            <p className="text-sm text-muted">ארכיון — יישמר בהיסטוריה ולא יופיע בבחירה. מחיקה — לצמיתות.</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => deleteVehicle(deleteId, "archive")}
                className="w-full bg-amber-600 text-white rounded-xl py-2 font-semibold"
              >
                ארכיון
              </button>
              <button
                type="button"
                onClick={() => deleteVehicle(deleteId, "hard")}
                className="w-full bg-danger text-white rounded-xl py-2 font-semibold"
              >
                מחיקה לצמיתות
              </button>
              <button type="button" onClick={() => setDeleteId(null)} className="w-full border rounded-xl py-2">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMachineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteMachineId(null)} />
          <div className="relative bg-card rounded-2xl border p-6 max-w-sm w-full card-shadow">
            <h3 className="font-bold text-lg mb-2">מחיקת מכונה?</h3>
            <p className="text-sm text-muted mb-4">המכונה תושבת ולא תופיע ברשימות פעילות.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteMachine(deleteMachineId)}
                className="flex-1 bg-danger text-white rounded-xl py-2 font-semibold"
              >
                מחק
              </button>
              <button type="button" onClick={() => setDeleteMachineId(null)} className="flex-1 border rounded-xl py-2">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
