import type { DateRangeState } from "./dateRange";
import { dateRangeQuery } from "./dateRange";

export type EmployeeFilterMode = "today" | "week" | "month" | "range";

export function getWeekRange(refDate = new Date()): { from: string; to: string } {
  const d = new Date(refDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function buildEmployeeDateQuery(
  mode: EmployeeFilterMode,
  state: DateRangeState
): URLSearchParams {
  const now = new Date();
  if (mode === "today") {
    return new URLSearchParams({
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
      day: String(now.getDate()),
    });
  }
  if (mode === "week") {
    const { from, to } = getWeekRange(now);
    return new URLSearchParams({ from, to });
  }
  if (mode === "month") {
    return dateRangeQuery({ ...state, rangeMode: "month" });
  }
  return dateRangeQuery({ ...state, rangeMode: "range", from: state.from, to: state.to });
}

export const EMPLOYEE_FILTER_LABELS: Record<EmployeeFilterMode, string> = {
  today: "היום",
  week: "השבוע",
  month: "החודש",
  range: "טווח",
};
