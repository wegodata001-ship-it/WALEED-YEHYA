import { NextResponse } from "next/server";
import { getSessionUser, defaultPathForRole } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    employeeId: user.employeeId,
    employee: user.employee,
    redirectTo: defaultPathForRole(user.role),
  });
}
