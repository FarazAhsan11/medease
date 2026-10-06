import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const heroTitle = "Your One-Stop Solution for Medical Assistance.";

const primaryClass =
  "flex h-[60px] items-center justify-center rounded-2xl bg-brand px-5 py-2.5 text-xl font-bold text-white";
const secondaryClass =
  "flex h-[60px] items-center justify-center rounded-2xl border-2 border-brand bg-surface px-5 py-2.5 text-xl font-bold text-brand";

export function Hero() {
  return (
    <section className="mb-10 flex items-center justify-between max-nav:flex-col max-nav:text-center">
      <div className="w-[40%] pt-[70px] text-start max-md:hidden">
        <h1 className="mt-8 mb-2.5 text-5xl font-bold max-nav:text-[28px]">
          {heroTitle}
        </h1>
        <p className="mb-5 text-2xl text-ink-soft max-nav:text-base">
          {siteConfig.description}
        </p>
        <div className="flex flex-col justify-center gap-2.5">
          <Link href="/talk-to-ai" className={cn(primaryClass, "w-[281px]")}>
            Talk to AI
          </Link>
          <Link href="/find-doctor" className={cn(secondaryClass, "w-[281px]")}>
            Find a Doctor Now
          </Link>
        </div>
      </div>
      <Image
        src="/images/home-doctor.png"
        alt="Doctor"
        width={540}
        height={550}
        priority
        className="h-[550px] w-[540px] rounded-[10px] max-md:hidden"
      />

      <div className="flex flex-col items-center md:hidden">
        <h1 className="my-[21px] text-[32px] font-bold">{heroTitle}</h1>
        <p className="my-[5px] text-ink-muted">{siteConfig.description}</p>
        <Image
          src="/images/home-doctor-mobile.png"
          alt="Doctor"
          width={333}
          height={286}
          priority
        />
        <Link
          href="/talk-to-ai"
          className={cn(primaryClass, "mb-3.5 w-[340px]")}
        >
          Talk to AI
        </Link>
        <Link href="/find-doctor" className={cn(secondaryClass, "w-[340px]")}>
          Find a Doctor Now
        </Link>
      </div>
    </section>
  );
}
