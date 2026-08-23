"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { SmallLoader } from "@/components/ui/SmallLoader";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import {
  EmployeesRegisterSection,
  EmployeesCardSection,
  emptyEmployeeForm,
} from "@/components/dept/EmployeesSections";
import type { DayRow, Employee } from "@/components/dept/types";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";

const TABS = [
  { id: "register", label: "רישום ועריכה" },
  { id: "card", label: "כרטסת שעות" },
];

function normalizeEmployee(e: Employee & { hourlyRate?: unknown; monthlySalary?: unknown }): Employee {
  return {
    ...e,
    hourlyRate: e.hourlyRate != null ? Number(e.hourlyRate) : null,
    monthlySalary: e.monthlySalary != null ? Number(e.monthlySalary) : null,
    isActive: e.isActive !== false,
  };
}

export function EmployeesDeptClient() {
  const [tab, setTab] = useState("register");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 6));
  const [q, setQ] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeShifts, setActiveShifts] = useState<Record<string, string>>({});
  const [days, setDays] = useState<DayRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<
    { id: string; employee: { firstName: string; lastName: string }; correctionNote: string | null; workDate: string; photoUrl?: string | null }[]
  >([]);
  const [verifiedAttendance, setVerifiedAttendance] = useState<
    {
      id: string;
      employee: { firstName: string; lastName: string };
      workDate: string;
      checkIn: string | null;
      checkOut: string | null;
      gpsLat: number | null;
      gpsLng: number | null;
      checkOutGps?: { lat: number; lng: number } | null;
    }[]
  >([]);
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [empForm, setEmpForm] = useState(emptyEmployeeForm);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const opts = signal ? { signal } : {};
      const [empRes, empListRes, attRes, activeRes] = await Promise.all([
        fetch(`/api/reports/employees?${dq}`, opts),
        fetch("/api/employees", opts),
        fetch(`/api/attendance?${dq}`, opts),
        fetch("/api/attendance/active", opts),
      ]);
      const [empReport, empList, attData, activeData] = await Promise.all([
        empRes.json(),
        empListRes.json(),
        attRes.json(),
        activeRes.json(),
      ]);
      setDays(empReport.days || []);
      setPendingAttendance(
        (attData.records || []).filter((r: { approvalStatus: string }) => r.approvalStatus === "PENDING")
      );
      setVerifiedAttendance(
        (attData.records || [])
          .filter(
            (r: { gpsLat?: number | null; checkIn?: string | null }) =>
              r.checkIn && r.gpsLat != null
          )
          .map(
            (r: {
              id: string;
              employee: { firstName: string; lastName: string };
              workDate: string;
              checkIn: string | null;
              checkOut: string | null;
              gpsLat: number | null;
              gpsLng: number | null;
              checkOutGps?: { lat: number; lng: number } | null;
            }) => ({
              id: r.id,
              employee: r.employee,
              workDate: r.workDate,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              gpsLat: r.gpsLat,
              gpsLng: r.gpsLng,
              checkOutGps: r.checkOutGps,
            })
          )
      );
      if (Array.isArray(empList)) {
        setEmployees(empList.map(normalizeEmployee));
      } else {
        setEmployees((empReport.employees || []).map(normalizeEmployee));
      }

      const map: Record<string, string> = {};
      for (const r of activeData?.records || []) {
        if (r?.employeeId && r?.checkIn) map[String(r.employeeId)] = String(r.checkIn);
      }
      setActiveShifts(map);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  // Keep shift status near-real-time without manual refresh.
  useEffect(() => {
    const ac = new AbortController();
    const refresh = async () => {
      try {
        const res = await fetch("/api/attendance/active", { signal: ac.signal });
        const data = await res.json();
        if (!res.ok) return;
        const map: Record<string, string> = {};
        for (const r of data?.records || []) {
          if (r?.employeeId && r?.checkIn) map[String(r.employeeId)] = String(r.checkIn);
        }
        setActiveShifts(map);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = setInterval(refresh, 8_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      ac.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const filteredDays = useMemo(() => {
    const term = q.trim();
    return days.filter((d) => {
      if (employeeFilter && d.employeeId !== employeeFilter && d.employeeName !== employeeFilter) return false;
      if (!term) return true;
      return [d.employeeName, d.settlement, d.customerName, d.plotName].some((v) => v?.includes(term));
    });
  }, [days, q, employeeFilter]);

  const filteredEmployees = useMemo(() => {
    const term = q.trim();
    if (!term) return employees;
    return employees.filter((e) => `${e.firstName} ${e.lastName} ${e.position || ""} ${e.phone || ""}`.includes(term));
  }, [employees, q]);

  const openAdd = () => {
    setEditingId(null);
    setEmpForm(emptyEmployeeForm());
    setMsg("");
    setModal("add");
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setViewing(null);
    setEmpForm({
      firstName: e.firstName,
      lastName: e.lastName,
      phone: e.phone || "",
      position: e.position || "",
      role: e.user?.role || "FIELD_OPERATOR",
      password: "",
      salaryType: e.salaryType === "MONTHLY" ? "MONTHLY" : "HOURLY",
      hourlyRate: e.hourlyRate != null ? String(e.hourlyRate) : "45",
      monthlySalary: e.monthlySalary != null ? String(e.monthlySalary) : "",
    });
    setMsg("");
    setModal("edit");
  };

  const openView = (e: Employee) => {
    setViewing(e);
    setModal("view");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setViewing(null);
    setMsg("");
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        ...empForm,
        hourlyRate: empForm.salaryType === "HOURLY" ? Number(empForm.hourlyRate) : null,
        monthlySalary: empForm.salaryType === "MONTHLY" ? Number(empForm.monthlySalary) : null,
        ...(modal === "edit" && !empForm.password ? { password: undefined } : {}),
      };
      const url = modal === "edit" && editingId ? `/api/employees/${editingId}` : "/api/employees";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "שגיאה בשמירה");
        return;
      }
      const row = normalizeEmployee(modal === "add" ? { ...data.employee, user: data.user } : data);
      if (modal === "add") {
        setEmployees((prev) => [row, ...prev]);
      } else if (editingId) {
        setEmployees((prev) => prev.map((x) => (x.id === editingId ? row : x)));
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    const data = await res.json();
    setEmployees((prev) => prev.map((x) => (x.id === id ? normalizeEmployee(data) : x)));
  };

  const approveAttendance = async (id: string) => {
    await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approvalStatus: "APPROVED" }),
    });
    setPendingAttendance((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <DepartmentLayout
      title="עובדים"
      subtitle="רישום · עריכה · מחיקה · כרטסת שעות"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      filter={
        <DateRangeFilter
          value={range}
          onChange={setRange}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="חיפוש עובד / לקוח / חלקה"
        >
          {tab === "card" && (
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">כל העובדים</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          )}
        </DateRangeFilter>
      }
    >
      {loading ? (
        <SmallLoader />
      ) : tab === "register" ? (
        <EmployeesRegisterSection
          employees={filteredEmployees}
          activeShifts={activeShifts}
          form={empForm}
          setForm={(v) =>
            setEmpForm(
              typeof v === "function"
                ? (v(empForm) as typeof empForm)
                : (v as typeof empForm)
            )
          }
          modal={modal}
          viewing={viewing}
          onOpenAdd={openAdd}
          onOpenEdit={openEdit}
          onOpenView={openView}
          onCloseModal={closeModal}
          onSave={saveEmployee}
          onDelete={deleteEmployee}
          saving={saving}
          msg={msg}
        />
      ) : (
        <EmployeesCardSection
          days={filteredDays}
          pendingAttendance={pendingAttendance}
          verifiedAttendance={verifiedAttendance}
          onApproveAttendance={approveAttendance}
          onOpenEmployee={(name) => setQ(name)}
        />
      )}
    </DepartmentLayout>
  );
}
