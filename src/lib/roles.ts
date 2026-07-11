/** Role helpers safe for client + server (no Next/cookies imports). */

export function isOwnerRole(role: string) {
  return ["SUPER_ADMIN", "ADMIN", "OWNER", "OFFICE_MANAGER", "ACCOUNTANT", "HR_MANAGER"].includes(role);
}

export function isFieldRole(role: string) {
  return role === "FIELD_OPERATOR";
}

export function isWarehouseRole(role: string) {
  return role === "WAREHOUSE_MANAGER";
}

export function defaultPathForRole(role: string) {
  if (isWarehouseRole(role)) return "/mobile/fuel";
  if (isFieldRole(role)) return "/mobile/machinery";
  return "/";
}
