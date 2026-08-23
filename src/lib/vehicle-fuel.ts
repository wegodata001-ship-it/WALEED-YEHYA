const FUEL_TAG_RE = /(?:^|\s)__fuel_liters:(-?\d+(?:\.\d+)?)__(?=\s|$)/;

export function parseFuelLitersFromNotes(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const m = notes.match(FUEL_TAG_RE);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function stripFuelLitersFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return notes ?? null;
  const stripped = notes.replace(FUEL_TAG_RE, " ").replace(/\s{2,}/g, " ").trim();
  return stripped || null;
}

export function upsertFuelLitersInNotes(notes: string | null | undefined, liters: number | null): string | null {
  const base = stripFuelLitersFromNotes(notes);
  if (liters == null || !Number.isFinite(liters)) return base;
  const tag = `__fuel_liters:${Number(liters).toFixed(1)}__`;
  return base ? `${base} ${tag}` : tag;
}

