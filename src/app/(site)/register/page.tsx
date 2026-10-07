import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function RegisterPage() {
  return (
    <AuthShell
      role="patient"
      mode="register"
      title="Create your account"
      description="Book doctors, order lab tests, and keep your records in one place."
    >
      <RegisterForm />
    </AuthShell>
  );
}
