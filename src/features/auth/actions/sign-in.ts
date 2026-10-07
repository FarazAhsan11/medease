"use server";

import { redirect } from "next/navigation";

import {
  signInSchema,
  type SignInState,
} from "@/features/auth/schemas/sign-in";
import { getPostLoginPath } from "@/lib/auth/redirects";
import { getRoleFromAppMetadata } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const next = formData.get("next");

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const role = getRoleFromAppMetadata(data.user.app_metadata);

  if (!role) {
    await supabase.auth.signOut();
    return { error: "Your account isn't set up yet. Please contact support." };
  }

  redirect(getPostLoginPath(role, typeof next === "string" ? next : null));
}
