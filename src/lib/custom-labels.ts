/** Persist custom free-text labels (vehicle types, quantity units) without schema changes. */

const VEHICLE_TYPE_LABEL_RE = /(?:^|\s)__vehicle_type_label:([^_\n]+?)__(?=\s|$)/;
const UNIT_LABEL_RE = /(?:^|\s)__unitLabel:([^_\n]+?)__(?=\s|$)/;

export function parseVehicleTypeLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(VEHICLE_TYPE_LABEL_RE);
  return m?.[1]?.trim() || null;
}

export function stripVehicleTypeLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(VEHICLE_TYPE_LABEL_RE, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned || null;
}

export function upsertVehicleTypeLabelInNotes(
  notes: string | null | undefined,
  label: string | null | undefined
): string | null {
  const base = stripVehicleTypeLabelFromNotes(notes);
  if (!label?.trim()) return base;
  const tag = `__vehicle_type_label:${label.trim()}__`;
  return base ? `${base} ${tag}` : tag;
}

export function parseUnitLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(UNIT_LABEL_RE);
  return m?.[1]?.trim() || null;
}

export function upsertUnitLabelInNotes(notes: string | null | undefined, label: string | null | undefined): string | null {
  const base = (notes || "").replace(UNIT_LABEL_RE, " ").replace(/\s{2,}/g, " ").trim() || null;
  if (!label?.trim()) return base;
  const tag = `__unitLabel:${label.trim()}__`;
  return base ? `${base}\n${tag}` : tag;
}
