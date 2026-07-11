export type FieldTaskRow = {
  id: string;
  workDate: string;
  settlement: string | null;
  customerName: string | null;
  plotName: string | null;
  plannedQuantity: number;
  reportedQuantity: number | null;
  quantityUnit: string;
  status: string;
  approvalStatus: string;
  actualNotes: string | null;
  assignee: { firstName: string; lastName: string };
  machineryUnit: { name: string } | null;
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
