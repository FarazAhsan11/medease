import { FileTextIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LabReportLinkProps = {
  href: string;
  className?: string;
};

// Opens the report in a new tab. A plain link: the route answers with a
// redirect to the file on a short-lived signed link.
export function LabReportLink({ href, className }: LabReportLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5",
        className,
      )}
    >
      <FileTextIcon aria-hidden />
      View report
    </a>
  );
}
