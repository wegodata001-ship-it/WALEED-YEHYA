"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { FuelSection } from "@/components/dept/FuelSection";
import { OpsApprovalsSection } from "@/components/dept/OpsApprovalsSection";
import type { FieldTaskRow, FuelTx, Source } from "@/components/dept/types";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";

const TABS = [
  { id: "fuel", label: "דלק ומלאי" },
  { id: "approvals", label: "משימות ואישורים" },
];

export function OperationsDeptClient() {
  const [tab, setTab] = useState("fuel");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 6));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [fuelTx, setFuelTx] = useState<FuelTx[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [fuelPrices, setFuelPrices] = useState<{ id: string; name: string; pricePerLiter: number | null }[]>([]);
  const [tasks, setTasks] = useState<FieldTaskRow[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<
    { id: string; employee: { firstName: string; lastName: string }; correctionNote: string | null; workDate: string; photoUrl?: string | null }[]
  >([]);
  const [verifiedAttendance, setVerifiedAttendance] = useState<
    { id: string; employee: { firstName: string; lastName: string }; workDate: string; checkIn: string | null; photoUrl: string | null }[]
  >([]);
  const [adjustQty, setAdjustQty] = useState<Record<string, string>>({});
  const [editingFuel, setEditingFuel] = useState<FuelTx | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const [fuelRes, lookupRes, tasksRes, attRes] = await Promise.all([
        fetch(`/api/fuel?limit=500&${dq}`),
        fetch("/api/lookup"),
        fetch(`/api/tasks?${dq}`),
        fetch(`/api/attendance?${dq}`),
      ]);
      const [fuel, lookup, tasksData, attData] = await Promise.all([
        fuelRes.json(),
        lookupRes.json(),
        tasksRes.json(),
        attRes.json(),
      ]);

      if (Array.isArray(fuel)) {
        setFuelTx(
          fuel.map((t: FuelTx & { liters: unknown; totalCost: unknown }) => ({
            ...t,
            liters: Number(t.liters),
            totalCost: t.totalCost != null ? Number(t.totalCost) : null,
            pricePerLiter: t.pricePerLiter != null ? Number(t.pricePerLiter) : null,
          }))
        );
      }
      if (lookup?.fuelSources) {
        setSources(
          lookup.fuelSources.map(
            (s: Source & { currentLevel?: unknown; capacityLiters?: unknown; isActive?: boolean }) => ({
              ...s,
              currentLevel: Number(s.currentLevel ?? 0),
              capacityLiters: s.capacityLiters ? Number(s.capacityLiters) : null,
              isActive: s.isActive !== false,
            })
          )
        );
      }
      setFuelPrices(
        (lookup?.fuelRecipients || [])
          .filter((r: { category: string }) => r.category === "EXTERNAL_CUSTOMER")
          .map((r: { id: string; name: string; pricePerLiter?: number }) => ({
            id: r.id,
            name: r.name,
            pricePerLiter: r.pricePerLiter != null ? Number(r.pricePerLiter) : null,
          }))
      );
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setPendingAttendance(
        (attData.records || []).filter((r: { approvalStatus: string }) => r.approvalStatus === "PENDING")
      );
      setVerifiedAttendance(
        (attData.records || [])
          .filter((r: { photoUrl?: string | null; checkIn?: string | null }) => r.photoUrl && r.checkIn)
          .map((r: { id: string; employee: { firstName: string; lastName: string }; workDate: string; checkIn: string | null; photoUrl: string | null }) => ({
            id: r.id,
            employee: r.employee,
            workDate: r.workDate,
            checkIn: r.checkIn,
            photoUrl: r.photoUrl,
          }))
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredFuel = useMemo(() => {
    const term = q.trim();
    return fuelTx.filter((t) => {
      if (!term) return true;
      return [t.recipient?.name, t.licensePlate, t.vehicle?.licensePlate, t.operator?.firstName, t.source?.name]
        .filter(Boolean)
        .some((v) => String(v).includes(term));
    });
  }, [fuelTx, q]);

  const pendingTasks = tasks.filter((t) => t.approvalStatus === "PENDING" && t.status === "COMPLETED");

  const updatePrice = async (id: string, price: number) => {
    await fetch(`/api/fuel-recipients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerLiter: price }),
    });
    load();
  };

  const approveTask = async (id: string, finalQuantity?: number) => {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action: finalQuantity != null ? "adjust" : "approve",
        finalQuantity,
        approvalStatus: "APPROVED",
      }),
    });
    load();
  };

  const approveAttendance = async (id: string) => {
    await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approvalStatus: "APPROVED" }),
    });
    load();
  };

  return (
    <DepartmentLayout
      title="תפעול"
      subtitle="דלק · משימות שטח · אישורים"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      filter={
        <DateRangeFilter
          value={range}
          onChange={setRange}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="חיפוש רכב / נמען / מקור"
        />
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tab === "fuel" ? (
        <FuelSection
          sources={sources}
          fuel={filteredFuel}
          fuelPrices={fuelPrices}
          onPrice={updatePrice}
          onEdit={setEditingFuel}
          onReload={load}
        />
      ) : (
        <OpsApprovalsSection
          pendingTasks={pendingTasks}
          pendingAttendance={pendingAttendance}
          verifiedAttendance={verifiedAttendance}
          adjustQty={adjustQty}
          setAdjustQty={setAdjustQty}
          onApproveTask={approveTask}
          onApproveAttendance={approveAttendance}
        />
      )}

      {editingFuel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-md rounded-xl bg-card p-5 card-shadow">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold">כרטסת תדלוק</h3>
              <button type="button" onClick={() => setEditingFuel(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">תאריך</dt>
                <dd>{new Date(editingFuel.transactionDate).toLocaleString("he-IL")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">נמען</dt>
                <dd className="font-medium">{editingFuel.recipient?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">רכב</dt>
                <dd>{editingFuel.licensePlate || editingFuel.vehicle?.licensePlate || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">ליטרים</dt>
                <dd className="font-bold">{editingFuel.liters}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">עלות</dt>
                <dd>₪{Number(editingFuel.totalCost || 0).toFixed(0)}</dd>
              </div>
            </dl>
            {editingFuel.meterPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editingFuel.meterPhotoUrl} alt="מונה" className="mt-3 w-full h-36 object-cover rounded-lg" />
            )}
          </div>
        </div>
      )}
    </DepartmentLayout>
  );
}
