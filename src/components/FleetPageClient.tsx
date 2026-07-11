"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleDot, Plus, Trash2, RefreshCw, Search } from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { WorkCardDetail } from "@/components/WorkCardDetail";
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS } from "@/lib/constants";
import { formatDateIL, toInputDate, vehicleRowAlert } from "@/lib/vehicle-utils";

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
  isActive: boolean;
};

const emptyVehicle = (): Record<string, unknown> => ({
  licensePlate: "",
  vehicleType: "TRACTOR",
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
    notes: v.notes || "",
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
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/vehicles?all=${showAll}`);
    const data = await res.json();
    setVehicles(
      data.map((v: Record<string, unknown>) => ({
        ...v,
        compulsoryInsurance: v.compulsoryInsurance != null ? Number(v.compulsoryInsurance) : null,
        thirdPartyInsurance: v.thirdPartyInsurance != null ? Number(v.thirdPartyInsurance) : null,
        windshieldInsurance: v.windshieldInsurance != null ? Number(v.windshieldInsurance) : null,
        testExpiryDate: v.testExpiryDate ? String(v.testExpiryDate) : null,
        liftingInspectionExpiry: v.liftingInspectionExpiry ? String(v.liftingInspectionExpiry) : null,
        insuranceValidUntil: v.insuranceValidUntil ? String(v.insuranceValidUntil) : null,
        towingValidUntil: v.towingValidUntil ? String(v.towingValidUntil) : null,
      }))
    );
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = vehicles.filter(
    (v) =>
      !search ||
      v.licensePlate.includes(search) ||
      v.model?.includes(search) ||
      v.registeredTo?.includes(search) ||
      VEHICLE_TYPE_LABELS[v.vehicleType]?.includes(search)
  );

  const saveVehicle = async (data: Record<string, unknown>) => {
    const url = modal === "edit" && editing ? `/api/vehicles/${editing.id}` : "/api/vehicles";
    const method = modal === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("fail");
    await load();
  };

  const deleteVehicle = async (id: string) => {
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
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
                <h1 className="text-lg font-bold text-primary-dark">כלי רכב וצי</h1>
                <p className="text-xs text-muted">
                  {vehicles.length} כלים | טסט · ביטוח · הרמה
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditing(null);
                  setModal("add");
                }}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> הוסף כלי
              </button>
              <button
                onClick={load}
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
              onClick={() => {
                setEditing(null);
                setModal("add");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> הוסף כלי רכב
            </button>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש רישוי, דגם, על שם..."
              className="field-input pr-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            הצג גם נמכרו / לא פעילים
          </label>
        </div>

        <div className="work-card-grid">
          {filtered.map((v) => {
            const alert = vehicleRowAlert(v);
            return (
              <WorkCardDetail
                key={v.id}
                title={v.licensePlate}
                subtitle={`${VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType} · ${VEHICLE_STATUS_LABELS[v.status] || v.status}`}
                fields={[
                  { label: "דגם", value: v.model || v.make || "—" },
                  { label: "שנה", value: v.year || "—" },
                  { label: "טסט עד", value: formatDateIL(v.testExpiryDate) || "—" },
                  { label: "ביטוח עד", value: formatDateIL(v.insuranceValidUntil) || "—" },
                  { label: "על שם", value: v.registeredTo || "—" },
                  ...(v.agentPhone ? [{ label: "סוכן", value: v.agentPhone }] : []),
                ]}
                notes={v.notes}
                className={alertClass(alert)}
                onEdit={() => {
                  setEditing(v);
                  setModal("edit");
                }}
                footer={
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => setDeleteId(v.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                    >
                      <Trash2 className="h-3 w-3" /> השבת / מחק
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-muted">לא נמצאו כלי רכב — הוסף כלי חדש</p>}
      </main>

      <CrudModal
        open={modal !== null}
        title={modal === "edit" ? `עריכת ${editing?.licensePlate}` : "הוספת כלי רכב חדש"}
        fields={vehicleFields}
        initial={modal === "edit" && editing ? serialize(editing) : emptyVehicle()}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        onSave={saveVehicle}
      />

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-card rounded-2xl border p-6 max-w-sm w-full card-shadow">
            <h3 className="font-bold text-lg mb-2">מחיקת כלי רכב?</h3>
            <p className="text-sm text-muted mb-4">הכלי יסומן כלא פעיל / נמכר. ניתן לשחזר בעריכה.</p>
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
