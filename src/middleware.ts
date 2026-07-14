import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  isEmployeeApiAllowed,
  isEmployeeSession,
  isManagerSession,
  shouldRedirectEmployeeFromPage,
  shouldRedirectManagerFromEmployeePage,
} from "@/lib/permissions";

const COOKIE = "wyg-erp-session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "walled-yehya-group-dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

type SessionJwt = { userId?: string; role?: string; orgId?: string };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname === "/manifest.json") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = String((payload as SessionJwt).role || "");

    // —— Employee: never reach manager pages / manager APIs ——
    if (isEmployeeSession(role)) {
      if (pathname.startsWith("/api/")) {
        const url = request.nextUrl;
        if (!isEmployeeApiAllowed(request.method, pathname, url)) {
          return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
        }
        return NextResponse.next();
      }

      if (shouldRedirectEmployeeFromPage(pathname)) {
        return NextResponse.redirect(new URL("/employee", request.url));
      }

      return NextResponse.next();
    }

    // —— Manager: never open employee / mobile UI ——
    if (isManagerSession(role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.next();
      }

      if (shouldRedirectManagerFromEmployeePage(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      return NextResponse.next();
    }

    // Unknown role — deny manager surfaces, send to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "פג תוקף ההתחברות" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
