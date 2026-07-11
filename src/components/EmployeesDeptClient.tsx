"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DepartmentLayout } from "@/components/DepartmentLayout";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EmployeesRegisterSection, EmployeesCardSection } from "@/components/dept/EmployeesSections";
import type { DayRow, Employee } from "@/components/dept/types";
import { dateRangeQuery, defaultDateRange, type DateRangeState } from "@/lib/dateRange";

const TABS = [
  { id: "register", label: "רישום ועריכה" },
  { id: "card", label: "כרטסת שעות" },
];

export function EmployeesDeptClient() {
  const [tab, setTab] = useState("register");
  const [range, setRange] = useState<DateRangeState>(defaultDateRange(2024, 6));
  const [q, setQ] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<
    { id: string; employee: { firstName: string; lastName: string }; correctionNote: string | null; workDate: string }[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);
  const [empForm, setEmpForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    position: "",
    role: "FIELD_OPERATOR",
    password: "1234",
    salaryType: "HOURLY",
    hourlyRate: "45",
    monthlySalary: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dq = dateRangeQuery(range).toString();
      const [empRes, empListRes, attRes] = await Promise.all([
        fetch(`/api/reports/employees?${dq}`),
        fetch("/api/employees"),
        fetch(`/api/attendance?${dq}`),
      ]);
      const [empReport, empList, attData] = await Promise.all([
        empRes.json(),
        empListRes.json(),
        attRes.json(),
      ]);
      setDays(empReport.days || []);
      setPendingAttendance(
        (attData.records || []).filter((r: { approvalStatus: string }) => r.approvalStatus === "PENDING")
      );
      if (Array.isArray(empList)) {
        setEmployees(
          empList.map((e: Employee & { hourlyRate?: unknown; monthlySalary?: unknown }) => ({
            ...e,
            hourlyRate: e.hourlyRate != null ? Number(e.hourlyRate) : null,
            monthlySalary: e.monthlySalary != null ? Number(e.monthlySalary) : null,
          }))
        );
      } else {
        setEmployees(empReport.employees || []);
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

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
    return employees.filter((e) => `${e.firstName} ${e.lastName} ${e.position || ""}`.includes(term));
  }, [employees, q]);

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...empForm,
        hourlyRate: empForm.salaryType === "HOURLY" ? Number(empForm.hourlyRate) : null,
        monthlySalary: empForm.salaryType === "MONTHLY" ? Number(empForm.monthlySalary) : null,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      load();
    }
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
      title="עובדים"
      subtitle="רישום · כרטסת שעות · נוכחות"
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
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tab === "register" ? (
        <EmployeesRegisterSection
          employees={filteredEmployees}
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          form={empForm as Record<string, string>}
          setForm={(v) =>
            setEmpForm(
              typeof v === "function"
                ? (v(empForm as Record<string, string>) as typeof empForm)
                : (v as typeof empForm)
            )
          }
          onAdd={addEmployee}
          onOpenEmployee={() => setTab("card")}
        />
      ) : (
        <EmployeesCardSection
          days={filteredDays}
          pendingAttendance={pendingAttendance}
          onApproveAttendance={approveAttendance}
          onOpenEmployee={(name) => setQ(name)}
        />
      )}
    </DepartmentLayout>
  );
}
