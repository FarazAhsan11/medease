import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppointmentCardProps = {
  image: string;
  className?: string;
  children: ReactNode;
};

export function AppointmentCard({
  image,
  className,
  children,
}: AppointmentCardProps) {
  return (
    <article
      className={cn(
        "flex items-center justify-between rounded-[30px] border border-line-soft bg-surface-card p-5 pl-10 shadow-appointment max-md:w-full max-md:flex-col max-md:p-[15px] max-md:text-center",
        className,
      )}
    >
      <div className="flex w-[30%] flex-col max-md:w-full">{children}</div>
      <div className="max-md:order-first max-md:mb-[15px] max-md:flex max-md:h-[200px] max-md:w-full max-md:justify-center">
        <Image
          src={image}
          alt="Doctor profile"
          width={400}
          height={350}
          className="mb-6 h-[350px] w-[400px] rounded-xl bg-brand-pale max-md:h-full max-md:w-[80%]"
        />
      </div>
    </article>
  );
}
