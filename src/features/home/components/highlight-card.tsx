import Image from "next/image";

import type { Highlight } from "@/features/home/data/highlights";

type HighlightCardProps = {
  highlight: Highlight;
};

export function HighlightCard({ highlight }: HighlightCardProps) {
  return (
    <div className="mx-6 h-[320px] w-[30%] rounded-3xl bg-white p-6 text-center shadow-soft max-nav:mb-3.5 max-nav:h-auto max-nav:w-[84%]">
      <Image
        src={highlight.icon}
        alt=""
        width={highlight.iconWidth}
        height={highlight.iconHeight}
        className="mx-auto"
      />
      <h3 className="mx-auto mt-6 mb-5 max-w-[260px] text-[28.8px] leading-tight font-bold">
        {highlight.title}
      </h3>
      <p className="my-[5px] text-ink-muted">{highlight.description}</p>
      <div className="flex w-full justify-end">
        <button
          type="button"
          aria-label={`Learn more about ${highlight.title}`}
          className="flex size-11 items-center justify-center rounded-[30px] bg-ink-body transition-colors duration-300 hover:bg-brand"
        >
          <Image
            src="/images/arrow-up-left.svg"
            alt=""
            width={13}
            height={12}
          />
        </button>
      </div>
    </div>
  );
}
