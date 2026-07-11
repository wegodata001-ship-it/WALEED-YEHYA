/** Helpers for FieldTask metadata without schema changes. */

import type { StoredMediaRef } from "./storage/types";

export type TaskSessionMeta = {
  startedAt?: string;
  completedAt?: string;
  /** @deprecated Legacy public/local URLs — prefer `media` */
  photoUrls?: string[];
  media?: StoredMediaRef[];
  employeeNotes?: string;
};

export function getTaskMedia(meta: TaskSessionMeta): StoredMediaRef[] {
  if (meta.media && meta.media.length > 0) return meta.media;
  return (meta.photoUrls || []).map((url) => ({
    path: url,
    kind: "image" as const,
    mimeType: "image/jpeg",
  }));
}

const VEHICLE_PREFIX = "__vehicle:";
const VEHICLE_SUFFIX = "__";

export function encodeVehicleInDescription(vehiclePlate: string | null | undefined, notes: string | null | undefined) {
  const plate = vehiclePlate?.trim();
  const text = notes?.trim() || "";
  if (!plate) return text || null;
  const tag = `${VEHICLE_PREFIX}${plate}${VEHICLE_SUFFIX}`;
  return text ? `${tag}\n${text}` : tag;
}

export function parseVehicleFromDescription(taskDescription: string | null | undefined): string | null {
  if (!taskDescription) return null;
  const match = taskDescription.match(/__vehicle:(.+?)__/);
  return match?.[1]?.trim() || null;
}

export function stripVehicleFromDescription(taskDescription: string | null | undefined): string | null {
  if (!taskDescription) return null;
  const cleaned = taskDescription
    .replace(new RegExp(`${VEHICLE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^${VEHICLE_SUFFIX.slice(1)}]+${VEHICLE_SUFFIX}\\n?`), "")
    .trim();
  return cleaned || null;
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
    meta.employeeNotes?.trim();
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
