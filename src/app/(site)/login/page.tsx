import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <AuthShell
      role="patient"
      mode="login"
      title="Welcome back"
      description="Log in to manage your appointments and health records."
    >
      <LoginForm
        registerHref="/register"
        next={typeof next === "string" ? next : undefined}
      />
    </AuthShell>
  );
}
