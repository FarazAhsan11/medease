import Link from "next/link";

type PanelLinkProps = {
  href: string;
  children: string;
};

export function PanelLink({ href, children }: PanelLinkProps) {
  return (
    <Link
      href={href}
      className="text-xs font-medium text-primary hover:underline"
    >
      {children}
    </Link>
  );
}
