import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthCard
      image="/images/auth-patient.png"
      imageAlt="Doctor"
      switchHref="/doctor/login"
      switchLabel="Login as Doctor"
      title="Login"
    >
      <LoginForm registerHref="/register" />
    </AuthCard>
  );
}
