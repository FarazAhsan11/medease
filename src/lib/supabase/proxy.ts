import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { DashboardRole } from "@/config/dashboards";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getPublicEnv } from "@/lib/env";

type SessionResult = {
  response: NextResponse;
  role: DashboardRole | null;
};

// Refreshes the Supabase auth session cookie on every request so Server
// Components always see a valid session, and reports the signed-in role.
export async function updateSession(
  request: NextRequest,
): Promise<SessionResult> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Keep this call directly after creating the client. It validates the JWT
  // and triggers the cookie refresh above when the session is expiring.
  try {
    const { data } = await supabase.auth.getClaims();

    return {
      response,
      role: getRoleFromAppMetadata(data?.claims.app_metadata),
    };
  } catch (error) {
    // If Supabase is unreachable, treat the request as signed out rather than
    // failing every page; layouts still enforce access with requireRole().
    console.error(
      "Session refresh failed:",
      error instanceof Error ? error.message : error,
    );
    return { response, role: null };
  }
}

const cacheHeaders = ["cache-control", "expires", "pragma"];

// Redirects while keeping any refreshed auth cookies and cache headers.
export function redirectWithSession(
  request: NextRequest,
  session: NextResponse,
  pathname: string,
) {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));

  session.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of cacheHeaders) {
    const value = session.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }

  return redirect;
}
