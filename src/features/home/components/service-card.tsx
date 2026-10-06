import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { IconTile } from "@/components/shared/icon-tile";
import type { Service } from "@/features/home/data/services";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={service.href}
      className="group flex flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
    >
      <IconTile icon={service.icon} />
      <h3 className="mt-4 text-base font-semibold">{service.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {service.description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Get started
        <ArrowRightIcon
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
