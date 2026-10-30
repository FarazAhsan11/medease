import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Admin log in",
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/login/admin">) {
  const { next } = await searchParams;

  return (
    <AuthShell
      role="admin"
      title="Admin portal"
      description="Log in to review doctors and the audit log."
    >
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
