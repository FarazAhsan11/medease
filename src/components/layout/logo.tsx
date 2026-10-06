import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/">
      <Image
        src="/images/logo.svg"
        alt={siteConfig.name}
        width={153}
        height={44}
        priority
      />
    </Link>
  );
}
