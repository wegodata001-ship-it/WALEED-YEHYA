/** Helpers for FieldTask metadata without schema changes. */

import type { StoredMediaRef } from "./storage/types";

export type TaskSessionMeta = {
  startedAt?: string;
  completedAt?: string;
  /** @deprecated Legacy public/local URLs — prefer `media` */
  photoUrls?: string[];
  media?: StoredMediaRef[];
  employeeNotes?: string;
  meterReading?: number;
  meterKind?: "odometer_km" | "engine_hours";
};

const VEHICLE_PREFIX = "__vehicle:";
const MATERIAL_PREFIX = "__material:";
const UNIT_LABEL_PREFIX = "__unitLabel:";
const TAG_SUFFIX = "__";

export function getTaskMedia(meta: TaskSessionMeta): StoredMediaRef[] {
  if (meta.media && meta.media.length > 0) return meta.media;
  return (meta.photoUrls || []).map((url) => ({
    path: url,
    kind: "image" as const,
    mimeType: "image/jpeg",
  }));
}

export function encodeVehicleInDescription(vehiclePlate: string | null | undefined, notes: string | null | undefined) {
  return encodeTaskDescription({ vehiclePlate, notes });
}

export function encodeTaskDescription(params: {
  vehiclePlate?: string | null;
  material?: string | null;
  unitLabel?: string | null;
  notes?: string | null;
}): string | null {
  const parts: string[] = [];
  const plate = params.vehiclePlate?.trim();
  const material = params.material?.trim();
  const unitLabel = params.unitLabel?.trim();
  const text = params.notes?.trim() || "";

  if (plate) parts.push(`${VEHICLE_PREFIX}${plate}${TAG_SUFFIX}`);
  if (material) parts.push(`${MATERIAL_PREFIX}${material}${TAG_SUFFIX}`);
  if (unitLabel) parts.push(`${UNIT_LABEL_PREFIX}${unitLabel}${TAG_SUFFIX}`);
  if (text) parts.push(text);

  return parts.length > 0 ? parts.join("\n") : null;
}

function parseTaggedValue(taskDescription: string | null | undefined, prefix: string): string | null {
  if (!taskDescription) return null;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = taskDescription.match(new RegExp(`${escaped}(.+?)${TAG_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  return match?.[1]?.trim() || null;
}

export function parseMaterialFromDescription(taskDescription: string | null | undefined): string | null {
  return parseTaggedValue(taskDescription, MATERIAL_PREFIX);
}

export function parseUnitLabelFromDescription(taskDescription: string | null | undefined): string | null {
  return parseTaggedValue(taskDescription, UNIT_LABEL_PREFIX);
}

export function parseVehicleFromDescription(taskDescription: string | null | undefined): string | null {
  return parseTaggedValue(taskDescription, VEHICLE_PREFIX);
}

export function stripVehicleFromDescription(taskDescription: string | null | undefined): string | null {
  return stripTaskTags(taskDescription);
}

export function stripTaskTags(taskDescription: string | null | undefined): string | null {
  if (!taskDescription) return null;
  const cleaned = taskDescription
    .replace(new RegExp(`${VEHICLE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^${TAG_SUFFIX.slice(1)}]+${TAG_SUFFIX}\\n?`, "g"), "")
    .replace(new RegExp(`${MATERIAL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^${TAG_SUFFIX.slice(1)}]+${TAG_SUFFIX}\\n?`, "g"), "")
    .replace(new RegExp(`${UNIT_LABEL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^${TAG_SUFFIX.slice(1)}]+${TAG_SUFFIX}\\n?`, "g"), "")
    .trim();
  return cleaned || null;
}

/** Backward-compatible task display fields */
export function resolveTaskDisplayFields(task: {
  plotName: string | null;
  taskDescription: string | null;
  quantityUnit: string;
}) {
  const material = parseMaterialFromDescription(task.taskDescription);
  const unitLabel = parseUnitLabelFromDescription(task.taskDescription);
  const legacyMaterial = !material ? task.plotName : null;

  return {
    material: material || legacyMaterial,
    plot: material ? task.plotName : null,
    workType: material || legacyMaterial,
    unitLabel,
  };
}

export function resolveMeterKind(task: {
  machineryUnitId?: string | null;
  vehiclePlate?: string | null;
}): "odometer_km" | "engine_hours" | null {
  if (task.machineryUnitId) return "engine_hours";
  if (task.vehiclePlate) return "odometer_km";
  return null;
}

export function meterKindLabel(kind: "odometer_km" | "engine_hours" | null | undefined) {
  if (kind === "engine_hours") return "שעות מנוע";
  if (kind === "odometer_km") return "קילומטרים";
  return "מד אוץ";
}

export function parseSessionMeta(actualNotes: string | null | undefined): TaskSessionMeta {
  if (!actualNotes?.trim()) return {};
  try {
    const parsed = JSON.parse(actualNotes) as TaskSessionMeta;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Legacy plain-text notes from older completions
    return { employeeNotes: actualNotes };
  }
  return {};
}

export function serializeSessionMeta(meta: TaskSessionMeta): string | null {
  const hasData =
    meta.startedAt ||
    meta.completedAt ||
    (meta.media && meta.media.length > 0) ||
    (meta.photoUrls && meta.photoUrls.length > 0) ||
    meta.employeeNotes?.trim() ||
    meta.meterReading != null;
  if (!hasData) return null;
  return JSON.stringify(meta);
}

export function formatTaskTime(workDate: string | Date): string {
  const d = typeof workDate === "string" ? new Date(workDate) : workDate;
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function formatTaskDate(workDate: string | Date): string {
  const d = typeof workDate === "string" ? new Date(workDate) : workDate;
  return d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}

export function formatWorkDuration(
  startedAt?: string | null,
  completedAt?: string | null
): string {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} שע׳ ${m} דק׳`;
  return `${m} דק׳`;
}

export function countTaskImages(media: StoredMediaRef[]): number {
  return media.filter((m) => m.kind === "image").length;
}

export function taskHasVideo(media: StoredMediaRef[]): boolean {
  return media.some((m) => m.kind === "video");
}

export const TASK_STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "ממתין",
  IN_PROGRESS: "בביצוע",
  COMPLETED: "הושלם",
};
