import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Lab log in",
};

export default function LabLoginPage() {
  return (
    <AuthShell
      role="lab"
      mode="login"
      title="Laboratory portal"
      description="Log in to manage bookings, sample collections, and reports."
    >
      <LoginForm registerHref="/register/lab" dashboardHref="/lab" />
    </AuthShell>
  );
}
