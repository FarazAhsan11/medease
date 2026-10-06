import Link from "next/link";

type AuthFooterLinkProps = {
  prompt: string;
  href: string;
  label: string;
};

export function AuthFooterLink({ prompt, href, label }: AuthFooterLinkProps) {
  return (
    <div className="mt-[70px] flex justify-center max-sm:mt-[30px]">
      <p className="font-bold text-ink-muted">
        {prompt}{" "}
        <Link href={href} className="text-link-default underline">
          {label}
        </Link>
      </p>
    </div>
  );
}
