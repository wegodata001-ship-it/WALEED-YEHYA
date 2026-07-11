import { uploadToStorage } from "./storage/client";

/** @deprecated Use uploadToStorage from @/lib/storage — kept for attendance route compatibility */
export async function uploadAttendancePhoto(
  buffer: Buffer,
  mimeType: string,
  _orgId: string,
  employeeId: string
): Promise<string> {
  const result = await uploadToStorage({
    module: "attendance",
    employeeId,
    entityId: String(Date.now()),
    buffer,
    mimeType,
    kind: "image",
  });
  return result.path;
}
