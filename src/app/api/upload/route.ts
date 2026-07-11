import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { createSignedUrls, detectMediaKind, uploadToStorage, type StorageModule } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });

    const storageModule = (String(formData.get("module") || "machinery") as StorageModule);
    const entityId = String(formData.get("entityId") || `upload-${Date.now()}`);
    const employeeId = user.employeeId || user.id;

    const mimeType = (file.type || "image/jpeg").toLowerCase();
    const kind = detectMediaKind(mimeType);
    if (!kind) return NextResponse.json({ error: "סוג קובץ לא נתמך" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadToStorage({
      module: storageModule,
      employeeId,
      entityId,
      buffer,
      mimeType,
      kind,
    });

    const signed = await createSignedUrls([result.path]);

    return NextResponse.json({
      path: result.path,
      url: result.path,
      previewUrl: signed[result.path] || null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה בהעלאה";
    console.error("[upload]", msg);
    return handleApiAuth(e);
  }
}
