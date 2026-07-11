"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { CustomersRegisterSection, CustomersCardSection } from "@/components/dept/CustomersSections";
import type { ClientRow, DayRow, FarmerRow, FieldTaskRow } from "@/components/dept/types";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";

const TABS = [
  { id: "register", label: "רישום ועריכה" },
  { id: "card", label: "כרטסת לקוח" },
];

export function CustomersDeptClient() {
  const [tab, setTab] = useState("register");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 6));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [tasks, setTasks] = useState<FieldTaskRow[]>([]);
  const [adjustQty, setAdjustQty] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    moshavName: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const [farmersRes, clientsRes, empRes, tasksRes] = await Promise.all([
        fetch("/api/farmers"),
        fetch(`/api/reports/clients?${dq}&groupBy=customer`),
        fetch(`/api/reports/employees?${dq}`),
        fetch(`/api/tasks?${dq}`),
      ]);
      const [farmersData, clientsData, empReport, tasksData] = await Promise.all([
        farmersRes.json(),
        clientsRes.json(),
        empRes.json(),
        tasksRes.json(),
      ]);
      setFarmers(Array.isArray(farmersData) ? farmersData : farmersData.farmers || []);
      setClientRows(clientsData.rows || []);
      setDays(empReport.days || []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingTasks = tasks.filter((t) => t.approvalStatus === "PENDING" && t.status === "COMPLETED");

  const filteredFarmers = useMemo(() => {
    const term = q.trim();
    if (!term) return farmers;
    return farmers.filter((f) =>
      `${f.firstName} ${f.lastName} ${f.moshav?.name || ""} ${f.phone || ""}`.includes(term)
    );
  }, [farmers, q]);

  const filteredRows = useMemo(() => {
    const term = q.trim();
    return clientRows.filter((r) => !term || r.customerName.includes(term) || r.settlement.includes(term));
  }, [clientRows, q]);

  const addFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/farmers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ firstName: "", lastName: "", phone: "", moshavName: "", notes: "" });
      load();
    }
  };

  const toggleFarmer = async (id: string, isActive: boolean) => {
    await fetch(`/api/farmers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
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

  return (
    <DepartmentLayout
      title="לקוחות"
      subtitle="רישום בעלי שדה · כרטסת · התחשבנות"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      filter={
        <DateRangeFilter
          value={range}
          onChange={setRange}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="חיפוש לקוח / ישוב"
        />
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tab === "register" ? (
        <CustomersRegisterSection
          farmers={filteredFarmers}
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          form={form as Record<string, string>}
          setForm={(v) =>
            setForm(
              typeof v === "function"
                ? (v(form as Record<string, string>) as typeof form)
                : (v as typeof form)
            )
          }
          onAdd={addFarmer}
          onToggle={toggleFarmer}
        />
      ) : (
        <CustomersCardSection
          rows={filteredRows}
          pendingTasks={pendingTasks}
          adjustQty={adjustQty}
          setAdjustQty={setAdjustQty}
          onApproveTask={approveTask}
          onOpenCustomer={(name) => setQ(name)}
          workDays={days.filter((d) => !q.trim() || d.customerName.includes(q))}
        />
      )}
    </DepartmentLayout>
  );
}
