"use client";

import { X, Camera, Film } from "lucide-react";
import { MediaGallery } from "@/components/storage/MediaGallery";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  formatTaskDate,
  formatTaskTime,
  formatWorkDuration,
  countTaskImages,
  taskHasVideo,
} from "@/lib/field-task-utils";
import type { StoredMediaRef } from "@/lib/storage/types";

export type HistoryTask = {
  id: string;
  workDate: string;
  settlement: string | null;
  customerName: string | null;
  workType: string | null;
  plotName: string | null;
  status: string;
  machineryUnit: { name: string } | null;
  startedAt: string | null;
  completedAt: string | null;
  employeeNotes: string | null;
  media?: StoredMediaRef[];
  photoUrls?: string[];
};

export function TaskDetailModal({ task, onClose }: { task: HistoryTask; onClose: () => void }) {
  const media = task.media || [];
  const imageCount = countTaskImages(media);
  const hasVideo = taskHasVideo(media);

  return (
    <div className="fixed inset-0 z-[150] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted">
              {formatTaskDate(task.workDate)} · {formatTaskTime(task.workDate)}
            </p>
            <h2 className="text-xl font-extrabold text-primary-dark">{task.customerName || "לקוח"}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${TASK_STATUS_COLORS[task.status] || "bg-muted/20"}`}>
          {TASK_STATUS_LABELS[task.status] || task.status}
        </span>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">לקוח</dt>
            <dd className="font-bold">{task.customerName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">ישוב</dt>
            <dd>{task.settlement || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">חלקה</dt>
            <dd>{task.plotName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">חומר</dt>
            <dd>{task.workType || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">מכונה</dt>
            <dd>{task.machineryUnit?.name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">התחלה</dt>
            <dd>{task.startedAt ? new Date(task.startedAt).toLocaleString("he-IL") : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">סיום</dt>
            <dd>{task.completedAt ? new Date(task.completedAt).toLocaleString("he-IL") : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">זמן עבודה</dt>
            <dd className="font-bold">{formatWorkDuration(task.startedAt, task.completedAt)}</dd>
          </div>
          <p className="flex items-center gap-3 pt-1">
            <span className="flex items-center gap-1">
              <Camera className="h-4 w-4" /> {imageCount} תמונות
            </span>
            {hasVideo && (
              <span className="flex items-center gap-1 text-primary">
                <Film className="h-4 w-4" /> סרטון צורף
              </span>
            )}
          </p>
        </dl>

        {task.employeeNotes && (
          <div className="rounded-lg bg-muted/10 border border-border p-3">
            <p className="text-xs font-bold text-muted mb-1">הערות</p>
            <p className="text-sm whitespace-pre-wrap">{task.employeeNotes}</p>
          </div>
        )}

        {(media.length > 0 || task.photoUrls?.length) && (
          <div>
            <p className="text-sm font-bold mb-2">מדיה מצורפת</p>
            <MediaGallery media={media} legacyUrls={task.photoUrls} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskHistoryCard({ task, onOpen }: { task: HistoryTask; onOpen: () => void }) {
  const media = task.media || [];
  const imageCount = countTaskImages(media);
  const hasVideo = taskHasVideo(media);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-right rounded-xl border border-border bg-card p-4 card-shadow space-y-2 active:scale-[0.99] transition-transform"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {formatTaskDate(task.workDate)} · {formatTaskTime(task.workDate)}
          </p>
          <p className="font-extrabold text-lg text-primary-dark truncate">{task.customerName || "לקוח"}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${TASK_STATUS_COLORS[task.status] || ""}`}>
          {TASK_STATUS_LABELS[task.status] || task.status}
        </span>
      </div>
      <p className="text-sm text-muted truncate">{task.settlement || "—"} · {task.workType || task.plotName || "עבודה"}</p>
      {task.machineryUnit?.name && <p className="text-xs text-muted">מכונה: {task.machineryUnit.name}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span>עבודה: {formatWorkDuration(task.startedAt, task.completedAt)}</span>
        {imageCount > 0 && <span>{imageCount} תמונות</span>}
        {hasVideo && <span>+ סרטון</span>}
      </div>
    </button>
  );
}
