"use client";

import Image from "next/image";
import { useState } from "react";

import type { Faq } from "@/features/home/data/faqs";
import { cn } from "@/lib/utils";

type FaqItemProps = {
  faq: Faq;
};

export function FaqItem({ faq }: FaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "mb-2.5 w-[80%] rounded-lg border border-line p-4 transition-colors duration-300 max-nav:p-3",
        open ? "bg-brand text-white" : "bg-white text-ink-muted",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left text-2xl font-bold max-nav:text-sm"
      >
        {faq.question}
        <Image
          src={open ? "/images/chevron-up.svg" : "/images/chevron-down.svg"}
          alt=""
          width={24}
          height={24}
          className="size-6"
        />
      </button>
      {open && (
        <p className="mt-3.5 text-lg text-white max-nav:text-xs">
          {faq.answer}
        </p>
      )}
    </div>
  );
}
