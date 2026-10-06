import { CalendarCheckIcon, StarIcon } from "lucide-react";
import Image from "next/image";

import { IconTile } from "@/components/shared/icon-tile";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative aspect-[4/4.2] overflow-hidden rounded-[2rem] bg-linear-to-br from-secondary via-secondary to-brand/30">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 size-64 rounded-full bg-brand/20 blur-2xl"
        />
        <Image
          src="/images/home-doctor.png"
          alt="Smiling doctor holding a clipboard"
          fill
          priority
          sizes="(min-width: 1024px) 480px, 90vw"
          className="object-contain object-bottom"
        />
      </div>

      <div className="absolute top-8 -left-4 flex items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-lifted backdrop-blur sm:-left-8">
        <IconTile icon={CalendarCheckIcon} size="sm" />
        <div className="pr-1">
          <p className="text-xs text-muted-foreground">Next appointment</p>
          <p className="text-sm font-semibold">Today, 11:30 AM</p>
        </div>
      </div>

      <div className="absolute -right-2 bottom-10 flex items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-lifted backdrop-blur sm:-right-6">
        <IconTile icon={StarIcon} size="sm" tone="warning" />
        <div className="pr-1">
          <p className="text-sm font-semibold">4.9 / 5</p>
          <p className="text-xs text-muted-foreground">Patient rating</p>
        </div>
      </div>
    </div>
  );
}
