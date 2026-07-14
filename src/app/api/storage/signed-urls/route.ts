import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, requireAuthUser } from "@/lib/api-auth";
import { createSignedUrlItems } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    await requireAuthUser();
    const body = await req.json();
    const paths = Array.isArray(body.paths)
      ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];
    if (paths.length === 0) return NextResponse.json({ urls: {}, items: [] });

    const items = await createSignedUrlItems(paths);
    const urls: Record<string, string> = {};
    for (const item of items) {
      if (item.url) urls[item.path] = item.url;
    }
    return NextResponse.json({ urls, items });
  } catch (e) {
    console.error("[storage/signed-urls]", e);
    return handleApiAuth(e);
  }
}
