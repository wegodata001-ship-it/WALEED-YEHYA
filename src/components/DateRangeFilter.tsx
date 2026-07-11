"use client";

import type { ReactNode } from "react";
import { HEBREW_MONTHS, type DateRangeState, type RangeMode } from "@/lib/dateRange";

type Props = {
  value: DateRangeState;
  onChange: (next: DateRangeState) => void;
  search?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
};

export function DateRangeFilter({
  value,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder = "חיפוש…",
  children,
}: Props) {
  const set = (patch: Partial<DateRangeState>) => onChange({ ...value, ...patch });

  return (
    <div className="filter-bar">
      <div className="flex rounded-md border border-border overflow-hidden text-sm">
        {(
          [
            ["month", "חודש"],
            ["day", "יום"],
            ["range", "טווח"],
          ] as [RangeMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => set({ rangeMode: mode })}
            className={`px-2.5 py-1.5 font-semibold ${
              value.rangeMode === mode ? "bg-primary text-white" : "bg-card text-muted hover:text-primary-dark"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <select
        value={value.month}
        onChange={(e) => set({ month: Number(e.target.value) })}
        aria-label="חודש"
      >
        {HEBREW_MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={value.year}
        onChange={(e) => set({ year: Number(e.target.value) })}
        aria-label="שנה"
      >
        {[2024, 2025, 2026].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {value.rangeMode === "day" && (
        <select
          value={value.day}
          onChange={(e) => set({ day: e.target.value })}
          aria-label="יום בחודש"
        >
          <option value="">בחר יום</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
      )}

      {value.rangeMode === "range" && (
        <>
          <input
            type="date"
            value={value.from}
            onChange={(e) => set({ from: e.target.value })}
            aria-label="מתאריך"
          />
          <input
            type="date"
            value={value.to}
            onChange={(e) => set({ to: e.target.value })}
            aria-label="עד תאריך"
          />
        </>
      )}

      {onSearchChange != null && (
        <input
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-[160px] flex-1"
        />
      )}

      {children}
    </div>
  );
}
