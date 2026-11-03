import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { detectFileType } from "@/lib/uploads/file-signature";
import { stripImageMetadata } from "@/lib/uploads/image-metadata";

export type UploadRule = {
  maxBytes: number;
  // Each accepted type and the extension a file of that type is stored with.
  types: Record<string, string>;
};

// Files reach Storage straight from the browser on a signed link, so the
// server checks what actually arrived before recording it: the size, the type
// read from the bytes (not the one the browser sent), and an extension that
// matches it. Photos lose their metadata. A file that fails is deleted.
export async function verifyUpload(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  rule: UploadRule,
): Promise<boolean> {
  const storage = admin.storage.from(bucket);
  const { data: blob, error } = await storage.download(path);
  if (error || !blob) return false;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = detectFileType(bytes);
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const stripped = type ? stripImageMetadata(bytes, type) : null;

  const acceptable =
    type !== null &&
    stripped !== null &&
    bytes.length > 0 &&
    bytes.length <= rule.maxBytes &&
    rule.types[type] === extension &&
    blob.type.split(";")[0] === type;

  if (!acceptable) {
    await storage.remove([path]);
    return false;
  }

  if (stripped.changed) {
    const { error: replaceError } = await storage.update(path, stripped.bytes, {
      contentType: type,
      upsert: true,
    });
    if (replaceError) {
      await storage.remove([path]);
      return false;
    }
  }
  return true;
}
