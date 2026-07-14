/** Planned vs actual quantity — shared for schedule UI and future reports. */

export type QuantityCompletionStatus = "FULL" | "PARTIAL" | "OVER" | "PENDING";

export const QUANTITY_COMPLETION_LABELS: Record<QuantityCompletionStatus, string> = {
  FULL: "🟢 הושלם",
  PARTIAL: "🟠 בטיפול",
  OVER: "🔵 בוצע מעבר לתכנון",
  PENDING: "🟡 ממתין",
};

/** Emoji/dot prefix for manager cards */
export const QUANTITY_COMPLETION_PREFIX: Record<QuantityCompletionStatus, string> = {
  FULL: "🟢",
  PARTIAL: "🟠",
  OVER: "🔵",
  PENDING: "🟡",
};

export type QuantityComparison = {
  planned: number;
  reported: number | null;
  remaining: number | null;
  /** reported / planned * 100 when planned > 0 and reported set */
  completionPct: number | null;
  status: QuantityCompletionStatus;
  isHours: boolean;
};

export function compareTaskQuantities(
  plannedRaw: number | null | undefined,
  reportedRaw: number | null | undefined,
  quantityUnit?: string | null
): QuantityComparison {
  const planned = Number(plannedRaw ?? 0);
  const reported =
    reportedRaw != null && Number.isFinite(Number(reportedRaw)) ? Number(reportedRaw) : null;
  const isHours = quantityUnit === "HOUR";

  if (reported == null) {
    return {
      planned,
      reported: null,
      remaining: null,
      completionPct: null,
      status: "PENDING",
      isHours,
    };
  }

  const remaining = Math.round((planned - reported) * 1000) / 1000;
  const eps = 0.01;
  let status: QuantityCompletionStatus;
  if (Math.abs(remaining) <= eps) status = "FULL";
  else if (reported > planned + eps) status = "OVER";
  else status = "PARTIAL";

  const completionPct =
    planned > 0 ? Math.round((reported / planned) * 1000) / 10 : reported === 0 ? 0 : null;

  return { planned, reported, remaining, completionPct, status, isHours };
}

export function quantityFieldLabels(isHours: boolean) {
  if (isHours) {
    return {
      planned: "שעות מתוכננות",
      reported: "שעות שבוצעו",
      remaining: "נותר",
      excess: "עודף",
    };
  }
  return {
    planned: "כמות מתוכננת",
    reported: "כמות שבוצעה",
    remaining: "יתרה",
    excess: "עודף",
  };
}

export function formatQtyWithUnit(qty: number, unitLabel: string) {
  return `${qty.toLocaleString("he-IL")} ${unitLabel}`.trim();
}
