import { NextResponse } from "next/server";
import { getSessionUser, type AuthUser } from "./auth";
import { isEmployeeRole, isManagerRole } from "./roles";

export class ApiAuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiAuthError(401, "נדרשת התחברות");
  return user;
}

export async function requireManager(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (!isManagerRole(user.role)) throw new ApiAuthError(403, "אין הרשאה");
  return user;
}

export async function requireEmployee(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (!isEmployeeRole(user.role)) throw new ApiAuthError(403, "אין הרשאה");
  return user;
}

export function handleApiAuth(error: unknown): NextResponse {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
}

export async function runApi(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return handleApiAuth(error);
  }
}
