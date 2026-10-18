import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getPostLoginPath } from "@/lib/auth/redirects";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { createClient } from "@/lib/supabase/server";

const RESET_PASSWORD_PATH = "/reset-password";

// Landing route for links in confirmation and password-reset emails. Handles
// both the token-hash links (custom email templates) and PKCE `code` links.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const isRecovery = type === "recovery" || next === RESET_PASSWORD_PATH;

  const supabase = await createClient();
  let verified = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  if (!verified) {
    await setFlash("error", "That link is invalid or has expired.");
    redirect(isRecovery ? "/forgot-password" : "/login");
  }

  if (isRecovery) redirect(RESET_PASSWORD_PATH);

  const { data } = await supabase.auth.getClaims();
  const role = getRoleFromAppMetadata(data?.claims.app_metadata);

  if (!role) {
    await supabase.auth.signOut();
    await setFlash(
      "error",
      "Your account isn't set up yet. Please contact support.",
    );
    redirect("/login");
  }

  await setFlash("success", "Your email is confirmed. Welcome to MedEase!");
  redirect(getPostLoginPath(role, next));
}
