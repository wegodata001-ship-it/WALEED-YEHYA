export type FieldTaskRow = {
  id: string;
  workDate: string;
  settlement: string | null;
  customerName: string | null;
  plotName: string | null;
  workType?: string | null;
  material?: string | null;
  plot?: string | null;
  vehiclePlate?: string | null;
  managerNotes?: string | null;
  taskDescription?: string | null;
  unitLabel?: string | null;
  quantityUnitLabel?: string;
  plannedQuantity: number;
  reportedQuantity: number | null;
  remainingQuantity?: number | null;
  quantityUnit: string;
  progressReports?: {
    at: string;
    quantity: number;
    totalAfter: number;
    notes?: string | null;
    media?: { path: string; kind: "image" | "video"; mimeType: string }[];
  }[];
  quantityComparison?: {
    planned: number;
    reported: number | null;
    remaining: number | null;
    completionPct: number | null;
    status: "FULL" | "PARTIAL" | "OVER" | "PENDING";
    isHours: boolean;
  };
  status: string;
  approvalStatus: string;
  actualNotes: string | null;
  employeeNotes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  meterReading?: number | null;
  meterKind?: "odometer_km" | "engine_hours" | null;
  session?: { meterReading?: number; meterKind?: "odometer_km" | "engine_hours" };
  photoUrls?: string[];
  media?: { path: string; kind: "image" | "video"; mimeType: string }[];
  assigneeId?: string;
  assignee: { id?: string; firstName: string; lastName: string };
  machineryUnit: { name: string } | null;
  machineryUnitId?: string | null;
};

export type FuelTx = {
  id: string;
  transactionDate: string;
  liters: number;
  totalCost: number | null;
  pricePerLiter?: number | null;
  licensePlate: string | null;
  odometerKm?: number | null;
  notes?: string | null;
  meterPhotoUrl?: string | null;
  vehicle: { licensePlate: string } | null;
  operator: { firstName: string; lastName: string } | null;
  source: { name: string } | null;
  recipient: { id?: string; name: string; category: string } | null;
};

export type Source = {
  id: string;
  name: string;
  sourceType: string;
  capacityLiters: number | null;
  currentLevel: number;
  isActive?: boolean;
};

export type DayRow = {
  date: string;
  employeeId: string;
  employeeName: string;
  settlement: string;
  plotName: string;
  customerName: string;
  quantity: number;
  quantityUnit: string;
  machinery: string;
};

export type Movement = {
  id: string;
  date: string;
  entityType: string;
  entityName: string;
  entryType: string;
  category: string;
  amount: number;
  description: string;
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  phone?: string | null;
  salaryType?: string;
  hourlyRate?: number | null;
  monthlySalary?: number | null;
  isActive?: boolean;
  user?: { id: string; phone: string | null; role: string; isActive: boolean } | null;
};

export type ClientRow = {
  key: string;
  settlement: string;
  customerName: string;
  plotName: string;
  totalQuantity: number;
  workDays: number;
  entries?: DayRow[];
};

export type FarmerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  moshav: { id: string; name: string; nameHe: string | null } | null;
};
