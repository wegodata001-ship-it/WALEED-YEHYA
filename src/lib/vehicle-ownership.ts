/** Vehicle ownership stored in notes tag — no schema migration. */

export type VehicleOwnership = "COMPANY" | "CONTRACTOR";

export type VehicleFuelLiters = number | null;

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
  const fuelMatch = (vehicle.notes || "").match(/(?:^|\s)__fuel_liters:(-?\d+(?:\.\d+)?)__(?=\s|$)/);
  const fuelLiters = fuelMatch ? Number(fuelMatch[1]) : null;
  return {
    ...vehicle,
    ownership: parseOwnershipFromNotes(vehicle.notes),
    fuelLiters: Number.isFinite(fuelLiters as number) ? (fuelLiters as number) : null,
    displayNotes: (() => {
      // Strip both ownership and fuel tags from visible notes (no schema migration).
      const noOwnership = stripOwnershipFromNotes(vehicle.notes);
      if (!noOwnership) return null;
      const cleaned = noOwnership.replace(/(?:^|\s)__fuel_liters:-?\d+(?:\.\d+)?__(?=\s|$)/g, " ").replace(/\s{2,}/g, " ").trim();
      return cleaned || null;
    })(),
  };
}
