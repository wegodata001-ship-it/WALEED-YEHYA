import { quantityUnitDisplayLabel } from "@/lib/constants";
import {
  meterKindLabel,
  resolveTaskDisplayFields,
  parseVehicleFromDescription,
  type TaskSessionMeta,
  type TaskProgressReport,
} from "@/lib/field-task-utils";
import {
  compareTaskQuantities,
  formatQtyWithUnit,
  QUANTITY_COMPLETION_LABELS,
  QUANTITY_COMPLETION_PREFIX,
  quantityFieldLabels,
} from "@/lib/task-quantity";
import type { FieldTaskRow } from "./types";

type TaskLike = Pick<
  FieldTaskRow,
  | "customerName"
  | "settlement"
  | "plotName"
  | "taskDescription"
  | "quantityUnit"
  | "plannedQuantity"
  | "reportedQuantity"
  | "vehiclePlate"
  | "machineryUnit"
> & {
  taskDescription?: string | null;
  session?: TaskSessionMeta;
  meterReading?: number | null;
  meterKind?: "odometer_km" | "engine_hours" | null;
  unitLabel?: string | null;
  quantityUnitLabel?: string | null;
  material?: string | null;
  plot?: string | null;
  quantityComparison?: FieldTaskRow["quantityComparison"];
  progressReports?: TaskProgressReport[];
  status?: string;
};

export function buildFieldTaskDetailFields(t: TaskLike, opts?: { includeQuantities?: boolean }) {
  const desc = t.taskDescription ?? null;
  const display = resolveTaskDisplayFields({
    plotName: t.plotName,
    taskDescription: desc,
    quantityUnit: t.quantityUnit,
  });
  const material = t.material ?? display.material;
  const plot = t.plot ?? display.plot;
  const unitLabel = t.unitLabel ?? display.unitLabel;
  const unitDisplay = t.quantityUnitLabel || quantityUnitDisplayLabel(t.quantityUnit, unitLabel);
  const vehiclePlate = t.vehiclePlate ?? parseVehicleFromDescription(desc);
  const session = t.session;
  const meterReading = t.meterReading ?? session?.meterReading;
  const meterKind = t.meterKind ?? session?.meterKind;
  const reports = t.progressReports || session?.progressReports || [];

  const fields: { label: string; value: string }[] = [
    { label: "לקוח", value: t.customerName || "—" },
    { label: "ישוב", value: t.settlement || "—" },
    { label: "חלקה", value: plot || "—" },
    { label: "חומר", value: material || "—" },
  ];

  if (opts?.includeQuantities !== false) {
    const cmp =
      t.quantityComparison ||
      compareTaskQuantities(t.plannedQuantity, t.reportedQuantity, t.quantityUnit);
    const labels = quantityFieldLabels(cmp.isHours);

    fields.push({
      label: labels.planned,
      value: formatQtyWithUnit(cmp.planned, unitDisplay),
    });

    if (cmp.reported != null) {
      fields.push({
        label: "סך הכל שבוצע",
        value: formatQtyWithUnit(cmp.reported, unitDisplay),
      });

      if (cmp.remaining != null) {
        if (cmp.remaining > 0.01) {
          fields.push({
            label: labels.remaining,
            value: formatQtyWithUnit(cmp.remaining, unitDisplay),
          });
        } else if (cmp.remaining < -0.01) {
          fields.push({
            label: labels.excess,
            value: formatQtyWithUnit(Math.abs(cmp.remaining), unitDisplay),
          });
        } else {
          fields.push({
            label: labels.remaining,
            value: formatQtyWithUnit(0, unitDisplay),
          });
        }
      }

      const statusLabel =
        t.status === "ASSIGNED"
          ? "🟡 ממתין"
          : t.status === "COMPLETED" || cmp.status === "FULL" || cmp.status === "OVER"
            ? QUANTITY_COMPLETION_LABELS[cmp.status === "PENDING" ? "FULL" : cmp.status]
            : "🟠 בטיפול";

      fields.push({
        label: "סטטוס",
        value: statusLabel,
      });

      if (cmp.completionPct != null) {
        fields.push({
          label: "אחוז ביצוע",
          value: `${renderProgressBar(cmp.completionPct)} ${cmp.completionPct}%`,
        });
      }

      if (reports.length > 0) {
        fields.push({
          label: "היסטוריית דיווחים",
          value: reports
            .map((r) => {
              const d = new Date(r.at).toLocaleDateString("he-IL");
              return `${d}: +${r.quantity} ${unitDisplay} (סה״כ ${r.totalAfter})`;
            })
            .join(" · "),
        });
      }
    } else {
      fields.push({
        label: "יחידת מידה",
        value: unitDisplay,
      });
    }
  }

  fields.push(
    { label: "כלי רכב", value: vehiclePlate || "—" },
    { label: "מכונה", value: t.machineryUnit?.name || "—" }
  );

  if (meterReading != null) {
    fields.push({
      label: meterKindLabel(meterKind),
      value: String(meterReading),
    });
  }

  return fields;
}

function renderProgressBar(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clamped / 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

/** Short badge string for schedule card subtitles */
export function quantityCompletionBadge(t: {
  plannedQuantity: number;
  reportedQuantity?: number | null;
  quantityUnit?: string;
  status?: string;
  quantityComparison?: FieldTaskRow["quantityComparison"];
}): string | null {
  if (t.status === "ASSIGNED") return "🟡 ממתין";
  if (t.status === "IN_PROGRESS" || t.status === "AWAITING_COMPLETION") return "🟠 בטיפול";
  const cmp =
    t.quantityComparison ||
    compareTaskQuantities(t.plannedQuantity, t.reportedQuantity, t.quantityUnit);
  if (t.status === "COMPLETED" || cmp.status === "FULL") return "🟢 הושלם";
  if (cmp.status === "OVER") return QUANTITY_COMPLETION_LABELS.OVER;
  if (cmp.status === "PENDING") return null;
  return `${QUANTITY_COMPLETION_PREFIX[cmp.status]} ${QUANTITY_COMPLETION_LABELS[cmp.status]}`;
}
