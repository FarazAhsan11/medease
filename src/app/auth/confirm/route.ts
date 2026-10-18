import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { dashboards } from "@/config/dashboards";
import { consumeAuthToken } from "@/features/auth/lib/auth-tokens";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { createAdminClient } from "@/lib/supabase/admin";

// Landing route for the link in our confirmation email. The token is the
// permission check: it's single use and expires after 24 hours.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const next = searchParams.get("next");

  if (!token) {
    await setFlash(
      "error",
      "That link is incomplete. Please use the full link from your email.",
    );
    redirect("/login");
  }

  const userId = await consumeAuthToken(token, "email_confirmation");
  if (!userId) {
    await setFlash(
      "error",
      "That link has expired or was already used. Log in and we'll send you a new one.",
    );
    redirect("/login");
  }

  const { data, error } = await createAdminClient().auth.admin.updateUserById(
    userId,
    { email_confirm: true },
  );
  if (error) {
    console.error("Email confirmation failed:", error.code ?? error.message);
    await setFlash(
      "error",
      "We couldn't confirm your email right now. Please try the link again.",
    );
    redirect("/login");
  }

  // There's no session yet (we never saw their password here), so send them
  // to their login page, keeping where they were headed.
  const role = getRoleFromAppMetadata(data.user.app_metadata);
  const loginHref = role ? dashboards[role].loginHref : "/login";
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : null;

  await setFlash("success", "Your email is confirmed. Log in to get started.");
  redirect(
    safeNext ? `${loginHref}?next=${encodeURIComponent(safeNext)}` : loginHref,
  );
}
