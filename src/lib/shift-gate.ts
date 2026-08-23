import { prisma } from "@/lib/prisma";

/** Calendar day bounds in local time — matches attendance check-in/out. */
export function todayBounds(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Open shift = checked in today, not checked out. */
export async function findOpenShift(organizationId: string, employeeId: string) {
  const { start, end } = todayBounds();
  return prisma.attendanceRecord.findFirst({
    where: {
      organizationId,
      employeeId,
      workDate: { gte: start, lt: end },
      checkIn: { not: null },
      checkOut: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Active field task (used for UI hints / reports only; not for shift checkout gating). */
export async function findActiveFieldTask(organizationId: string, employeeId: string) {
  return prisma.fieldTask.findFirst({
    where: {
      organizationId,
      assigneeId: employeeId,
      status: { in: ["IN_PROGRESS", "AWAITING_COMPLETION"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      customerName: true,
      status: true,
    },
  });
}

export const SHIFT_GATE_ERRORS = {
  NO_OPEN_SHIFT: "לא ניתן להתחיל משימה לפני כניסה למשמרת.",
} as const;
