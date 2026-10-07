"use server";

import { redirect } from "next/navigation";

import { dashboards } from "@/config/dashboards";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = getRoleFromAppMetadata(data?.claims.app_metadata);

  await supabase.auth.signOut();

  redirect(role ? dashboards[role].loginHref : "/login");
}
