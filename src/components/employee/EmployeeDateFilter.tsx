"use client";

import type { DateRangeState } from "@/lib/dateRange";
import {
  EMPLOYEE_FILTER_LABELS,
  type EmployeeFilterMode,
} from "@/lib/employee-filters";

type Props = {
  mode: EmployeeFilterMode;
  onModeChange: (mode: EmployeeFilterMode) => void;
  rangeState: DateRangeState;
  onRangeStateChange: (state: DateRangeState) => void;
  search?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
};

export function EmployeeDateFilter({
  mode,
  onModeChange,
  rangeState,
  onRangeStateChange,
  search,
  onSearchChange,
  searchPlaceholder = "חיפוש…",
}: Props) {
  const setRange = (patch: Partial<DateRangeState>) =>
    onRangeStateChange({ ...rangeState, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(EMPLOYEE_FILTER_LABELS) as EmployeeFilterMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
              mode === m ? "bg-primary text-white" : "bg-card border border-border text-muted"
            }`}
          >
            {EMPLOYEE_FILTER_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === "month" && (
        <div className="filter-bar">
          <select
            value={rangeState.month}
            onChange={(e) => setRange({ month: Number(e.target.value) })}
            aria-label="חודש"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleDateString("he-IL", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={rangeState.year}
            onChange={(e) => setRange({ year: Number(e.target.value) })}
            aria-label="שנה"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "range" && (
        <div className="filter-bar">
          <input
            type="date"
            value={rangeState.from}
            onChange={(e) => setRange({ from: e.target.value })}
            aria-label="מתאריך"
          />
          <input
            type="date"
            value={rangeState.to}
            onChange={(e) => setRange({ to: e.target.value })}
            aria-label="עד תאריך"
          />
        </div>
      )}

      {onSearchChange != null && (
        <input
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="field-input w-full"
        />
      )}
    </div>
  );
}
