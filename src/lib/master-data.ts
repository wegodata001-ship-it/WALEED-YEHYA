/** Shared master-data helpers — normalize & dedupe without schema changes. */

export function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "");
}

/** Stable SKU / key for inventory materials */
export function materialSkuFromName(name: string): string {
  const n = normalizeLabel(name).toLowerCase();
  return `mat:${n}`;
}

export const FIELD_MATERIAL_CATEGORY = "FIELD_MATERIAL";

export function farmerDisplayName(f: { firstName: string; lastName: string }) {
  return normalizeLabel(`${f.firstName} ${f.lastName === "-" ? "" : f.lastName}`);
}

export function splitPersonName(full: string): { firstName: string; lastName: string } {
  const cleaned = normalizeLabel(full);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "-" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
