import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStorageConfig } from "./config";
import { buildStoragePath, normalizeStoragePath, uniqueFilename } from "./paths";
import { validateUploadFile } from "./validate";
import type { MediaKind, StorageModule, UploadResult } from "./types";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const { supabaseUrl, serviceRoleKey } = getStorageConfig();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage לא מוגדר: חסר NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY");
  }
  const url = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export async function uploadToStorage(params: {
  module: StorageModule;
  employeeId: string;
  entityId: string;
  buffer: Buffer;
  mimeType: string;
  kind: MediaKind;
}): Promise<UploadResult> {
  const validation = validateUploadFile(params.buffer, params.mimeType, params.kind);
  if (!validation.ok) throw new Error(validation.error);

  const { bucket } = getStorageConfig();
  const supabase = getSupabaseAdmin();
  const path = buildStoragePath(
    params.module,
    params.employeeId,
    params.entityId,
    uniqueFilename(params.mimeType)
  );

  const { error } = await supabase.storage.from(bucket).upload(path, params.buffer, {
    contentType: params.mimeType,
    upsert: false,
  });

  if (error) throw new Error(`העלאה נכשלה: ${error.message}`);

  return {
    path,
    kind: params.kind,
    mimeType: params.mimeType,
    size: params.buffer.length,
  };
}

export async function deleteFromStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { bucket } = getStorageConfig();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(`מחיקה נכשלה: ${error.message}`);
}

export async function downloadFromStorage(path: string): Promise<{ buffer: Buffer; contentType: string }> {
  const normalized = normalizeStoragePath(path);
  if (!normalized) throw new Error("חסר נתיב קובץ");

  const { bucket } = getStorageConfig();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(normalized);
  if (error || !data) {
    throw new Error(error?.message || "קובץ לא נמצא ב-Storage");
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || "application/octet-stream";
  return { buffer, contentType };
}

export async function createSignedUrl(path: string): Promise<string> {
  const normalized = normalizeStoragePath(path);
  if (!normalized) throw new Error("חסר נתיב קובץ");

  const { bucket, signedUrlExpiresSec } = getStorageConfig();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalized, signedUrlExpiresSec);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "יצירת קישור נכשלה");
  }
  return data.signedUrl;
}

export type SignedUrlItem = { path: string; url: string | null; error: string | null };

export async function createSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const items = await createSignedUrlItems(paths);
  const out: Record<string, string> = {};
  for (const item of items) {
    if (item.url) {
      out[item.path] = item.url;
    }
  }
  return out;
}

/** Per-file signed URLs with errors — more reliable than batch alone. */
export async function createSignedUrlItems(paths: string[]): Promise<SignedUrlItem[]> {
  const unique = [
    ...new Set(
      paths
        .filter(Boolean)
        .map((p) => {
          try {
            return normalizeStoragePath(p);
          } catch {
            return "";
          }
        })
        .filter(Boolean)
    ),
  ];
  if (unique.length === 0) return [];

  const { bucket, signedUrlExpiresSec } = getStorageConfig();
  const supabase = getSupabaseAdmin();

  // Prefer batch first
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, signedUrlExpiresSec);
  if (!error && data) {
    const byIndex: SignedUrlItem[] = unique.map((path, i) => {
      const item = data[i];
      const url = item?.signedUrl || null;
      const err = item?.error ? String(item.error) : url ? null : "לא התקבל קישור";
      return { path, url, error: err };
    });
    // Fallback per missing item
    await Promise.all(
      byIndex.map(async (item, i) => {
        if (item.url) return;
        try {
          byIndex[i] = { path: item.path, url: await createSignedUrl(item.path), error: null };
        } catch (e) {
          byIndex[i] = {
            path: item.path,
            url: null,
            error: e instanceof Error ? e.message : "שגיאה בחתימה",
          };
        }
      })
    );
    return byIndex;
  }

  // Full individual fallback
  return Promise.all(
    unique.map(async (path) => {
      try {
        return { path, url: await createSignedUrl(path), error: null };
      } catch (e) {
        return {
          path,
          url: null,
          error: e instanceof Error ? e.message : "שגיאה בחתימה",
        };
      }
    })
  );
}
