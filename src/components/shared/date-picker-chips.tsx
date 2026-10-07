import { SelectableChip } from "@/components/shared/selectable-chip";
import type { DateOption } from "@/lib/schedule";

type DatePickerChipsProps = {
  dates: DateOption[];
  value: string | null;
  onChange: (date: DateOption) => void;
};

export function DatePickerChips({
  dates,
  value,
  onChange,
}: DatePickerChipsProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">Select date</legend>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {dates.map((date) => (
          <SelectableChip
            key={date.value}
            active={value === date.value}
            onSelect={() => onChange(date)}
            className="flex w-16 shrink-0 flex-col items-center py-2.5"
          >
            <span className="text-xs opacity-70">{date.weekday}</span>
            <span className="text-base font-semibold">{date.day}</span>
            <span className="text-xs opacity-70">{date.month}</span>
          </SelectableChip>
        ))}
      </div>
    </fieldset>
  );
}
