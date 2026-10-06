import Image from "next/image";

import type { Service } from "@/features/home/data/services";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="rounded-3xl border border-line bg-surface-raised p-[30px] shadow-card transition-transform duration-300 hover:-translate-y-[5px] max-nav:w-full">
      <div className="mt-2.5 flex">
        <Image
          src={service.icon}
          alt=""
          width={80}
          height={80}
          className="mr-5 size-20 shrink-0"
        />
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold">{service.title}</h3>
          <p className="my-[5px] text-ink-muted">{service.description}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-[14px] bg-ink-body px-5 py-2.5 text-[13.33px] text-white transition-colors duration-300 hover:bg-brand"
        >
          Get Started
          <Image
            src="/images/arrow-up-left.svg"
            alt=""
            width={13}
            height={12}
            className="ml-3"
          />
        </button>
      </div>
    </div>
  );
}
