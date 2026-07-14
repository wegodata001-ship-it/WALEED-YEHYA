import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { downloadFromStorage } from "@/lib/storage";
import { normalizeStoragePath } from "@/lib/storage/paths";

/**
 * Authenticated same-origin media proxy.
 * Browser <img src="/api/storage/media?path=..."> never talks to Supabase directly.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuthUser();
    const raw = req.nextUrl.searchParams.get("path") || "";
    let path = "";
    try {
      path = normalizeStoragePath(raw);
    } catch {
      return NextResponse.json({ error: "נתיב לא תקין" }, { status: 400 });
    }
    if (!path || !path.includes("/")) {
      return NextResponse.json({ error: "נתיב לא תקין" }, { status: 400 });
    }

    const { buffer, contentType } = await downloadFromStorage(path);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    if (e instanceof Error && /לא נמצא|not found|Object not found/i.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("[storage/media]", e);
    return handleApiAuth(e);
  }
}
