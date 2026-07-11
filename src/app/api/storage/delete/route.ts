import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { deleteFromStorage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const paths: string[] = Array.isArray(body.paths)
      ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];
    if (paths.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

    const ownerId = user.employeeId || user.id;
    const unauthorized = paths.filter((p) => {
      const parts = p.split("/");
      return parts.length < 2 || parts[1] !== ownerId;
    });
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: "אין הרשאה למחוק קבצים אלה" }, { status: 403 });
    }

    await deleteFromStorage(paths);
    return NextResponse.json({ ok: true, deleted: paths.length });
  } catch (e) {
    console.error("[storage/delete]", e);
    return handleApiAuth(e);
  }
}
