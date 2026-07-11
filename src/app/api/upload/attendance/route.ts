import { NextRequest, NextResponse } from "next/server";
import { getDefaultOrg } from "@/lib/org";
import { uploadAttendancePhoto } from "@/lib/supabase-storage";
import { ApiAuthError, handleApiAuth, requireAuthUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const org = await getDefaultOrg();
    if (!user.employeeId) {
      return NextResponse.json({ error: "לא משויך עובד למשתמש" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "לא התקבלה תמונה", details: "Blob=null" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "תמונה ריקה", details: `Blob size=0 type=${file.type}` },
        { status: 400 }
      );
    }

    const path = await uploadAttendancePhoto(buffer, file.type || "image/jpeg", org.id, user.employeeId);

    const { createSignedUrls } = await import("@/lib/storage");
    const signed = await createSignedUrls([path]);

    return NextResponse.json({
      path,
      url: path,
      previewUrl: signed[path] || null,
      size: buffer.length,
      type: file.type || "image/jpeg",
    });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    const msg = e instanceof Error ? e.message : "שגיאה בהעלאת תמונה";
    console.error("[upload/attendance]", msg);
    return NextResponse.json({ error: msg, details: msg }, { status: 500 });
  }
}
