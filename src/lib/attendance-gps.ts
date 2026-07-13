/** Check-out GPS stored in notes JSON (no schema change). */

export type AttendanceGpsMeta = {
  checkOutGps?: { lat: number; lng: number };
};

export function parseAttendanceGpsMeta(notes: string | null | undefined): AttendanceGpsMeta {
  if (!notes?.trim()) return {};
  try {
    const parsed = JSON.parse(notes) as AttendanceGpsMeta;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // plain text notes
  }
  return {};
}

export function serializeAttendanceGpsMeta(meta: AttendanceGpsMeta, plainNotes?: string | null): string | null {
  const hasGps = meta.checkOutGps != null;
  const text = plainNotes?.trim();
  if (!hasGps && !text) return null;
  if (!hasGps) return text || null;
  return JSON.stringify({ ...meta, ...(text ? { text } : {}) });
}

export function attendancePlainNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as { text?: string };
    if (parsed && typeof parsed === "object" && parsed.text) return parsed.text;
  } catch {
    return notes;
  }
  return null;
}
