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
  BALE: "אשכולות",
  ACRE: "אקר",
  OTHER: "אחר",
};

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
