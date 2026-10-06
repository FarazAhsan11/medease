import Image from "next/image";

import type { AboutFeature } from "@/features/about/data/about-content";

type AboutFeatureCardProps = {
  feature: AboutFeature;
};

export function AboutFeatureCard({ feature }: AboutFeatureCardProps) {
  return (
    <div className="max-w-[250px] rounded-lg bg-white p-[15px] text-center shadow-feature max-md:mx-auto max-md:max-w-[90%]">
      <Image
        src={feature.icon}
        alt=""
        width={70}
        height={70}
        className="mx-auto mb-2.5 size-[70px] rounded-lg"
      />
      <h3 className="mb-2.5 text-[18.72px] font-bold">{feature.title}</h3>
      <p className="my-[5px] text-ink-muted">{feature.description}</p>
    </div>
  );
}
