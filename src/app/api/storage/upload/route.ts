import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import {
  STORAGE_MODULES,
  detectMediaKind,
  getStorageConfig,
  uploadToStorage,
  createSignedUrls,
  type StorageModule,
  type MediaKind,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });

    const storageModuleRaw = String(formData.get("module") || "reports");
    if (!STORAGE_MODULES.includes(storageModuleRaw as StorageModule)) {
      return NextResponse.json({ error: "מודול אחסון לא תקין" }, { status: 400 });
    }
    const storageModule = storageModuleRaw as StorageModule;

    const entityId = String(formData.get("entityId") || "").trim();
    if (!entityId) return NextResponse.json({ error: "חסר מזהה ישות (entityId)" }, { status: 400 });

    const employeeId =
      String(formData.get("employeeId") || "").trim() || user.employeeId || user.id;
    if (!employeeId) return NextResponse.json({ error: "לא משויך עובד" }, { status: 400 });

    const mimeType = (file.type || "application/octet-stream").toLowerCase();
    const kindParam = formData.get("kind") as MediaKind | null;
    const detected = detectMediaKind(mimeType);
    const kind = kindParam || detected;
    if (!kind) return NextResponse.json({ error: "סוג קובץ לא נתמך" }, { status: 400 });

    const cfg = getStorageConfig();
    if (kind === "video") {
      const durationSec = Number(formData.get("durationSec"));
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return NextResponse.json({ error: "לא ניתן לאמת את אורך הסרטון" }, { status: 400 });
      }
      if (durationSec > cfg.maxVideoDurationSec) {
        return NextResponse.json(
          {
            error: `הסרטון ארוך מדי — מקסימום ${cfg.maxVideoDurationSec} שניות (העלית ${Math.ceil(durationSec)} שניות)`,
          },
          { status: 400 }
        );
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length === 0) return NextResponse.json({ error: "קובץ ריק" }, { status: 400 });

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
      ...result,
      previewUrl: signed[result.path] || null,
    });
  } catch (e) {
    if (e instanceof ApiAuthError) return handleApiAuth(e);
    const msg = e instanceof Error ? e.message : "שגיאה בהעלאה";
    console.error("[storage/upload]", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
