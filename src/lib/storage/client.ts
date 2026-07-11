import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStorageConfig } from "./config";
import { buildStoragePath, uniqueFilename } from "./paths";
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

export async function createSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};

  const { bucket, signedUrlExpiresSec } = getStorageConfig();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, signedUrlExpiresSec);

  if (error) throw new Error(`יצירת קישור נכשלה: ${error.message}`);

  const out: Record<string, string> = {};
  for (const item of data || []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
