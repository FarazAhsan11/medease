import { NextResponse, type NextRequest } from "next/server";

import { dashboards } from "@/config/dashboards";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getRoleForPath } from "@/lib/auth/roles";
import { hasPublicEnv } from "@/lib/env";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

const authPages = ["/login", "/register", "/forgot-password"];

function isAuthPage(pathname: string) {
  return authPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

// Optimistic redirects only. Dashboard layouts re-check the role on the
// server with `requireRole`, which is the real authorization boundary.
export async function proxy(request: NextRequest) {
  // Let the app run before Supabase keys are added to .env.local.
  if (!hasPublicEnv()) return NextResponse.next();

  const { response, role } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const portal = getRoleForPath(pathname);

  if (portal && !role) {
    const next = encodeURIComponent(pathname + request.nextUrl.search);
    return redirectWithSession(
      request,
      response,
      `${dashboards[portal].loginHref}?next=${next}`,
    );
  }

  if (role && portal && portal !== role) {
    return redirectWithSession(request, response, dashboards[role].home);
  }

  if (role && isAuthPage(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    return redirectWithSession(request, response, getPostLoginPath(role, next));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static files and images; run on everything else.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
