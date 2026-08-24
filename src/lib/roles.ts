/** Role helpers safe for client + server (no Next/cookies imports). */

export function isOwnerRole(role: string) {
  return ["SUPER_ADMIN", "ADMIN", "OWNER", "OFFICE_MANAGER", "ACCOUNTANT", "HR_MANAGER"].includes(role);
}

export function isManagerRole(role: string) {
  return isOwnerRole(role);
}

/**
 * Salary / payroll / payments / wage reports — OWNER (and system admins) only.
 * Other managers keep operational access but must not see wage data.
 */
export function canViewPayroll(role: string) {
  return role === "OWNER" || role === "SUPER_ADMIN" || role === "ADMIN";
}

/** Field employees — WAREHOUSE_MANAGER kept for legacy sessions, same access as FIELD_OPERATOR */
export function isEmployeeRole(role: string) {
  return role === "FIELD_OPERATOR" || role === "WAREHOUSE_MANAGER";
}

export function isFieldRole(role: string) {
  return role === "FIELD_OPERATOR" || role === "WAREHOUSE_MANAGER";
}

export function isWarehouseRole(role: string) {
  return role === "WAREHOUSE_MANAGER";
}

export function defaultPathForRole(_role: string) {
  if (isFieldRole(_role)) return "/employee";
  return "/";
}
