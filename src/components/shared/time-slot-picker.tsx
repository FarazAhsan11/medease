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
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium">Select time</legend>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots.map((slot) => (
          <SelectableChip
            key={slot.value}
            active={value === slot.value}
            onSelect={() => onChange(slot)}
            className="py-2"
          >
            {slot.label}
          </SelectableChip>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
