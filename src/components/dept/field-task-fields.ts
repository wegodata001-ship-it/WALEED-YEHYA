import { quantityUnitDisplayLabel } from "@/lib/constants";
import {
  meterKindLabel,
  resolveTaskDisplayFields,
  parseVehicleFromDescription,
  type TaskSessionMeta,
} from "@/lib/field-task-utils";
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
  material?: string | null;
  plot?: string | null;
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
  const vehiclePlate = t.vehiclePlate ?? parseVehicleFromDescription(desc);
  const session = t.session;
  const meterReading = t.meterReading ?? session?.meterReading;
  const meterKind = t.meterKind ?? session?.meterKind;

  const fields: { label: string; value: string }[] = [
    { label: "לקוח", value: t.customerName || "—" },
    { label: "ישוב", value: t.settlement || "—" },
    { label: "חלקה", value: plot || "—" },
    { label: "חומר", value: material || "—" },
  ];

  if (opts?.includeQuantities !== false) {
    fields.push(
      {
        label: "כמות",
        value: String(t.reportedQuantity ?? t.plannedQuantity ?? "—"),
      },
      {
        label: "יחידת מידה",
        value: quantityUnitDisplayLabel(t.quantityUnit, unitLabel),
      }
    );
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
