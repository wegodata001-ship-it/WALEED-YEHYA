/** Extra farmer fields stored in notes tags — no schema migration. */

const PHONE2_RE = /(?:^|\s)__phone2:([^_\n]+?)__(?=\s|$)/;
const CONTACT_RE = /(?:^|\s)__contact:([^_\n]+?)__(?=\s|$)/;
const MOSHAV_IDS_RE = /(?:^|\s)__moshav_ids:([a-zA-Z0-9,_-]+)__(?=\s|$)/;

function stripTag(notes: string | null | undefined, re: RegExp): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(re, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned || null;
}

export function parsePhone2FromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(PHONE2_RE);
  return m?.[1]?.trim() || null;
}

export function parseContactFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(CONTACT_RE);
  return m?.[1]?.trim() || null;
}

export function parseMoshavIdsFromNotes(notes: string | null | undefined): string[] {
  if (!notes) return [];
  const m = notes.match(MOSHAV_IDS_RE);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function stripFarmerMetaFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  let n = notes;
  n = stripTag(n, PHONE2_RE) || "";
  n = stripTag(n, CONTACT_RE) || "";
  n = stripTag(n, MOSHAV_IDS_RE) || "";
  return n.trim() || null;
}

export function upsertFarmerMetaInNotes(
  notes: string | null | undefined,
  meta: {
    phone2?: string | null;
    contact?: string | null;
    moshavIds?: string[] | null;
    /** When true, omit keys that are `undefined` preserve existing values */
    preserveUnset?: boolean;
  }
): string | null {
  const preserve = meta.preserveUnset !== false;
  const phone2 = meta.phone2 !== undefined ? meta.phone2 : preserve ? parsePhone2FromNotes(notes) : null;
  const contact = meta.contact !== undefined ? meta.contact : preserve ? parseContactFromNotes(notes) : null;
  const moshavIds =
    meta.moshavIds !== undefined ? meta.moshavIds : preserve ? parseMoshavIdsFromNotes(notes) : null;

  const base = stripFarmerMetaFromNotes(notes) || "";
  const tags: string[] = [];
  if (phone2?.trim()) tags.push(`__phone2:${phone2.trim()}__`);
  if (contact?.trim()) tags.push(`__contact:${contact.trim()}__`);
  if (moshavIds && moshavIds.length > 0) {
    const unique = Array.from(new Set(moshavIds.filter(Boolean)));
    if (unique.length) tags.push(`__moshav_ids:${unique.join(",")}__`);
  }
  const joined = [...(base ? [base] : []), ...tags].join(" ").trim();
  return joined || null;
}

export function withFarmerMetaFields<T extends { notes?: string | null }>(farmer: T) {
  return {
    ...farmer,
    phone2: parsePhone2FromNotes(farmer.notes),
    contactPerson: parseContactFromNotes(farmer.notes),
    linkedMoshavIds: parseMoshavIdsFromNotes(farmer.notes),
    displayNotes: stripFarmerMetaFromNotes(farmer.notes),
  };
}
