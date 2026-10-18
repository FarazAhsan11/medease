"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { setFlash } from "@/lib/flash.server";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = getRoleFromAppMetadata(data?.claims.app_metadata);

  await supabase.auth.signOut();
  await setFlash("success", "You've been logged out.");

  redirect(role ? dashboards[role].loginHref : "/login");
}
