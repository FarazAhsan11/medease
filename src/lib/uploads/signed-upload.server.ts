import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Files go straight from the browser to Storage on a signed upload link, so
// they never pass through a Server Action (Vercel limits request bodies to
// 4.5 MB). Callers give each upload a new path and there's no upsert: a path
// takes one file, so a leftover link can't swap a file after it was checked.
export async function createSignedUpload(
  admin: SupabaseClient,
  bucket: string,
  path: string,
) {
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error) throw new Error(`${bucket}: ${error.message}`);

  return { path: data.path, token: data.token };
}
