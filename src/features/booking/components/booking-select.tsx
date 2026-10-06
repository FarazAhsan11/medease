import type { ScheduleOption } from "@/features/booking/lib/schedule";

type BookingSelectProps = {
  label: string;
  placeholder: string;
  options: ScheduleOption[];
  disabled?: boolean;
};

export function BookingSelect({
  label,
  placeholder,
  options,
  disabled = false,
}: BookingSelectProps) {
  return (
    <label className="flex w-[45%] flex-col max-[759px]:w-[70%]">
      <span className="mt-[21px] mb-[5px] font-bold text-ink-muted">
        {label}
      </span>
      <select
        disabled={disabled}
        defaultValue=""
        className="rounded-[5px] border-2 border-ink-muted p-[5px] font-sans text-[13.33px] disabled:opacity-60"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
