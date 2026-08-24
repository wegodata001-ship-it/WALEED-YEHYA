export const MATERIAL_LABELS: Record<string, string> = {
  WHEAT: "חיטה",
  CLOVER: "תלתן",
  STRAW: "תבן",
  BARLEY: "שעורה",
  CORN: "תירס",
  OTHER: "אחר",
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  HARVESTER: "מקצרה",
  BALER: "מכבש",
  RAKE: "מגוב",
  COMBINE: "קומביין",
  TRACTOR: "טרקטור",
  TRUCK: "משאית",
  SPRAYER: "מרסס",
  TRAILER: "נגרר",
  FIELD_CART: "עגלה שדה",
  JEEP: "ג'יפ",
  PRIVATE_CAR: "רכב פרטי",
  OPEN_TRUCK: "משא פתוח",
  AGENCY_TRAILER: "עגלה סוכנותית",
  DIESEL_TRAILER: "עגלה סולר",
  GREENERY_MOWER: "מקצרת ירק",
  OTHER: "אחר",
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "פעיל",
  IN_MAINTENANCE: "בתחזוקה",
  OUT_OF_SERVICE: "לא בשימוש",
  RETIRED: "נמכר / הוצא",
};

export const BALE_LABELS: Record<string, string> = {
  MEDIUM: "אשכול בינוני",
  LARGE: "אשכול גדול",
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: "החלפת שמן",
  REPAIR: "תיקון",
  INSPECTION: "בדיקה",
  TIRE_CHANGE: "החלפת צמיגים",
  GENERAL_MAINTENANCE: "טיפול כללי",
  BODY_WORK: "פחחות",
  OTHER: "אחר",
};

export const LEDGER_CATEGORY_LABELS: Record<string, string> = {
  SALARY: "שכר",
  ADVANCE: "מפרעה",
  BONUS: "בונוס",
  DEDUCTION: "ניכוי",
  REIMBURSEMENT: "החזר",
  FUEL_OFFSET: "קיזוז דלק",
  JOB_PAYMENT: "תשלום עבודה",
  JOB_CHARGE: "חיוב עבודה",
  ADJUSTMENT: "התאמה",
  OTHER: "אחר",
};

export const CHOPPING_LABELS: Record<string, string> = {
  NONE: "ללא",
  CHOPPED: "קצוץ",
  UNCHOPPED: "לא קצוץ",
};

export const FUEL_RECIPIENT_LABELS: Record<string, string> = {
  TANK: "מיכלים",
  COMPANY_VEHICLE: "כלי חברה",
  COMPANY_EMPLOYEE: "עובדי חברה",
  EXTERNAL_CUSTOMER: "לקוחות חיצוניים",
};

export const FUEL_COLUMN_ROLE_LABELS: Record<string, string> = {
  TANK_FILL: "מילוי מיכל",
  TANK_INVENTORY: "מלאי מיכל",
  FIELD_CART: "עגלה שדה",
  CONSUMER: "צרכן",
};
export const MACHINERY_UNIT_LABELS: Record<string, string> = {
  HARVESTER: "מקצרות",
  BALER: "מכבשים",
  RAKE: "מגובים",
  COMBINE: "קומביין",
  SUBCONTRACTOR: "קבלני משנה",
};

export const QUANTITY_UNIT_LABELS: Record<string, string> = {
  DUNAM: "דונם",
  HOUR: "שעות",
  BALE: "חבילה גדולה",
  ACRE: "אקר",
  OTHER: "אחר",
};

/** UI options for schedule / work journal — value maps to DB enum + optional label tag */
export const SCHEDULE_QUANTITY_UNITS = [
  { value: "DUNAM", label: "דונם" },
  { value: "HOUR", label: "שעות" },
  { value: "BALE_SMALL", label: "חבילה קטנה" },
  { value: "BALE_MEDIUM", label: "חבילה בינונית" },
  { value: "BALE_MEDIUM_CHOPPED", label: "חבילה בינונית + קיצוץ" },
  { value: "BALE", label: "חבילה גדולה" },
  { value: "UNITS", label: "יחידות" },
  { value: "KG", label: 'ק"ג' },
  { value: "TON", label: "טון" },
  { value: "OTHER", label: "אחר..." },
] as const;

