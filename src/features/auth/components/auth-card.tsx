import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  image: string;
  imageAlt: string;
  switchHref: string;
  switchLabel: string;
  compactSwitch?: boolean;
  title: string;
  children: ReactNode;
};

export function AuthCard({
  image,
  imageAlt,
  switchHref,
  switchLabel,
  compactSwitch = false,
  title,
  children,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="m-5 flex w-full max-w-[900px] overflow-hidden rounded-3xl bg-white p-[30px] shadow-auth max-sm:m-2.5 max-sm:flex-col max-sm:p-5">
        <div className="flex flex-1 flex-col items-center justify-center rounded-[14px] bg-surface-muted p-5 text-center max-sm:hidden">
          <Image
            src={image}
            alt={imageAlt}
            width={400}
            height={350}
            priority
            className="mb-6 h-[350px] w-[400px] max-w-none rounded-xl bg-brand-pale"
          />
          <Link
            href={switchHref}
            className={cn(
              "my-[5px] flex h-14 w-full items-center justify-center rounded-[5px] bg-ink-body px-[15px] py-2.5 text-white",
              compactSwitch ? "text-[13.33px]" : "underline",
            )}
          >
            {switchLabel} ↗
          </Link>
        </div>

        <div className="flex-1 p-[30px] max-sm:w-full max-sm:p-5">
          <h1 className="mt-6 mb-5 text-[1.8em] font-bold max-sm:text-[1.5em]">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}
