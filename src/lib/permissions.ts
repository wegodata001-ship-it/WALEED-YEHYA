/** Route/API permission rules — safe for Edge middleware (no DB). */

import { isEmployeeRole, isManagerRole } from "./roles";

export function isEmployeePage(pathname: string): boolean {
  return pathname === "/employee" || pathname.startsWith("/employee/");
}

/** Legacy mobile entry → employee app only */
export function isMobileEntryPage(pathname: string): boolean {
  return pathname === "/mobile" || pathname.startsWith("/mobile/");
}

/** Manager-only page (anything not login/public/employee/mobile/api/static). */
export function isManagerPage(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (isEmployeePage(pathname)) return false;
  if (isMobileEntryPage(pathname)) return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname === "/manifest.json") {
    return false;
  }
  return true;
}

/** Pages outside /employee that employees may not access. */
export function shouldRedirectEmployeeFromPage(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (isEmployeePage(pathname)) return false;
  if (isMobileEntryPage(pathname)) return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname === "/manifest.json") {
    return false;
  }
  return true;
}

/** Managers stay in manager app — no employee UI via browser. */
export function shouldRedirectManagerFromEmployeePage(pathname: string): boolean {
  return isEmployeePage(pathname) || isMobileEntryPage(pathname);
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
  { methods: ["POST"], pattern: /^\/api\/storage\/delete$/ },
  { methods: ["GET"], pattern: /^\/api\/storage\/media$/ },
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

export function isManagerSession(role: string): boolean {
  return isManagerRole(role);
}

/**
 * Safe post-login redirect: never send an employee into manager app,
 * or a manager into employee app via ?next=
 */
export function safeRedirectForRole(role: string, requestedNext: string | null | undefined): string {
  const fallback = isEmployeeRole(role) ? "/employee" : "/";
  if (!requestedNext || !requestedNext.startsWith("/") || requestedNext.startsWith("//")) {
    return fallback;
  }
  if (requestedNext.startsWith("/login")) return fallback;

  if (isEmployeeRole(role)) {
    if (isEmployeePage(requestedNext) || isMobileEntryPage(requestedNext)) return requestedNext;
    return "/employee";
  }

  if (isManagerRole(role)) {
    if (shouldRedirectManagerFromEmployeePage(requestedNext)) return "/";
    return requestedNext;
  }

  return fallback;
}
