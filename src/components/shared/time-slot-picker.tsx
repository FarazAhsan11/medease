import { SelectableChip } from "@/components/shared/selectable-chip";
import type { TimeSlot } from "@/lib/schedule";

type TimeSlotPickerProps = {
  slots: TimeSlot[];
  value: string | null;
  onChange: (slot: TimeSlot) => void;
  disabled?: boolean;
  hint?: string;
};

export function TimeSlotPicker({
  slots,
  value,
  onChange,
  disabled = false,
  hint,
}: TimeSlotPickerProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-sm font-medium">Select time</legend>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots.map((slot) => (
          <SelectableChip
            key={slot.value}
            active={value === slot.value}
            onSelect={() => onChange(slot)}
            disabled={slot.disabled}
            className="flex flex-col items-center py-2"
          >
            <span className={slot.disabled ? "line-through" : undefined}>
              {slot.label}
            </span>
            {slot.note && <span className="text-xs">{slot.note}</span>}
          </SelectableChip>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
