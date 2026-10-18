import "server-only";

import { headers } from "next/headers";

// Base URL for links in auth emails. Supabase only follows redirect URLs that
// are on the project's allow list (Authentication > URL Configuration).
export async function getSiteUrl() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}
