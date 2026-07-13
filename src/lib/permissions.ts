/** Route/API permission rules — safe for Edge middleware (no DB). */

import { isEmployeeRole } from "./roles";

export function isEmployeePage(pathname: string): boolean {
  return pathname === "/employee" || pathname.startsWith("/employee/");
}

/** Pages outside /employee that employees may not access. */
export function shouldRedirectEmployeeFromPage(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (isEmployeePage(pathname)) return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname === "/manifest.json") {
    return false;
  }
  return true;
}

type ApiRule = { methods: string[]; pattern: RegExp; extra?: (url: URL) => boolean };

const EMPLOYEE_API_RULES: ApiRule[] = [
  { methods: ["POST"], pattern: /^\/api\/auth\/logout$/ },
  { methods: ["GET"], pattern: /^\/api\/auth\/me$/ },
  { methods: ["GET", "POST"], pattern: /^\/api\/attendance$/ },
  {
    methods: ["GET"],
    pattern: /^\/api\/tasks$/,
    extra: (url) => url.searchParams.get("mine") === "1",
  },
  { methods: ["PATCH"], pattern: /^\/api\/tasks$/ },
  { methods: ["POST"], pattern: /^\/api\/upload$/ },
  { methods: ["POST"], pattern: /^\/api\/upload\/attendance$/ },
  { methods: ["POST"], pattern: /^\/api\/machinery$/ },
  { methods: ["POST"], pattern: /^\/api\/fuel$/ },
  { methods: ["GET"], pattern: /^\/api\/lookup$/ },
  { methods: ["POST"], pattern: /^\/api\/machinery-units$/ },
  { methods: ["POST"], pattern: /^\/api\/storage\/upload$/ },
  { methods: ["POST"], pattern: /^\/api\/storage\/signed-urls$/ },
  { methods: ["GET"], pattern: /^\/api\/vehicles$/ },
];

export function isEmployeeApiAllowed(method: string, pathname: string, url: URL): boolean {
  return EMPLOYEE_API_RULES.some((rule) => {
    if (!rule.methods.includes(method)) return false;
    if (!rule.pattern.test(pathname)) return false;
    if (rule.extra && !rule.extra(url)) return false;
    return true;
  });
}

export function isEmployeeSession(role: string): boolean {
  return isEmployeeRole(role);
}
