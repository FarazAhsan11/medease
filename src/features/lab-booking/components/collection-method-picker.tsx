import { HouseIcon, StoreIcon } from "lucide-react";

import { SelectableChip } from "@/components/shared/selectable-chip";

type CollectionMethodPickerProps = {
  value: "lab" | "home";
  onChange: (value: "lab" | "home") => void;
  // Why home collection can't be chosen, or null when it can.
  homeUnavailable: string | null;
};

export function CollectionMethodPicker({
  value,
  onChange,
  homeUnavailable,
}: CollectionMethodPickerProps) {
  const options = [
    {
      value: "lab" as const,
      icon: StoreIcon,
      title: "Lab visit",
      description: "Go to the lab on a day you choose.",
      disabled: false,
    },
    {
      value: "home" as const,
      icon: HouseIcon,
      title: "Home collection",
      description:
        homeUnavailable ?? "A collector comes to you in a time window.",
      disabled: homeUnavailable !== null,
    },
  ];

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">
        How should the sample be taken?
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <SelectableChip
            key={option.value}
            active={value === option.value}
            onSelect={() => onChange(option.value)}
            disabled={option.disabled}
            className="flex items-start gap-3 p-3 text-left"
          >
            <option.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="block font-medium">{option.title}</span>
              <span className="block text-xs opacity-80">
                {option.description}
              </span>
            </span>
          </SelectableChip>
        ))}
      </div>
    </fieldset>
  );
}
