export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0/, "972");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function formatMachineryWhatsApp(data: {
  operator: string;
  vehicle: string;
  plot: string;
  material: string;
  acres: number;
  bales?: number | null;
  date: string;
  gps?: { lat: number; lng: number } | null;
}): string {
  let msg = `🚜 *יומן מכונה — WALLED YEHYA GROUP*\n`;
  msg += `📅 ${data.date}\n`;
  msg += `👤 מפעיל: ${data.operator}\n`;
  msg += `🚛 כלי: ${data.vehicle}\n`;
  msg += `🌾 חלקה: ${data.plot}\n`;
  msg += `📦 חומר: ${data.material}\n`;
  msg += `📐 דונם: ${data.acres}\n`;
  if (data.bales) msg += `🎯 אשכולות: ${data.bales}\n`;
  if (data.gps) msg += `📍 מיקום: ${data.gps.lat.toFixed(5)}, ${data.gps.lng.toFixed(5)}\n`;
  msg += `\n_נשלח מממשק השטח_`;
  return msg;
}

export function formatFuelWhatsApp(data: {
  operator: string;
  vehicle: string;
  liters: number;
  source: string;
  odometer?: number | null;
  date: string;
  gps?: { lat: number; lng: number } | null;
}): string {
  let msg = `⛽ *תדלוק — WALLED YEHYA GROUP*\n`;
  msg += `📅 ${data.date}\n`;
  msg += `👤 מפעיל: ${data.operator}\n`;
  msg += `🚛 רכב: ${data.vehicle}\n`;
  msg += `⛽ ליטרים: ${data.liters}\n`;
  msg += `🛢️ מקור: ${data.source}\n`;
  if (data.odometer) msg += `🔢 מד אוץ: ${data.odometer} ק"מ\n`;
  if (data.gps) msg += `📍 מיקום: ${data.gps.lat.toFixed(5)}, ${data.gps.lng.toFixed(5)}\n`;
  msg += `\n_נשלח מממשק השטח_`;
  return msg;
}

export function formatDailySummaryWhatsApp(data: {
  date: string;
  totalAcres: number;
  totalFuel: number;
  workLogs: number;
  fuelLogs: number;
  operators: number;
}): string {
  return (
    `📊 *סיכום יומי — WALLED YEHYA GROUP*\n` +
    `📅 ${data.date}\n\n` +
    `🌾 דונמים: ${data.totalAcres}\n` +
    `⛽ דלק (ליטר): ${data.totalFuel}\n` +
    `🚜 יומני מכונות: ${data.workLogs}\n` +
    `⛽ תדלוקים: ${data.fuelLogs}\n` +
    `👷 מפעילים פעילים: ${data.operators}\n\n` +
    `_דוח אוטומטי ממערכת ERP_`
  );
}
