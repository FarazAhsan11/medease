import Image from "next/image";

import { cn } from "@/lib/utils";

type DoctorSearchBarProps = {
  options: string[];
  className?: string;
};

export function DoctorSearchBar({ options, className }: DoctorSearchBarProps) {
  return (
    <div
      role="search"
      className={cn("flex items-center rounded-lg bg-surface", className)}
    >
      <select
        aria-label="Doctor type"
        className="mr-5 w-[90px] bg-surface text-base outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <Image
        src="/images/search.svg"
        alt=""
        width={24}
        height={24}
        className="mr-2 size-6"
      />
      <input
        type="text"
        aria-label="Search doctors"
        placeholder="Search the best doctor"
        className="w-[300px] rounded-[5px] bg-surface p-2.5 text-base outline-none max-[480px]:w-full max-[480px]:text-center"
      />
    </div>
  );
}
