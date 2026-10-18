import "server-only";

import { getSiteUrl } from "@/lib/site-url.server";

// Where links in confirmation and reset emails land. `next` is checked again
// in the confirm route before anyone is sent there.
export async function getAuthRedirectUrl(next?: string | null) {
  const url = new URL("/auth/confirm", await getSiteUrl());
  if (next) url.searchParams.set("next", next);

  return url.toString();
}
