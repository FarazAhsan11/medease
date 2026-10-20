import { PillIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type ViewPrescriptionLinkProps = {
  href: string;
};

export function ViewPrescriptionLink({ href }: ViewPrescriptionLinkProps) {
  return (
    <Link
      href={href}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "gap-1.5",
      })}
    >
      <PillIcon aria-hidden />
      Prescription
    </Link>
  );
}
