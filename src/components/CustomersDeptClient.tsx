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

const emptyFarmerForm = () => ({
  firstName: "",
  lastName: "",
  phone: "",
  moshavName: "",
  notes: "",
});

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
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FarmerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(emptyFarmerForm);

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

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyFarmerForm());
    setMsg("");
    setModal("add");
  };

  const openEdit = (f: FarmerRow) => {
    setEditingId(f.id);
    setViewing(null);
    setForm({
      firstName: f.firstName,
      lastName: f.lastName,
      phone: f.phone || "",
      moshavName: f.moshav?.nameHe || f.moshav?.name || "",
      notes: f.notes || "",
    });
    setMsg("");
    setModal("edit");
  };

  const openView = (f: FarmerRow) => {
    setViewing(f);
    setModal("view");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setViewing(null);
    setMsg("");
  };

  const saveFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const url = modal === "edit" && editingId ? `/api/farmers/${editingId}` : "/api/farmers";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה בשמירה");
        return;
      }
      if (modal === "add") {
        setFarmers((prev) => [data, ...prev]);
      } else if (editingId) {
        setFarmers((prev) => prev.map((x) => (x.id === editingId ? data : x)));
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const deleteFarmer = async (id: string) => {
    const res = await fetch(`/api/farmers/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    const data = await res.json();
    setFarmers((prev) => prev.map((x) => (x.id === id ? data : x)));
  };

  const activateFarmer = async (id: string) => {
    const res = await fetch(`/api/farmers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setFarmers((prev) => prev.map((x) => (x.id === id ? data : x)));
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
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              approvalStatus: "APPROVED",
              ...(finalQuantity != null ? { reportedQuantity: finalQuantity } : {}),
            }
          : t
      )
    );
  };

  return (
    <DepartmentLayout
      title="לקוחות"
      subtitle="רישום · עריכה · מחיקה · כרטסת"
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
          form={form}
          setForm={(v) =>
            setForm(
              typeof v === "function"
                ? (v(form) as typeof form)
                : (v as typeof form)
            )
          }
          modal={modal}
          viewing={viewing}
          onOpenAdd={openAdd}
          onOpenEdit={openEdit}
          onOpenView={openView}
          onCloseModal={closeModal}
          onSave={saveFarmer}
          onDelete={deleteFarmer}
          onActivate={activateFarmer}
          saving={saving}
          msg={msg}
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
