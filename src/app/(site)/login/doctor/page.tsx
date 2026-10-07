import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Doctor log in",
};

export default async function DoctorLoginPage({
  searchParams,
}: PageProps<"/login/doctor">) {
  const { next } = await searchParams;

  return (
    <AuthShell
      role="doctor"
      mode="login"
      title="Doctor portal"
      description="Log in to see your schedule, patients, and messages."
    >
      <LoginForm
        registerHref="/register/doctor"
        next={typeof next === "string" ? next : undefined}
      />
    </AuthShell>
  );
}