export const SCHEDULE_MATERIAL_SUGGESTIONS = ["ללא חומר", "דשן", "חומר ריסוס", "זרעים", "תבן", "אחר"];

/** Explicit "no material" sentinel used in schedule / journal */
export const NO_MATERIAL_LABEL = "ללא חומר";

export function quantityUnitDisplayLabel(unit: string, unitLabel?: string | null) {
  if (unitLabel?.trim()) return unitLabel.trim();
  return QUANTITY_UNIT_LABELS[unit] || unit;
}

export function parseScheduleQuantityUnit(value: string): { quantityUnit: string; unitLabel?: string } {
  if (value === "BALE_MEDIUM") return { quantityUnit: "OTHER", unitLabel: "חבילה בינונית" };
  if (value === "BALE_SMALL") return { quantityUnit: "OTHER", unitLabel: "חבילה קטנה" };
  if (value === "BALE_MEDIUM_CHOPPED") return { quantityUnit: "OTHER", unitLabel: "חבילה בינונית + קיצוץ" };
  if (value === "UNITS") return { quantityUnit: "OTHER", unitLabel: "יחידות" };
  if (value === "KG") return { quantityUnit: "OTHER", unitLabel: 'ק"ג' };
  if (value === "TON") return { quantityUnit: "OTHER", unitLabel: "טון" };
  if (value === "OTHER") return { quantityUnit: "OTHER" };
  return { quantityUnit: value };
}

export function scheduleQuantityUnitValue(quantityUnit: string, unitLabel?: string | null): string {
  if (quantityUnit === "OTHER" && unitLabel === "חבילה בינונית") return "BALE_MEDIUM";
  if (quantityUnit === "OTHER" && unitLabel === "חבילה קטנה") return "BALE_SMALL";
  if (quantityUnit === "OTHER" && unitLabel === "חבילה בינונית + קיצוץ") return "BALE_MEDIUM_CHOPPED";
  if (quantityUnit === "OTHER" && unitLabel === "יחידות") return "UNITS";
  if (quantityUnit === "OTHER" && unitLabel === 'ק"ג') return "KG";
  if (quantityUnit === "OTHER" && unitLabel === "טון") return "TON";
  if (quantityUnit === "OTHER") return "OTHER";
  return quantityUnit;
}

export const FUEL_SOURCE_LABELS: Record<string, string> = {
  FIXED_TANK: "מיכל קבוע",
  FIELD_CART: "עגלה שדה",
  EXTERNAL_STATION: "תחנת דלק",
};

export const SYNC_LABELS: Record<string, string> = {
  PENDING: "ממתין לסנכרון",
  SYNCED: "מסונכרן",
  CONFLICT: "קונפליקט",
  FAILED: "נכשל",
};

export const FEATURES = [
  { id: 1, title: "דיווח WhatsApp מיידי", desc: "שליחת סיכום עבודה/תדלוק למנהל בלחיצה" },
  { id: 2, title: "מיקום GPS אוטומטי", desc: "תיוג מיקום בכל רישום מהשטח" },
  { id: 3, title: "צילום הוכחת ביצוע", desc: "תמונה מצורפת לכל פעולה בשטח" },
  { id: 4, title: "עבודה אופליין", desc: "רישום ללא אינטרנט + סנכרון אוטומטי" },
  { id: 5, title: "לוח בקרה חי", desc: "סטטיסטיקות בזמן אמת מהשטח" },
  { id: 6, title: "פיד פעילות", desc: "מעקב אחר כל הפעולות האחרונות" },
  { id: 7, title: "בחירה לפי רישוי", desc: "חיפוש מהיר של רכב לפי מספר לוחית" },
  { id: 8, title: "ייצוא CSV", desc: "הורדת דוחות לניתוח וחשבונאות" },
  { id: 9, title: "התראות דפדפן", desc: "התראה על פעולות חדשות מהשטח" },
  { id: 10, title: "סיכום יומי", desc: "דוח יומי אוטומטי ל-WhatsApp" },
];
