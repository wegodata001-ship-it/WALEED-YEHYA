/** Shared date-range parsing for department filters and APIs. */

export type RangeMode = "month" | "day" | "range";

export const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export type DateRangeState = {
  year: number;
  month: number;
  rangeMode: RangeMode;
  day: string;
  from: string;
  to: string;
};

export function defaultDateRange(year = 2024, month = 6): DateRangeState {
  return { year, month, rangeMode: "month", day: "", from: "", to: "" };
}

/** Build query params for APIs that accept year/month/day/from/to. */
export function dateRangeQuery(state: DateRangeState): URLSearchParams {
  const params = new URLSearchParams({
    year: String(state.year),
    month: String(state.month),
  });
  if (state.rangeMode === "day" && state.day) params.set("day", state.day);
  if (state.rangeMode === "range" && state.from && state.to) {
    params.set("from", state.from);
    params.set("to", state.to);
  }
  return params;
}

/** Parse start/end from URLSearchParams (server-side). */
export function parseDateRange(searchParams: URLSearchParams): { start: Date; end: Date; year: number; month: number } {
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const month = Number(searchParams.get("month") || new Date().getMonth() + 1);
  const day = searchParams.get("day");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let start: Date;
  let end: Date;

  if (from && to) {
    start = new Date(from);
    start.setHours(0, 0, 0, 0);
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
    end = new Date(end.getTime() + 1);
  } else if (day) {
    start = new Date(year, month - 1, Number(day));
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
  }

  return { start, end, year, month };
}
