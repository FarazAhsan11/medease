import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Doctor log in",
};

export default function DoctorLoginPage() {
  return (
    <AuthShell
      role="doctor"
      mode="login"
      title="Doctor portal"
      description="Log in to see your schedule, patients, and messages."
    >
      <LoginForm registerHref="/register/doctor" dashboardHref="/doctor" />
    </AuthShell>
  );
}
