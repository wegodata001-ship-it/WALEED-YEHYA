export function formatDateIL(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("he-IL");
}

export function toInputDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export function daysUntil(d: string | Date | null | undefined) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type RowAlert = "sold" | "expired" | "warning" | "ok";

export function vehicleRowAlert(v: {
  status: string;
  notes?: string | null;
  testExpiryDate?: string | Date | null;
  insuranceValidUntil?: string | Date | null;
  liftingInspectionExpiry?: string | Date | null;
}): RowAlert {
  if (v.status === "RETIRED" || v.notes?.includes("נמכר")) return "sold";
  const dates = [v.testExpiryDate, v.insuranceValidUntil, v.liftingInspectionExpiry];
  for (const d of dates) {
    const days = daysUntil(d);
    if (days !== null && days < 0) return "expired";
  }
  for (const d of dates) {
    const days = daysUntil(d);
    if (days !== null && days <= 30) return "warning";
  }
  return "ok";
}

export function rowAlertClass(alert: RowAlert) {
  switch (alert) {
    case "sold": return "bg-red-50";
    case "expired": return "bg-orange-50";
    case "warning": return "bg-yellow-50";
    default: return "hover:bg-background/60";
  }
}
