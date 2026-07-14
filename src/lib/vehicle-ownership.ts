/** Vehicle ownership stored in notes tag — no schema migration. */

export type VehicleOwnership = "COMPANY" | "CONTRACTOR";

const OWNERSHIP_PREFIX = "__ownership:";
const OWNERSHIP_SUFFIX = "__";

export const VEHICLE_OWNERSHIP_LABELS: Record<VehicleOwnership, string> = {
  COMPANY: "רכב חברה",
  CONTRACTOR: "רכב קבלן",
};

export function encodeOwnershipInNotes(
  ownership: VehicleOwnership | string | null | undefined,
  notes: string | null | undefined
): string | null {
  const text = stripOwnershipFromNotes(notes) || "";
  const own = ownership === "CONTRACTOR" ? "CONTRACTOR" : ownership === "COMPANY" ? "COMPANY" : null;
  if (!own) return text || null;
  const tag = `${OWNERSHIP_PREFIX}${own}${OWNERSHIP_SUFFIX}`;
  return text ? `${tag}\n${text}` : tag;
}

export function parseOwnershipFromNotes(notes: string | null | undefined): VehicleOwnership {
  if (!notes) return "COMPANY";
  const match = notes.match(/__ownership:(COMPANY|CONTRACTOR)__/);
  return match?.[1] === "CONTRACTOR" ? "CONTRACTOR" : "COMPANY";
}

export function stripOwnershipFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes
    .replace(/__ownership:(COMPANY|CONTRACTOR)__\n?/g, "")
    .trim();
  return cleaned || null;
}

export function withOwnershipField<T extends { notes?: string | null }>(vehicle: T) {
  return {
    ...vehicle,
    ownership: parseOwnershipFromNotes(vehicle.notes),
    displayNotes: stripOwnershipFromNotes(vehicle.notes),
  };
}
