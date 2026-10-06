import Image from "next/image";

import { IconTile } from "@/components/shared/icon-tile";
import { contactInfo } from "@/features/contact/data/contact-info";

export function ContactDetails() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3">
        {contactInfo.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-4 rounded-2xl border bg-card p-4"
          >
            <IconTile icon={item.icon} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  className="text-sm font-medium break-words hover:text-primary"
                >
                  {item.value}
                </a>
              ) : (
                <p className="text-sm font-medium">{item.value}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-2xl bg-secondary p-6 lg:block">
        <Image
          src="/images/contact-illustration.svg"
          alt=""
          width={500}
          height={500}
          className="mx-auto h-48 w-auto"
        />
      </div>
    </div>
  );
}
