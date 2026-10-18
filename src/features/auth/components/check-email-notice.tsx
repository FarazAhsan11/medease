import { MailCheckIcon } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile } from "@/components/shared/icon-tile";
import { AuthFooterLink } from "@/features/auth/components/auth-footer-link";

type CheckEmailNoticeProps = {
  title: string;
  description: ReactNode;
  loginHref?: string;
  children?: ReactNode;
};

export function CheckEmailNotice({
  title,
  description,
  loginHref = "/login",
  children,
}: CheckEmailNoticeProps) {
  return (
    <div role="status">
      <div className="rounded-2xl border bg-card p-5">
        <IconTile icon={MailCheckIcon} tone="success" />
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Can&apos;t find it? Check your spam folder.
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
      <AuthFooterLink prompt="Done?" href={loginHref} label="Back to log in" />
    </div>
  );
}
