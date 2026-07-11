import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { createSignedUrls } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    await requireAuthUser();
    const body = await req.json();
    const paths = Array.isArray(body.paths)
      ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];
    if (paths.length === 0) return NextResponse.json({ urls: {} });

    const urls = await createSignedUrls(paths);
    return NextResponse.json({ urls });
  } catch (e) {
    console.error("[storage/signed-urls]", e);
    return handleApiAuth(e);
  }
}
