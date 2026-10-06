import Image from "next/image";

import type { ContactInfo } from "@/features/contact/data/contact-info";

type ContactInfoItemProps = {
  item: ContactInfo;
};

export function ContactInfoItem({ item }: ContactInfoItemProps) {
  return (
    <div className="mb-2.5 flex items-center rounded-xl bg-surface-tile p-[15px] max-sm:p-2.5">
      <Image
        src={item.icon}
        alt=""
        width={44}
        height={44}
        className="shrink-0"
      />
      <div className="ml-2 flex flex-col text-ink-muted">
        <p className="text-2xl">{item.label}</p>
        <p>{item.value}</p>
      </div>
    </div>
  );
}
